const admin = require('firebase-admin');
const { onCall, HttpsError, onRequest } = require('firebase-functions/v2/https');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(timezone);
dayjs.extend(utc);

// Import Config and Shared Utilities
const { brand, templates } = require('../config');
const {
    getConfigFromDb,
    generateICSFile,
    uploadICSFile,
    sendSingleInvitationHelper
} = require('../utils');

// Schedule Interviews (Bulk)
// Creates interview slots for a list of applicants based on provided time blocks.
exports.scheduleInterviews = onCall(async (request) => {
    const db = admin.firestore();
    const { applicants, timeBlocks } = request.data;
    const context = request;

    if (!context.auth) throw new HttpsError('unauthenticated', 'Authentication required.');

    const memberDoc = await db.collection('members').doc(context.auth.uid).get();
    if (!memberDoc.exists || !memberDoc.data()?.permissions?.interviews?.canSchedule) {
        throw new HttpsError('permission-denied', 'You are not authorized to schedule interviews.');
    }

    if (!Array.isArray(applicants) || !Array.isArray(timeBlocks)) {
        throw new HttpsError('invalid-argument', 'Invalid input arrays.');
    }

    const interviewDocs = [];
    let applicantIndex = 0;

    for (const block of timeBlocks) {
        const start = new Date(`${block.date}T${block.startTime}`);
        const end = new Date(`${block.date}T${block.endTime}`);
        let currentTime = new Date(start);

        while (currentTime < end && applicantIndex < applicants.length) {
            const interviewStart = admin.firestore.Timestamp.fromDate(new Date(currentTime));
            const interviewEnd = admin.firestore.Timestamp.fromDate(new Date(currentTime.getTime() + 15 * 60000));
            
            const interviewId = uuidv4();
            const applicantId = applicants[applicantIndex];

            interviewDocs.push({
                id: interviewId,
                data: {
                    interviewId,
                    applicantId,
                    scheduledTime: interviewStart,
                    endTime: interviewEnd,
                    status: 'scheduled',
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    type: 'interview',
                    rsvpStatus: 'unknown',
                },
            });

            currentTime = new Date(currentTime.getTime() + 15 * 60000);
            applicantIndex++;
        }
    }

    const batch = db.batch();
    interviewDocs.forEach(({ id, data }) => batch.set(db.collection('interviews').doc(id), data));
    await batch.commit();

    return { message: `Scheduled ${interviewDocs.length} interviews.` };
});

// Schedule Single Interview
// Manually schedules one interview for a specific application.
exports.scheduleSingleInterview = onCall(async (request) => {
    const context = request;
    if (!context.auth) throw new HttpsError('unauthenticated', 'Authentication required.');
    
    const db = admin.firestore();
    const { applicationId, startTime, endTime } = request.data;

    if (!applicationId || !startTime || !endTime) {
        throw new HttpsError('invalid-argument', 'Missing required fields.');
    }

    const memberDoc = await db.collection('members').doc(context.auth.uid).get();
    if (!memberDoc.exists || !memberDoc.data()?.permissions?.interviews?.canSchedule) {
        throw new HttpsError('permission-denied', 'Only hosts can perform this action.');
    }

    // Check for existing interview
    const existingAppQuery = await db.collection('interviews').where('applicationId', '==', applicationId).limit(1).get();
    if (!existingAppQuery.empty) {
        throw new HttpsError('already-exists', 'This application has already been scheduled for an interview.');
    }

    const startTimestamp = admin.firestore.Timestamp.fromDate(new Date(startTime));
    const endTimestamp = admin.firestore.Timestamp.fromDate(new Date(endTime));

    // Check for overlap
    const overlapQuery = await db.collection('interviews').where('startTime', '==', startTimestamp).limit(1).get();
    if (!overlapQuery.empty) {
        throw new HttpsError('resource-exhausted', 'This exact time slot is already booked. Please choose a different time.');
    }

    const appDoc = await db.collection('applications').doc(applicationId).get();
    if (!appDoc.exists) {
        throw new HttpsError('not-found', 'The specified application could not be found.');
    }

    const interviewId = uuidv4();
    await db.collection('interviews').doc(interviewId).set({
        interviewId,
        applicationId,
        applicantId: appDoc.data().completedBy,
        deadline: appDoc.data().window,
        startTime: startTimestamp,
        endTime: endTimestamp,
        status: 'Scheduled',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        type: 'Interview',
        rsvpStatus: 'unknown',
    });

    return { success: true, message: 'Interview scheduled successfully!' };
});

