const admin = require('firebase-admin');
const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const dayjs = require('dayjs');

// Import Shared Utilities
const { generateSearchTokens } = require('../utils');
const { collections } = require('../config');

// ==================================================================
//  SEARCH INDEX TRIGGERS
// ==================================================================

// Applicants Index
// Indexes: Name, Email, Cell, School, Major, Organization.
exports.updateApplicantSearchableField = onDocumentWritten(`${collections.applicants}/{docId}`, async (event) => {
	if (!event.data || !event.data.after.exists) return null;
	const data = event.data.after.data();

	const { firstName, lastName, email, cell, school, major, organization } = data;
	const terms = generateSearchTokens([firstName, lastName, email, cell, school, major, organization, `${firstName} ${lastName}`]);

	return event.data.after.ref.update({ searchableTerms: terms });
});

// Members Index
// Indexes: Name, Email, Cell, Position, Alias.
exports.updateMemberSearchableField = onDocumentWritten(`${collections.members}/{docId}`, async (event) => {
	if (!event.data || !event.data.after.exists) return null;
	const data = event.data.after.data();

	const { firstName, lastName, email, cell, position, alias } = data;
	const terms = generateSearchTokens([firstName, lastName, email, cell, position, alias, `${firstName} ${lastName}`]);

	return event.data.after.ref.update({ searchableTerms: terms });
});

// Applications Index
// Indexes: Type, Status.
exports.updateApplicationSearchableKeywords = onDocumentWritten(`${collections.applications}/{docId}`, async (event) => {
	if (!event.data || !event.data.after.exists) return null;
	const data = event.data.after.data();

	const { type, status } = data;
	const terms = generateSearchTokens([type, status]);

	return event.data.after.ref.update({ searchableTerms: terms });
});

// Mail Cache Index (Zoho)
// Indexes: To, Sender, Subject, Tags.
exports.updateMailCacheSearchableTerms = onDocumentWritten(`${collections.mailCache}/{docId}`, async (event) => {
	if (!event.data || !event.data.after.exists) return null;
	const data = event.data.after.data();

	const { to, sender, subject, tags } = data;
	const allTags = Array.isArray(tags) ? tags.join(' ') : '';
	const terms = generateSearchTokens([to, sender, subject, allTags]);

	return event.data.after.ref.update({ searchableTerms: terms });
});

// Attachments Index
// Indexes: Display Names of all uploaded files.
exports.updateAttachmentSearchableTerms = onDocumentWritten(`${collections.attachments}/{docId}`, async (event) => {
	if (!event.data || !event.data.after.exists) return null;
	const data = event.data.after.data();

	const termsToSearch = [];
	Object.keys(data).forEach((key) => {
		const item = data[key];
		if (item && typeof item === 'object' && item.displayName) {
			termsToSearch.push(item.displayName);
		}
	});

	const terms = generateSearchTokens(termsToSearch);
	return event.data.after.ref.update({ searchableTerms: terms });
});

// Education Records Index
// Indexes: Grad Date (Year), Major, Schools.
exports.updateEducationRecordSearchableTerms = onDocumentWritten(`${collections.education}/{docId}`, async (event) => {
	if (!event.data || !event.data.after.exists) return null;
	const data = event.data.after.data();

	const { expectedGraduationDate, major, previousSchools, schoolName } = data;
	const schools = Array.isArray(previousSchools) ? previousSchools.join(' ') : '';

	let graduationYear = null;
	if (expectedGraduationDate) {
		try {
			// Handle both Firestore Timestamp and ISO strings
			const dateVal = expectedGraduationDate.toDate ? expectedGraduationDate.toDate() : expectedGraduationDate;
			const date = dayjs(dateVal);
			if (date.isValid()) {
				graduationYear = date.format('YYYY');
			}
		} catch (e) {
			console.warn(`Could not parse graduation date for record ${event.params.docId}`);
		}
	}

	const terms = generateSearchTokens([graduationYear, major, schoolName, schools]);
	return event.data.after.ref.update({ searchableTerms: terms });
});

