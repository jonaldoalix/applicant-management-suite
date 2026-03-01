const fs = require('fs').promises;
const path = require('path');

// Define paths
const INPUT_FILE = path.join(__dirname, '../../cleanedData.json');
const OUTPUT_FILE = path.join(__dirname, '../../normalizedData.json');

// --- Helpers ---

const isNully = (val) => val === null || val === undefined || (typeof val === 'number' && isNaN(val));

function cleanString(val, capitalize = false) {
	if (isNully(val)) return null;
	let s = String(val).trim();
	return capitalize ? s.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase()) : s;
}

function stripParentheticals(str) {
	if (isNully(str) || typeof str !== 'string') return null;
	const parenIndex = str.indexOf('(');
	return parenIndex === -1 ? str.trim() : str.substring(0, parenIndex).trim();
}

function cleanGrade(gradeStr) {
	let s = cleanString(gradeStr, true);
	if (isNully(s)) return null;
	const replacements = { Sophmore: 'Sophomore', Sohpmore: 'Sophomore', Senrior: 'Senior' };
	s = s.replace(/\(.*\)/, '').trim();
	return replacements[s] || s;
}

// --- Main ---

async function main() {
	console.log(`Reading ${INPUT_FILE}...`);
	let allData;

	try {
		allData = JSON.parse(await fs.readFile(INPUT_FILE, 'utf8'));
	} catch (e) {
		console.error(`Error loading file: ${e.message}`);
		return;
	}

	let namesChanged = 0;
	let gradesChanged = 0;

	for (const yearObj of allData) {
		if (!yearObj) continue;

		const processList = (list) => {
			for (const item of list || []) {
				const newName = stripParentheticals(item.scout_name);
				if (item.scout_name !== newName) {
					item.scout_name = newName;
					namesChanged++;
				}

				const newGrade = cleanGrade(stripParentheticals(item.grade));
				if (item.grade !== newGrade) {
					item.grade = newGrade;
					gradesChanged++;
				}
			}
		};

		processList(yearObj.renewable_scholarships);
		processList(yearObj.non_renewable_grants);
	}

	console.log(`Summary: Cleaned ${namesChanged} names and ${gradesChanged} grades.`);

	await fs.writeFile(OUTPUT_FILE, JSON.stringify(allData, null, 4));
	console.log(`Success: Normalized data saved to ${OUTPUT_FILE}`);
}

main().catch(console.error);