// Auto Schedule Interviews
// Automatically assigns eligible applicants to provided availability slots.
exports.autoScheduleInterviews = onCall(async (request) => {
    const db = admin.firestore();
    const { deadline, availability, interviewLengthMinutes = 15, bufferMinutes = 0 } = request.data;
    const context = request;

    if (!context.auth) throw new HttpsError('unauthenticated', 'Authentication required.');

    const memberDoc = await db.collection('members').doc(context.auth.uid).get();
    if (!memberDoc.exists || !memberDoc.data()?.permissions?.interviews?.canSchedule) {
        throw new HttpsError('permission-denied', 'You are not authorized to schedule interviews.');
    }

    if (!deadline || !Array.isArray(availability)) {
        throw new HttpsError('invalid-argument', 'Missing or invalid input.');
    }

    const appsSnap = await db.collection('applications')
        .where('status', '==', 'Eligible')
        .where('window', '==', deadline)
        .where('type', '!=', 'Scholarship Check In').get();

    const eligibleApps = [];
    for (const doc of appsSnap.docs) {
        const app = doc.data();
        app.id = doc.id;

        // Check for existing interview
        const interviewSnap = await db.collection('interviews').where('applicationId', '==', app.id).limit(1).get();
        if (!interviewSnap.empty) continue;

        // Check applicant's doNotSchedule flag
        const applicantDoc = await db.collection('applicants').doc(app.completedBy).get();
        if (applicantDoc.exists && applicantDoc.data()?.doNotSchedule) continue;

        eligibleApps.push(app);
    }

    eligibleApps.sort((a, b) => a.lastName?.localeCompare(b.lastName));

    const slots = [];
    for (const block of availability) {
        let current = new Date(block.start);
        const blockEnd = new Date(block.end);
        while (current < blockEnd) {
            const start = new Date(current);
            const end = new Date(current.getTime() + interviewLengthMinutes * 60000);
            if (end > blockEnd) break;
            slots.push({ start, end });
            current = new Date(end.getTime() + bufferMinutes * 60000);
        }
    }

    const batch = db.batch();
    const scheduled = [];
    const skippedApplicants = [];

    for (let i = 0; i < eligibleApps.length && i < slots.length; i++) {
        const app = eligibleApps[i];
        const slot = slots[i];
        const interviewId = uuidv4();

        batch.set(db.collection('interviews').doc(interviewId), {
            interviewId,
            applicantId: app.completedBy,
            applicationId: app.id,
            deadline,
            startTime: admin.firestore.Timestamp.fromDate(slot.start),
            endTime: admin.firestore.Timestamp.fromDate(slot.end),
            status: 'Scheduled',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            type: 'Interview',
            rsvpStatus: 'unknown',
        });
        scheduled.push(app.completedBy);
    }

    for (let j = slots.length; j < eligibleApps.length; j++) {
        skippedApplicants.push(eligibleApps[j].completedBy);
    }

    await batch.commit();
    return { scheduledCount: scheduled.length, skippedApplicants };
});

// Ensure ICS File
// Generates and uploads an ICS calendar file for a given interview.
exports.ensureICSFile = onCall(async (request) => {
    const context = request;
    if (!context.auth) throw new HttpsError('unauthenticated', 'Authentication required.');

    const { interviewId, startTime, endTime, title, description, url } = request.data;
    if (!interviewId || !startTime || !endTime || !url) {
        throw new HttpsError('invalid-argument', 'Missing required data.');
    }

    const content = generateICSFile(startTime, endTime, title, description, url);
    const downloadUrl = await uploadICSFile(interviewId, content);
    return { downloadUrl };
});