// Families Index
// Indexes: Names and Occupations of family members.
exports.updateFamilySearchableTerms = onDocumentWritten(`${collections.families}/{docId}`, async (event) => {
	if (!event.data || !event.data.after.exists) return null;
	const data = event.data.after.data();

	const familyTerms = [];
	if (Array.isArray(data.familyMembers)) {
		data.familyMembers.forEach((member) => {
			if (member) {
				familyTerms.push(member.fullName);
				familyTerms.push(member.occupation);
			}
		});
	}

	const terms = generateSearchTokens(familyTerms);
	return event.data.after.ref.update({ searchableTerms: terms });
});

// Profiles Index
// Indexes: Phone, Email, Name.
exports.updateProfileSearchableTerms = onDocumentWritten(`${collections.profiles}/{docId}`, async (event) => {
	if (!event.data || !event.data.after.exists) return null;
	const data = event.data.after.data();

	const { applicantCellPhone, applicantEmailAddress, applicantFirstName, applicantLastName } = data;
	const terms = generateSearchTokens([applicantCellPhone, applicantEmailAddress, applicantFirstName, applicantLastName, `${applicantFirstName} ${applicantLastName}`]);

	return event.data.after.ref.update({ searchableTerms: terms });
});

// Requests Index
// Indexes: Email, Name.
exports.updateRequestSearchableTerms = onDocumentWritten(`${collections.requests}/{docId}`, async (event) => {
	if (!event.data || !event.data.after.exists) return null;
	const data = event.data.after.data();

	const { email, name } = data;
	const terms = generateSearchTokens([email, name]);

	return event.data.after.ref.update({ searchableTerms: terms });
});

// Experience Records Index
// Indexes: Organization, Role, Location.
exports.updateExperienceRecordSearchableTerms = onDocumentWritten(`${collections.experience}/{docId}`, async (event) => {
	if (!event.data || !event.data.after.exists) return null;
	const data = event.data.after.data();

	const expTerms = [];
	if (Array.isArray(data.positions)) {
		data.positions.forEach((pos) => {
			if (pos) {
				expTerms.push(pos.organization);
				expTerms.push(pos.role);
				expTerms.push(pos.location);
			}
		});
	}

	const terms = generateSearchTokens(expTerms);
	return event.data.after.ref.update({ searchableTerms: terms });
});

// ==================================================================
//  GLOBAL SEARCH EXECUTION
// ==================================================================

// Global Search
// Callable API to search across all indexed collections.
exports.globalSearch = onCall(async (request) => {
	const context = request;
	if (!context.auth) throw new HttpsError('unauthenticated', 'You must be logged in.');

	const { searchTerm } = request.data;
	if (!searchTerm || searchTerm.trim().length < 3) {
		throw new HttpsError('invalid-argument', 'Search term must be at least 3 characters.');
	}

	const lowerSearchTerm = searchTerm.toLowerCase();
	const db = admin.firestore();

	// Helper to run parallel queries
	const queryCollection = (collectionName) => db.collection(collectionName).where('searchableTerms', 'array-contains', lowerSearchTerm).get();

	try {
		const results = await Promise.all([queryCollection(collections.members), queryCollection(collections.applicants), queryCollection(collections.applications), queryCollection(collections.mailCache), queryCollection(collections.attachments), queryCollection(collections.education), queryCollection(collections.families), queryCollection(collections.profiles), queryCollection(collections.requests), queryCollection(collections.experience)]);

		// Map results to array of data objects with IDs
		const mapDocs = (snapshot) => snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));

		return {
			members: mapDocs(results[0]),
			applicants: mapDocs(results[1]),
			applications: mapDocs(results[2]),
			mail: mapDocs(results[3]),
			attachments: mapDocs(results[4]),
			education: mapDocs(results[5]),
			families: mapDocs(results[6]),
			profiles: mapDocs(results[7]),
			requests: mapDocs(results[8]),
			experience: mapDocs(results[9]),
		};
	} catch (error) {
		console.error('Error in globalSearch:', error);
		throw new HttpsError('internal', 'Search failed. Please try again.');
	}
});
