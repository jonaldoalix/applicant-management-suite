const admin = require('firebase-admin');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const axios = require('axios');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(timezone);
dayjs.extend(utc);

const { brand } = require('../config');

// Helper for Daily.co API calls
const dailyApi = async (method, endpoint, data = null) => {
    const API_KEY = process.env.DAILY_KEY;
    if (!API_KEY) throw new Error('Daily API Key is missing in environment variables.');

    const config = {
        method,
        url: `https://api.daily.co/v1${endpoint}`,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${API_KEY}`,
        },
    };
    if (data) config.data = data;
    return axios(config);
};

// Create Interview Room
// Manually creates a Daily.co room for a specific interview document.
exports.createInterviewRoom = onCall(async (request) => {
    const { interviewId } = request.data;
    const context = request;

    if (!context.auth) throw new HttpsError('unauthenticated', 'You must be logged in.');

    const db = admin.firestore();
    const memberDoc = await db.collection('members').doc(context.auth.uid).get();
    if (!memberDoc.exists || !memberDoc.data()?.permissions?.interviews?.canHost) {
        throw new HttpsError('permission-denied', 'Only hosts can create interview rooms.');
    }

    const interviewRef = db.collection('interviews').doc(interviewId);
    const interviewDoc = await interviewRef.get();
    if (!interviewDoc.exists) throw new HttpsError('not-found', 'Interview not found.');

    const applicantId = interviewDoc.data().applicantId;
    const applicantData = await db.collection('applicants').doc(applicantId).get();

    const applicantName = applicantData.exists ? `: ${applicantData.data().callMe} ${applicantData.data().lastName}` : '';
    const roomDisplayName = `${brand.organizationName} Interview${applicantName}`;

    try {
        const roomResp = await dailyApi('POST', '/rooms', {
            name: interviewId,
            properties: {
                enable_screenshare: true,
                enable_chat: true,
                max_participants: 8,
            },
        });

        await interviewRef.update({
            roomId: roomResp.data.name,
            roomUrl: roomResp.data.url,
            displayName: roomDisplayName,
        });

        return { roomUrl: roomResp.data.url };
    } catch (error) {
        console.error('Error creating room:', error.response?.data || error.message);
        throw new HttpsError('internal', 'Failed to create video room.');
    }
});

// Close Interview Room
// Deletes the video room from Daily.co and clears the ID from Firestore.
exports.closeInterviewRoom = onCall(async (request) => {
    const { interviewId } = request.data;
    const context = request;

    if (!context.auth) throw new HttpsError('unauthenticated', 'You must be signed in.');
    if (!interviewId) throw new HttpsError('invalid-argument', 'Interview ID is required.');

    const db = admin.firestore();
    const memberDoc = await db.collection('members').doc(context.auth.uid).get();
    if (!memberDoc.exists || !memberDoc.data()?.permissions?.interviews?.canHost) {
        throw new HttpsError('permission-denied', 'Only hosts can manage rooms.');
    }

    try {
        const interviewRef = db.collection('interviews').doc(interviewId);
        const interviewSnap = await interviewRef.get();

        if (!interviewSnap.exists) throw new HttpsError('not-found', 'Interview not found.');

        const roomId = interviewSnap.data().roomId;
        if (!roomId) throw new HttpsError('failed-precondition', 'Room has not been created yet.');

        await dailyApi('DELETE', `/rooms/${roomId}`);

        await interviewRef.update({
            roomId: admin.firestore.FieldValue.delete(),
        });

        return { success: true, message: 'Room closed successfully.' };
    } catch (error) {
        console.error('Error closing room:', error.response?.data || error.message);
        throw new HttpsError('internal', 'Failed to close the room.');
    }
});

// Create Deliberation Room
// Creates a persistent room for committee discussions.
exports.createDeliberationRoom = onCall(async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication required.');

    const db = admin.firestore();
    const memberDoc = await db.collection('members').doc(request.auth.uid).get();
    if (!memberDoc.exists || !memberDoc.data()?.permissions?.interviews?.canHost) {
        throw new HttpsError('permission-denied', 'Only hosts can perform this action.');
    }

    try {
        await dailyApi('POST', '/rooms', {
            name: 'deliberation-room',
            properties: { max_participants: 14 },
        });
        return { success: true, message: 'Deliberation room created successfully.' };
    } catch (error) {
        if (error.response?.data?.info?.includes('already exists')) {
            return { success: true, message: 'Deliberation room already exists.' };
        }
        throw new HttpsError('internal', 'An unexpected error occurred.');
    }
});

// Delete Deliberation Room
// Removes the persistent committee room.
exports.deleteDeliberationRoom = onCall(async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication required.');

    const db = admin.firestore();
    const memberDoc = await db.collection('members').doc(request.auth.uid).get();
    if (!memberDoc.exists || !memberDoc.data()?.permissions?.interviews?.canHost) {
        throw new HttpsError('permission-denied', 'Only hosts can perform this action.');
    }

    try {
        await dailyApi('DELETE', '/rooms/deliberation-room');
        return { success: true, message: 'Deliberation room deleted successfully.' };
    } catch (error) {
        if (error.response && error.response.status === 404) {
            return { success: true, message: 'Deliberation room did not exist.' };
        }
        throw new HttpsError('internal', 'Error deleting room.');
    }
});

// Generate Join Token
// Creates a secure, time-limited token for users to join a video call.
exports.generateJoinToken = onCall(async (request) => {
    const { interviewId, deliberation = false } = request.data;
    const context = request;

    if (!context.auth) throw new HttpsError('unauthenticated', 'Not authenticated.');

    const db = admin.firestore();
    let room_name;
    let payloadConfig = {};

    if (!deliberation) {
        const interviewRef = db.collection('interviews').doc(interviewId);
        const interviewDoc = await interviewRef.get();

        if (!interviewDoc.exists) throw new HttpsError('not-found', 'Interview not found.');

        const interviewData = interviewDoc.data();
        room_name = interviewData.roomId;
        if (!room_name) throw new HttpsError('failed-precondition', 'Room has not been created yet.');

        if (['Completed', 'Cancelled', 'Deleted'].includes(interviewData.status)) {
            throw new HttpsError('out-of-range', `This interview has been ${interviewData.status}.`);
        }

        const startTime = dayjs(interviewData.startTime.toDate());
        const endTime = dayjs(interviewData.startTime.toDate()).add(15, 'minute');
        payloadConfig = {
            nbf: startTime.subtract(5, 'minute').unix(),
            exp: endTime.add(30, 'minute').unix(),
        };
    } else {
        room_name = 'deliberation-room';
    }

    const uid = context.auth.uid;
    let displayName = '';
    const memberDoc = await db.collection('members').doc(uid).get();
    const isCommittee = memberDoc.exists;

    if (isCommittee && memberDoc.data().permissions?.interviews?.canAccess !== true) {
        throw new Error('You do not have access to interview rooms.');
    }
    const isAdmin = isCommittee && memberDoc.data().permissions?.interviews?.canHost === true;

    if (isCommittee) {
        const memberData = memberDoc.data();
        displayName = `${memberData.firstName} ${memberData.lastName}`;
    } else {
        const applicantDoc = await db.collection('applicants').doc(uid).get();
        if (!applicantDoc.exists) throw new HttpsError('permission-denied', 'User not found.');
        const applicantData = applicantDoc.data();
        displayName = `${applicantData.callMe || applicantData.firstName || 'Unknown'} ${applicantData.lastName || 'Applicant'}`;
    }

    const tokenProperties = {
        user_name: displayName,
        room_name: room_name,
        is_owner: isAdmin,
        user_id: uid,
        permissions: { hasPresence: true, canSend: true, canReceive: { base: true }, canAdmin: true },
        ...payloadConfig,
    };

    try {
        const response = await dailyApi('POST', '/meeting-tokens', { properties: tokenProperties });
        return { token: response.data.token, roomUrl: `${brand.dailyCoDomain}/${room_name}` };
    } catch (error) {
        console.error('Token Generation Failed:', error.response?.data || error.message);
        throw new HttpsError('internal', 'Could not generate video session token.');
    }
});

// Manage Participant
// Admin controls to mute, eject, or toggle video for participants.
exports.manageParticipant = onCall(async (request) => {
    const context = request;
    if (!context.auth) throw new HttpsError('unauthenticated', 'Authentication is required.');

    const db = admin.firestore();
    const memberDoc = await db.collection('members').doc(context.auth.uid).get();
    if (!memberDoc.exists || !memberDoc.data()?.permissions?.interviews?.canHost) {
        throw new HttpsError('permission-denied', 'You must be an admin to perform this action.');
    }

    const { targetSessionId, action } = request.data;
    const validActions = ['muteAudio', 'unmuteAudio', 'stopVideo', 'startVideo', 'eject'];

    if (!targetSessionId || !validActions.includes(action)) {
        throw new HttpsError('invalid-argument', 'Missing or invalid parameters.');
    }

    let apiPayload = {};
    switch (action) {
        case 'muteAudio': apiPayload = { setAudio: false }; break;
        case 'unmuteAudio': apiPayload = { setAudio: true }; break;
        case 'stopVideo': apiPayload = { setVideo: false }; break;
        case 'startVideo': apiPayload = { setVideo: true }; break;
        case 'eject': apiPayload = { eject: true }; break;
    }

    try {
        await dailyApi('POST', `/participants/${targetSessionId}`, apiPayload);
        return { success: true };
    } catch (error) {
        throw new HttpsError('internal', 'Command failed.');
    }
});

// End Interview
// Marks interview as completed in DB and deletes the Daily.co room.
exports.endInterview = onCall(async (request) => {
    const { interviewId } = request.data;
    const context = request;

    if (!context.auth) throw new HttpsError('unauthenticated', 'Authentication required.');
    if (!interviewId) throw new HttpsError('invalid-argument', 'Interview ID is required.');

    const db = admin.firestore();
    const memberDoc = await db.collection('members').doc(context.auth.uid).get();
    if (!memberDoc.exists || !memberDoc.data()?.permissions?.interviews?.canHost) {
        throw new HttpsError('permission-denied', 'You must be a host to perform this action.');
    }

    const interviewRef = db.collection('interviews').doc(interviewId);
    const interviewDoc = await interviewRef.get();

    if (interviewDoc.exists) {
        try {
            await dailyApi('DELETE', `/rooms/${interviewId}`);
        } catch (error) {
            if (error.response && error.response.status !== 404) {
                console.warn(`Could not delete room ${interviewId}:`, error.message);
            }
        }
    }

    await interviewRef.update({
        status: 'Completed',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true, message: 'Interview completed and room deleted.' };
});

// Get Room Details
// Fetches presence and configuration data for a live room.
exports.getRoomDetails = onCall(async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication required.');

    const { roomName } = request.data;
    if (!roomName) throw new HttpsError('invalid-argument', 'Room name is required.');

    try {
        const [roomResp, presenceResp] = await Promise.all([
            dailyApi('GET', `/rooms/${roomName}`),
            dailyApi('GET', `/rooms/${roomName}/presence`)
        ]);

        return {
            success: true,
            details: {
                participantCount: presenceResp.data.total_count,
                nbf: roomResp.data.config.nbf,
                exp: roomResp.data.config.exp,
            },
        };
    } catch (error) {
        if (error.response && error.response.status === 404) {
            return { success: false, message: 'Room has not been created yet.' };
        }
        throw new HttpsError('internal', 'Could not fetch room details.');
    }
});

// Daily Room Scheduler
// Automated task running at 4:00 AM.
// - Creates rooms for TODAY's scheduled interviews.
// - Deletes rooms for PAST interviews.
exports.dailyRoomScheduler = onSchedule(
    {
        schedule: 'every day 04:00',
        timeZone: 'America/New_York',
    },
    async (event) => {
        const db = admin.firestore();
        const today = dayjs().tz('America/New_York');
        const startOfToday = today.startOf('day').toDate();
        const endOfToday = today.endOf('day').toDate();

        console.log(`Running daily room scheduler for ${today.format('YYYY-MM-DD')}`);

        const interviewsRef = db.collection('interviews');

        // 1. Create Rooms for Today
        const todaysQuery = interviewsRef.where('startTime', '>=', startOfToday).where('startTime', '<=', endOfToday);
        const todaysSnapshot = await todaysQuery.get();

        if (!todaysSnapshot.empty) {
            const creationPromises = todaysSnapshot.docs.map(async (doc) => {
                const interviewId = doc.id;
                const data = doc.data();

                if (data.roomId) return; 

                try {
                    const applicantDoc = await db.collection('applicants').doc(data.applicantId).get();
                    const applicantName = applicantDoc.exists ? `: ${applicantDoc.data().callMe} ${applicantDoc.data().lastName}` : '';

                    const roomResp = await dailyApi('POST', '/rooms', {
                        name: interviewId,
                        properties: { enable_screenshare: true, enable_chat: true, max_participants: 8 },
                    });

                    await doc.ref.update({
                        roomId: roomResp.data.name,
                        roomUrl: roomResp.data.url,
                        displayName: `${brand.organizationName} Interview${applicantName}`,
                    });
                    console.log(`Created room for: ${interviewId}`);
                } catch (error) {
                    console.error(`Failed to create room ${interviewId}:`, error.message);
                }
            });
            await Promise.all(creationPromises);
        }

        // 2. Delete Past Rooms
        const pastQuery = interviewsRef.where('startTime', '<', startOfToday).where('roomId', '!=', null);
        const pastSnapshot = await pastQuery.get();

        if (!pastSnapshot.empty) {
            const deletionPromises = pastSnapshot.docs.map(async (doc) => {
                const { roomId } = doc.data();
                try {
                    await dailyApi('DELETE', `/rooms/${roomId}`);
                    await doc.ref.update({
                        roomId: admin.firestore.FieldValue.delete(),
                        roomUrl: admin.firestore.FieldValue.delete(),
                    });
                } catch (error) {
                    if (error.response && error.response.status === 404) {
                        await doc.ref.update({
                            roomId: admin.firestore.FieldValue.delete(),
                            roomUrl: admin.firestore.FieldValue.delete(),
                        });
                    }
                }
            });
            await Promise.all(deletionPromises);
            console.log(`Cleaned up ${pastSnapshot.size} past rooms.`);
        }
    }
);