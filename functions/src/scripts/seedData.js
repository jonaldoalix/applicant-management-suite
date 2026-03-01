const admin = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

// --- Configuration ---
// Go up two levels to find the key in project root
const SERVICE_ACCOUNT_PATH = path.join(__dirname, '../../serviceAccountKey.json');
const PROJECT_ID = 'ams-fsb';

try {
	const serviceAccount = require(SERVICE_ACCOUNT_PATH);
	admin.initializeApp({
		credential: admin.credential.cert(serviceAccount),
		projectId: PROJECT_ID,
	});
	console.log('Firebase Admin initialized.');
} catch (e) {
	console.error('Initialization Error:', e.message);
	process.exit(1);
}

const db = admin.firestore();

// --- Data Generators ---
const firstNames = ['James', 'Mary', 'Robert', 'Patricia', 'John', 'Jennifer', 'Michael', 'Linda', 'David', 'Elizabeth', 'William', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen', 'Christopher', 'Nancy', 'Daniel', 'Lisa', 'Matthew', 'Betty', 'Anthony', 'Margaret', 'Mark', 'Sandra', 'Donald', 'Ashley', 'Steven', 'Kimberly', 'Paul', 'Emily', 'Andrew', 'Donna', 'Joshua', 'Michelle', 'Kenneth', 'Dorothy', 'Kevin', 'Carol', 'Brian', 'Amanda', 'George', 'Melissa', 'Edward', 'Deborah', 'Ronald', 'Stephanie', 'Timothy', 'Rebecca', 'Jason', 'Sharon', 'Jeffrey', 'Laura', 'Ryan', 'Cynthia', 'Jacob', 'Kathleen', 'Gary', 'Amy', 'Nicholas', 'Shirley', 'Eric', 'Angela', 'Jonathan', 'Helen', 'Stephen', 'Anna', 'Larry', 'Brenda', 'Justin', 'Pamela', 'Scott', 'Nicole', 'Brandon', 'Emma'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores', 'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts', 'Gomez', 'Phillips', 'Evans', 'Turner', 'Diaz', 'Parker', 'Cruz', 'Edwards', 'Collins', 'Reyes', 'Stewart', 'Morris', 'Morales', 'Murphy', 'Cook', 'Rogers', 'Gutierrez', 'Ortiz', 'Morgan', 'Cooper'];
const organizations = ['Code for America', 'Habitat for Humanity', 'Local Food Bank', 'Red Cross', 'Boys & Girls Club', 'City Animal Shelter', 'Big Brothers Big Sisters', 'YMCA', 'United Way', 'Meals on Wheels', 'Sierra Club', 'Doctors Without Borders', 'Special Olympics', 'Make-A-Wish Foundation', 'World Wildlife Fund', 'Salvation Army', 'Goodwill Industries', 'Feeding America', 'Teach For America', 'AmeriCorps', 'Rotary Club', 'Lions Club', 'Key Club', 'National Honor Society', 'Student Government Assoc.', 'Local Library Volunteers', 'Community Garden Initiative', 'Tech for Good', 'Youth Mentoring Program', 'Historical Society'];
const roles = ['Team Lead', 'Volunteer Coordinator', 'Senior Developer', 'Mentor', 'Project Manager', 'Outreach Specialist', 'Tutor', 'Fundraiser', 'Event Planner', 'Social Media Manager', 'Research Assistant', 'Board Member', 'Camp Counselor', 'Administrative Assistant', 'Data Analyst', 'Content Creator', 'Grant Writer', 'Community Liaison', 'Site Supervisor', 'Program Director', 'Shift Leader', 'Peer Advisor'];
const cities = ['Boston, MA', 'Salem, MA', 'Worcester, MA', 'Cambridge, MA', 'Lowell, MA', 'Springfield, MA', 'Quincy, MA', 'Newton, MA', 'Somerville, MA', 'Lynn, MA', 'New Bedford, MA', 'Brockton, MA', 'Fall River, MA', 'Medford, MA', 'Malden, MA', 'Waltham, MA', 'Brookline, MA', 'Plymouth, MA', 'Haverhill, MA', 'Taunton, MA', 'Peabody, MA', 'Revere, MA', 'Methuen, MA', 'Chicopee, MA', 'Attleboro, MA', 'Arlington, MA'];
const schools = ['Boston University', 'Northeastern University', 'UMass Amherst', 'Salem State University', 'MIT', 'Harvard University', 'Tufts University', 'Boston College', 'Suffolk University', 'Emerson College', 'Wentworth Institute of Technology', 'UMass Boston', 'UMass Lowell', 'Bridgewater State University', 'Framingham State University', 'Bentley University', 'Brandeis University', 'Wellesley College', 'Babson College', 'WPI', 'Clark University', 'Holy Cross', 'Merrimack College', 'Endicott College', 'Gordon College', 'Simmons University', 'Lesley University'];
const majors = ['Computer Science', 'Biology', 'History', 'Engineering', 'Psychology', 'Nursing', 'Business Administration', 'Economics', 'Political Science', 'English Literature', 'Mathematics', 'Communications', 'Marketing', 'Finance', 'Accounting', 'Sociology', 'Chemistry', 'Physics', 'Environmental Science', 'Art History', 'Graphic Design', 'Education', 'Public Health', 'International Relations', 'Criminal Justice'];
const streets = ['Main St', 'Maple Ave', 'Oak Ln', 'Washington St', 'Park Dr', 'Highland Ave', 'Elm St', 'Cedar St', 'Pine St', 'Lakeview Dr', 'Sunset Blvd', 'River Rd', 'Broadway', 'Market St', 'School St', 'Church St', 'Chestnut St', 'Walnut St', 'Pleasant St', 'Center St', 'Union St', 'North St', 'South St', 'West St', 'East St', 'Spring St', 'Summer St', 'Winter St', 'Autumn Dr'];
const emailDomains = ['yahoo.com', 'gmail.com', 'outlook.com', 'hotmail.com', 'aol.com', 'mail.com', 'icloud.com', 'protonmail.com'];