// Send Interview Invitations
// Queues emails for a list of interview IDs using the sendSingleInvitationHelper.
exports.sendInterviewInvitations = onCall(async (request) => {
    const db = admin.firestore();
    const context = request;
    if (!context.auth) throw new HttpsError('unauthenticated', 'Authentication required.');

    const memberDoc = await db.collection('members').doc(context.auth.uid).get();
    if (!memberDoc.exists || !memberDoc.data()?.permissions?.interviews?.canSchedule) {
        throw new HttpsError('permission-denied', 'Only hosts can perform this action.');
    }

    const { interviewIds } = request.data;
    if (!Array.isArray(interviewIds) || interviewIds.length === 0) {
        throw new HttpsError('invalid-argument', 'An array of interview IDs is required.');
    }

    const config = await getConfigFromDb();
    let successCount = 0;

    for (const interviewId of interviewIds) {
        const success = await sendSingleInvitationHelper(interviewId, db, config);
        if (success) successCount++;
    }
    return { message: `Successfully queued ${successCount} invitations.` };
});

// Record Interview RSVP
// HTTP endpoint triggered by Yes/No buttons in the email.
exports.recordInterviewRSVP = onRequest(async (req, res) => {
    const db = admin.firestore();
    const { interviewId, response } = req.query;

    if (!interviewId || !['yes', 'no'].includes(response)) {
        return res.status(400).send('Invalid RSVP request.');
    }

    try {
        await db.collection('interviews').doc(interviewId).update({
            rsvpStatus: response,
            rsvpTimestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
        return res.status(200).send(templates.rsvpConfirmationPage(brand, response));
    } catch (err) {
        console.error('RSVP error:', err);
        return res.status(500).send('Failed to record RSVP.');
    }
});

// Reschedule Interview
// Updates time slots and optionally sends a new invitation.
exports.rescheduleInterview = onCall(async (request) => {
    const context = request;
    if (!context.auth) throw new HttpsError('unauthenticated', 'Authentication required.');

    const db = admin.firestore();
    const memberDoc = await db.collection('members').doc(context.auth.uid).get();
    if (!memberDoc.exists || !memberDoc.data()?.permissions?.interviews?.canSchedule) {
        throw new HttpsError('permission-denied', 'You are not authorized to reschedule interviews.');
    }

    const { interviewId, newStartTime, newEndTime, sendInvite = false } = request.data;
    if (!interviewId || !newStartTime || !newEndTime) {
        throw new HttpsError('invalid-argument', 'Missing required fields for rescheduling.');
    }

    await db.collection('interviews').doc(interviewId).update({
        startTime: admin.firestore.Timestamp.fromDate(new Date(newStartTime)),
        endTime: admin.firestore.Timestamp.fromDate(new Date(newEndTime)),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        rsvpStatus: 'unknown',
        status: 'Scheduled',
        rsvpTimestamp: null,
    });

    if (sendInvite) {
        await sendSingleInvitationHelper(interviewId, db, await getConfigFromDb());
        return { success: true, message: 'Interview rescheduled and new invitation sent!' };
    }

    return { success: true, message: 'Interview rescheduled successfully.' };
});

// Delete Single Interview
// Deletes the Firestore doc and the associated Daily.co room.
exports.deleteSingleInterview = onCall(async (request) => {
    const context = request;
    if (!context.auth) throw new HttpsError('unauthenticated', 'Authentication required.');

    const db = admin.firestore();
    const memberDoc = await db.collection('members').doc(context.auth.uid).get();
    if (!memberDoc.exists || !memberDoc.data()?.permissions?.interviews?.canSchedule) {
        throw new HttpsError('permission-denied', 'You are not authorized to delete interviews.');
    }

    const { interviewId } = request.data;
    if (!interviewId) throw new HttpsError('invalid-argument', 'Interview ID is required.');

    const interviewRef = db.collection('interviews').doc(interviewId);
    const interviewDoc = await interviewRef.get();

    if (!interviewDoc.exists) {
        return { success: false, message: 'Interview already deleted or does not exist.' };
    }

    const { roomId } = interviewDoc.data();
    if (roomId) {
        try {
            await axios.delete(`https://api.daily.co/v1/rooms/${roomId}`, { 
                headers: { Authorization: `Bearer ${process.env.DAILY_KEY}` } 
            });
        } catch (error) {
            if (error.response && error.response.status !== 404) {
                console.error(`Failed to delete Daily.co room '${roomId}':`, error.message);
            }
        }
    }

    await interviewRef.delete();
    return { success: true, message: 'Successfully deleted interview and associated video room.' };
});

// Bulk Delete Interviews
// Batch deletes interviews and their video rooms.
exports.bulkDeleteInterviews = onCall(async (request) => {
    const context = request;
    if (!context.auth) throw new HttpsError('unauthenticated', 'Authentication required.');

    const db = admin.firestore();
    const memberDoc = await db.collection('members').doc(context.auth.uid).get();

    if (!memberDoc.exists || !memberDoc.data()?.permissions?.interviews?.canSchedule) {
        throw new HttpsError('permission-denied', "You must have 'meetings' permission to perform this action.");
    }

    const { interviewIds } = request.data;
    if (!Array.isArray(interviewIds) || interviewIds.length === 0) {
        throw new HttpsError('invalid-argument', 'An array of interview IDs is required.');
    }

    const batch = db.batch();
    const headers = { Authorization: `Bearer ${process.env.DAILY_KEY}` };
    const errors = [];
    let deletedCount = 0;

    for (const interviewId of interviewIds) {
        const interviewRef = db.collection('interviews').doc(interviewId);
        try {
            const interviewDoc = await interviewRef.get();
            if (interviewDoc.exists) {
                const { roomId } = interviewDoc.data();
                if (roomId) {
                    await axios.delete(`https://api.daily.co/v1/rooms/${roomId}`, { headers }).catch((err) => {
                        if (err.response && err.response.status !== 404) console.warn(`Could not delete Daily room ${roomId}`);
                    });
                }
                batch.delete(interviewRef);
                deletedCount++;
            }
        } catch (error) {
            errors.push(`Failed to process interview ${interviewId}: ${error.message}`);
        }
    }

    await batch.commit();

    if (errors.length > 0) {
        throw new HttpsError('internal', `Completed with errors. Deleted ${deletedCount}. Errors: ${errors.join(', ')}`);
    }
    return { success: true, message: `Successfully deleted ${deletedCount} interviews.` };
});

// Mark Interview As Missed
// Sets status to Missed and deletes the video room.
exports.markInterviewAsMissed = onCall(async (request) => {
    const context = request;
    if (!context.auth) throw new HttpsError('unauthenticated', 'Authentication required.');

    const db = admin.firestore();
    const memberDoc = await db.collection('members').doc(context.auth.uid).get();
    if (!memberDoc.exists || !memberDoc.data()?.permissions?.interviews?.canHost) {
        throw new HttpsError('permission-denied', 'You must be a host to perform this action.');
    }

    const { interviewId } = request.data;
    if (!interviewId) throw new HttpsError('invalid-argument', 'Interview ID is required.');

    const interviewRef = db.collection('interviews').doc(interviewId);
    const interviewDoc = await interviewRef.get();

    if (interviewDoc.exists) {
        const roomName = interviewId;
        try {
            await axios.delete(`https://api.daily.co/v1/rooms/${roomName}`, { 
                headers: { Authorization: `Bearer ${process.env.DAILY_KEY}` } 
            });
        } catch (error) {
            if (error.response && error.response.status !== 404) {
                console.warn(`Could not delete Daily.co room '${roomName}':`, error.message);
            }
        }
    }

    await interviewRef.update({
        status: 'Missed',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true, message: 'Interview marked as missed and room deleted.' };
});

// Update Interview Status
// Handles logic for In Progress (creating rooms) vs Completed/Missed (deleting rooms).
exports.updateInterviewStatus = onCall(async (request) => {
    const context = request;
    if (!context.auth) throw new HttpsError('unauthenticated', 'Authentication required.');

    const db = admin.firestore();
    const memberDoc = await db.collection('members').doc(context.auth.uid).get();
    if (!memberDoc.exists || !memberDoc.data()?.permissions?.interviews?.canHost) {
        throw new HttpsError('permission-denied', 'You must be an admin.');
    }

    const { interviewId, newStatus } = request.data;
    if (!interviewId || !newStatus) throw new HttpsError('invalid-argument', 'Interview ID and new status are required.');

    const interviewRef = db.collection('interviews').doc(interviewId);
    const interviewDoc = await interviewRef.get();
    if (!interviewDoc.exists) throw new HttpsError('not-found', 'Interview not found.');

    const interviewData = interviewDoc.data();
    const headers = { Authorization: `Bearer ${process.env.DAILY_KEY}`, 'Content-Type': 'application/json' };
    const DAILY_API = 'https://api.daily.co/v1';

    // If starting, close others
    if (newStatus === 'In Progress') {
        const inProgressQuery = db.collection('interviews').where('status', '==', 'In Progress');
        const inProgressSnapshot = await inProgressQuery.get();

        const batch = db.batch();
        for (const doc of inProgressSnapshot.docs) {
            if (doc.id === interviewId) continue;
            batch.update(doc.ref, { status: 'Completed' });
            
            const oldRoomId = doc.data().roomId;
            if (oldRoomId) {
                axios.delete(`${DAILY_API}/rooms/${oldRoomId}`, { headers }).catch(e => {
                    if (e.response?.status !== 404) console.warn(`Could not delete old room ${oldRoomId}`);
                });
            }
        }
        await batch.commit();
    }

    // Create Room if starting
    if (newStatus === 'In Progress' && !interviewData.roomId) {
        try {
            const applicantDoc = await db.collection('applicants').doc(interviewData.applicantId).get();
            const applicantName = applicantDoc.exists ? `: ${applicantDoc.data().callMe} ${applicantDoc.data().lastName}` : '';

            await axios.post(`${DAILY_API}/rooms`, {
                name: interviewId,
                properties: { enable_screenshare: true, enable_chat: true, max_participants: 8 },
            }, { headers });

            await interviewRef.update({ 
                roomId: interviewId, 
                roomUrl: `${brand.dailyCoDomain}/${interviewId}`, 
                displayName: `${brand.organizationShortName} Interview${applicantName}` 
            });
        } catch (error) {
            throw new HttpsError('internal', 'Failed to create the video room for this interview.');
        }
    }

    // Close Room if Terminal
    const terminalStatuses = ['Completed', 'Missed', 'Cancelled'];
    if (terminalStatuses.includes(newStatus) && interviewData.roomId) {
        axios.delete(`${DAILY_API}/rooms/${interviewData.roomId}`, { headers }).catch(e => {
            if (e.response?.status !== 404) console.warn(`Could not delete room '${interviewData.roomId}'`);
        });
        await interviewRef.update({ roomId: admin.firestore.FieldValue.delete(), roomUrl: admin.firestore.FieldValue.delete() });
    }

    await interviewRef.update({
        status: newStatus,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true, message: `Interview status updated to ${newStatus}.` };
});

// Bulk Update Interview Status
// Simple batch update for interview statuses.
exports.bulkUpdateInterviewStatus = onCall(async (request) => {
    const context = request;
    if (!context.auth) throw new HttpsError('unauthenticated', 'Authentication required.');

    const db = admin.firestore();
    const memberDoc = await db.collection('members').doc(context.auth.uid).get();
    if (!memberDoc.exists || !memberDoc.data()?.permissions?.interviews?.canHost) {
        throw new HttpsError('permission-denied', 'You must be an admin.');
    }

    const { interviewIds, newStatus } = request.data;
    if (!Array.isArray(interviewIds) || interviewIds.length === 0 || !newStatus) {
        throw new HttpsError('invalid-argument', 'Interview IDs and a new status are required.');
    }

    const batch = db.batch();
    interviewIds.forEach((id) => {
        const interviewRef = db.collection('interviews').doc(id);
        batch.update(interviewRef, {
            status: newStatus,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    });

    await batch.commit();
    return { success: true, message: `${interviewIds.length} interview(s) updated to ${newStatus}.` };
});