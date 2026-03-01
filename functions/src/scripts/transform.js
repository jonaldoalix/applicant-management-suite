const fs = require('fs').promises;
const path = require('path');

// Define paths
const INPUT_FILE = path.join(__dirname, '../../extractedData.json');
const OUTPUT_FILE = path.join(__dirname, '../../cleanedData.json');

const DEFAULT_FINANCIAL_ITEM = {
	amount_available: null,
	amount_distributed: null,
	amount_returned: null,
};

const DEFAULT_RENEWABLE_SCHOLARSHIP = {
	scout_name: null,
	grade: null,
	years_remaining: null,
	committed_renewal: null,
	one_time_grant: null,
	total_disbursement: null,
	notes: null,
};

const DEFAULT_NON_RENEWABLE_GRANT = {
	scout_name: null,
	grade: null,
	grant_amount: null,
	notes: null,
};

const DEFAULT_YEAR_SCHEMA = {
	year: null,
	total_allotted_disbursement: null,
	prior_year_clawback: null,
	financial_summary: {
		scholarships_grants: { ...DEFAULT_FINANCIAL_ITEM },
		non_scholarship_items: { ...DEFAULT_FINANCIAL_ITEM },
	},
	renewable_scholarships: [],
	non_renewable_grants: [],
};

// --- Helpers ---

const isNully = (val) => val === null || val === undefined || (typeof val === 'number' && isNaN(val)) || (typeof val === 'string' && val.toLowerCase() === 'nan');

function toSafeFloat(val) {
	if (isNully(val)) return null;
	try {
		const num = parseFloat(String(val).replace(/,/g, ''));
		return isNaN(num) ? null : num;
	} catch {
		return null;
	}
}

function toSafeInt(val) {
	if (isNully(val)) return null;
	try {
		const num = parseInt(String(val), 10);
		return isNaN(num) ? null : num;
	} catch {
		return null;
	}
}

function cleanString(val, capitalize = false) {
	if (isNully(val)) return null;
	let s = String(val).trim();
	return capitalize ? s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : s;
}

function cleanGrade(gradeStr) {
	let s = cleanString(gradeStr, true);
	if (isNully(s)) return null;
	const replacements = { Sophmore: 'Sophomore', Senrior: 'Senior' };
	return replacements[s] || s;
}

// --- Main ---

async function main() {
	console.log('Loading extractedData.json...');
	let allData = [];

	try {
		allData = JSON.parse(await fs.readFile(INPUT_FILE, 'utf8'));
	} catch (e) {
		console.error(`Error loading data: ${e.message}`);
		return;
	}

	const normalizedData = [];

	for (const yearObj of allData) {
		if (!yearObj) continue;

		const newYear = JSON.parse(JSON.stringify(DEFAULT_YEAR_SCHEMA));

		// Normalize Top-Level
		newYear.year = toSafeInt(yearObj.year);
		newYear.total_allotted_disbursement = toSafeFloat(yearObj.total_allotted_disbursement);
		newYear.prior_year_clawback = toSafeFloat(yearObj.prior_year_clawback);

		// Normalize Financial Summary
		const fin = yearObj.financial_summary || {};
		const sg = fin.scholarships_grants || {};
		const nsi = fin.non_scholarship_items || {};

		newYear.financial_summary.scholarships_grants = {
			amount_available: toSafeFloat(sg.amount_available),
			amount_distributed: toSafeFloat(sg.amount_distributed),
			amount_returned: toSafeFloat(sg.amount_returned),
		};

		newYear.financial_summary.non_scholarship_items = {
			amount_available: toSafeFloat(nsi.amount_available),
			amount_distributed: toSafeFloat(nsi.amount_distributed),
			amount_returned: toSafeFloat(nsi.amount_returned),
		};

		// Normalize Renewable Scholarships
		for (const item of yearObj.renewable_scholarships || []) {
			const newItem = { ...DEFAULT_RENEWABLE_SCHOLARSHIP, ...item };
			newItem.scout_name = cleanString(newItem.scout_name, true);
			newItem.grade = cleanGrade(newItem.grade);
			newItem.years_remaining = toSafeInt(newItem.years_remaining);
			newItem.committed_renewal = toSafeFloat(newItem.committed_renewal);
			newItem.one_time_grant = toSafeFloat(newItem.one_time_grant);
			newItem.total_disbursement = toSafeFloat(newItem.total_disbursement);
			newItem.notes = cleanString(newItem.notes);
			newYear.renewable_scholarships.push(newItem);
		}

		// Normalize Non-Renewable Grants
		for (const item of yearObj.non_renewable_grants || []) {
			const newItem = { ...DEFAULT_NON_RENEWABLE_GRANT, ...item };
			newItem.scout_name = cleanString(newItem.scout_name, true);
			newItem.grade = cleanGrade(newItem.grade);
			newItem.grant_amount = toSafeFloat(newItem.grant_amount);
			newItem.notes = cleanString(newItem.notes);
			newYear.non_renewable_grants.push(newItem);
		}

		normalizedData.push(newYear);
	}

	// Sort by year descending
	normalizedData.sort((a, b) => (b.year || 0) - (a.year || 0));

	await fs.writeFile(OUTPUT_FILE, JSON.stringify(normalizedData, null, 4));
	console.log(`Success: 'cleanedData.json' created with ${normalizedData.length} records.`);
}

main().catch(console.error);