const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];
const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const getRandomFloat = (min, max) => (Math.random() * (max - min) + min).toFixed(2);

const generateSearchTokens = (inputs = []) => {
	const tokens = new Set();
	inputs.forEach((input) => {
		if (!input) return;
		const lower = input.toString().toLowerCase();
		tokens.add(lower);
		lower.split(/[ @.\-_]/).forEach((part) => {
			if (part) for (let i = 1; i <= part.length; i++) tokens.add(part.substring(0, i));
		});
	});
	return Array.from(tokens);
};

const deleteCollection = async (collectionPath) => {
	const collectionRef = db.collection(collectionPath);
	const snapshot = await collectionRef.get();
	if (snapshot.size === 0) return;

	console.log(`Deleting ${snapshot.size} documents from ${collectionPath}...`);
	const batch = db.batch();
	snapshot.docs.forEach((doc) => {
		batch.delete(doc.ref);
	});
	await batch.commit();
};

const createMockApplicantGraph = async (i) => {
	const firstName = getRandom(firstNames);
	const lastName = getRandom(lastNames);
	const uid = `mock-user-${i}-${Date.now()}`;
	const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@${getRandom(emailDomains)}`;
	const org = getRandom(organizations);
	const school = getRandom(schools);
	const major = getRandom(majors);
	const city = getRandom(cities);

	// Generate a random date extending back 3 years, starting from late 2026/future
	// This ensures 2026 gets plenty of applications
	const endDate = new Date('2026-12-31T23:59:59Z').getTime();
	const startDate = new Date('2023-01-01T00:00:00Z').getTime();
	const randomDate = new Date(startDate + Math.random() * (endDate - startDate));
	const randomYear = randomDate.getFullYear();
	const windowString = `7/5/${randomYear}, 11:59:59 PM`;

	const applicantData = {
		id: uid,
		firstName,
		lastName,
		email,
		cell: `555-010-${1000 + i}`,
		callMe: firstName,
		school,
		gradYear: '2028',
		major,
		picture: {},
		organization: org,
		applications: [],
		awards: [],
		searchableTerms: generateSearchTokens([firstName, lastName, email, org, school]),
		createdOn: randomDate,
	};

	await db.collection('applicants').doc(uid).set(applicantData);
	console.log(`Created Applicant: ${firstName} ${lastName} (${uid})`);

	const appId = uuidv4();
	const profileId = uuidv4();
	const familyId = uuidv4();
	const educationId = uuidv4();
	const experienceId = uuidv4();
	const expensesId = uuidv4();
	const incomeId = uuidv4();
	const contributionsId = uuidv4();
	const projectionsId = uuidv4();
	const attachmentsId = uuidv4();

	const batch = db.batch();

	batch.set(db.collection('profiles').doc(profileId), {
		id: profileId,
		applicantID: uid,
		applicantFirstName: firstName,
		applicantLastName: lastName,
		applicantEmailAddress: email,
		applicantCellPhone: applicantData.cell,
		applicantDOB: new Date('2003-01-01').toISOString(),
		applicantMailingAddress: { description: `${getRandomInt(10, 999)} ${getRandom(streets)}, ${city}, MA, USA` },
		completedBy: uid,
		searchableTerms: generateSearchTokens([firstName, lastName, email]),
	});

	batch.set(db.collection('families').doc(familyId), {
		id: familyId,
		familyID: familyId,
		familyMembers: [
			{ fullName: `Parent of ${firstName}`, relation: 'Father', age: 50, occupation: 'Manager' },
			{ fullName: `Sibling of ${firstName}`, relation: 'Sibling', age: 18, occupation: 'Student' },
		],
		completedBy: uid,
	});

	batch.set(db.collection('educationRecords').doc(educationId), {
		id: educationId,
		educationRecordID: educationId,
		schoolName: school,
		major: major,
		expectedGraduationDate: new Date('2025-05-01').toISOString(),
		currentGPA: getRandomFloat(2.5, 4.0),
		previousSchools: ['Local High School'],
		completedBy: uid,
		searchableTerms: generateSearchTokens([school, major]),
	});

	batch.set(db.collection('experienceRecords').doc(experienceId), {
		id: experienceId,
		experienceRecordID: experienceId,
		currentOrganization: getRandom(['0', '1']),
		positions: [
			{ organization: org, role: getRandom(roles), type: 'Non-Profit', location: city },
			{ organization: getRandom(organizations), role: 'Volunteer', type: 'Community', location: city },
		],
		completedBy: uid,
		searchableTerms: generateSearchTokens([org]),
	});

	batch.set(db.collection('expenseReports').doc(expensesId), {
		id: expensesId,
		expensesID: expensesId,
		tuitionCost: getRandomInt(20000, 60000),
		roomAndBoardCost: getRandomInt(10000, 20000),
		bookCost: 1200,
		commutingCost: 800,
		otherExpenses: [{ amount: getRandomInt(10, 10000), title: 'Miscellaneous Resources', id: uuidv4() }],
		completedBy: uid,
	});

	batch.set(db.collection('incomeReports').doc(incomeId), {
		id: incomeId,
		incomesReportID: incomeId,
		summerEarnings: getRandomInt(2000, 5000),
		fallEarnings: getRandomInt(1000, 3000),
		earningsAppliedToEducation: getRandomInt(3000, 8000),
		savingsAppliedToEducation: 1000,
		collegeAward: getRandomInt(10000, 30000),
		loansAmount: 5000,
		otherIncomeSources: [{ amount: getRandomInt(1000, 5000), title: 'Other Scholarships', id: uuidv4() }],
		completedBy: uid,
	});

	batch.set(db.collection('contributions').doc(contributionsId), {
		id: contributionsId,
		contributionsID: contributionsId,
		p1ExpectedAnnualIncome: getRandomInt(40000, 100000),
		p2ExpectedAnnualIncome: getRandomInt(40000, 100000),
		parentsOwnOrRentHome: getRandom(['Own', 'Rent']),
		parentsMaritalStatus: 'Married',
		siblingSchools: [{ cost: getRandomInt(10000, 30000), title: 'Sibling University', id: uuidv4() }],
		anyExtraordinaryExpenses: 'Expenses unrelated to education.',
		completedBy: uid,
	});

	batch.set(db.collection('projections').doc(projectionsId), {
		id: projectionsId,
		projectionsID: projectionsId,
		applicantEarnings: 5000,
		applicantSavings: 1000,
		applicantFamily: getRandomInt(5000, 20000),
		request: 5000,
		completedBy: uid,
	});

	batch.set(db.collection('attachments').doc(attachmentsId), {
		id: attachmentsId,
		attachmentsID: attachmentsId,
		applicantPersonalLetter: { displayName: 'My_Essay.pdf', home: 'http://example.com/fake.pdf' },
		academicTranscript: { displayName: 'Transcript_2024.pdf', home: 'http://example.com/fake.pdf' },
		completedBy: uid,
		searchableTerms: generateSearchTokens(['Essay', 'Transcript']),
	});

	// Round-robin distribution avoids low-balling any specific application type
	const appTypes = ['New Applicant', 'Returning Grant', 'Scholarship Check In'];
	const appType = appTypes[i % appTypes.length];
	const appStatus = getRandom(['Submitted', 'Eligible', 'Invited', 'Completed', 'Incomplete', 'Awarded', 'Started']);

	const applicationData = {
		id: appId,
		applicantName: `${firstName} ${lastName}`,
		completedBy: uid,
		type: appType,
		status: appStatus,
		window: windowString,
		submittedOn: randomDate.toISOString(),
		lastUpdated: randomDate.toISOString(),
		profile: profileId,
		family: familyId,
		education: educationId,
		experience: experienceId,
		expenses: expensesId,
		incomes: incomeId,
		contributions: contributionsId,
		projections: projectionsId,
		attachments: attachmentsId,
		searchableTerms: generateSearchTokens([appType, appStatus, firstName, lastName]),
	};

	batch.set(db.collection('applications').doc(appId), applicationData);

	// Mock Awards
	if (appStatus === 'Awarded') {
		const awardId = uuidv4();
		const awardData = {
			id: awardId,
			applicantID: uid,
			applicantName: `${firstName} ${lastName}`,
			type: appType,
			deadline: windowString,
			amount: getRandomInt(1000, 5000),
			awardedOn: randomDate.toISOString()
		};
		batch.set(db.collection('awards').doc(awardId), awardData);

		await db.collection('applicants').doc(uid).update({
			awards: admin.firestore.FieldValue.arrayUnion(awardData)
		});
	}

	await batch.commit();

	await db
		.collection('applicants')
		.doc(uid)
		.update({
			applications: admin.firestore.FieldValue.arrayUnion(appId),
		});

	console.log(` -> Created Application ${appId}`);
};

const seed = async () => {
	console.log('Wiping existing mock data...');
	await deleteCollection('applicants');
	await deleteCollection('profiles');
	await deleteCollection('families');
	await deleteCollection('educationRecords');
	await deleteCollection('experienceRecords');
	await deleteCollection('expenseReports');
	await deleteCollection('incomeReports');
	await deleteCollection('contributions');
	await deleteCollection('projections');
	await deleteCollection('attachments');
	await deleteCollection('applications');
	await deleteCollection('awards');

	console.log('Starting 150-Record Seed...');
	for (let i = 1; i <= 150; i++) {
		await createMockApplicantGraph(i);
	}
	console.log('Seeding Complete. Refresh dashboard.');
};

seed();
