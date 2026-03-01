const fs = require('fs');
const path = require('path');

const CLEANED_DATA_PATH = path.join(__dirname, '../../cleanedData.json');
const NON_SG_DATA_PATH = path.join(__dirname, '../../nonSGData.json');
const OUTPUT_PATH = path.join(__dirname, '../../obfuscatedData.json');

const firstNames = ['James', 'Mary', 'Robert', 'Patricia', 'John', 'Jennifer', 'Michael', 'Linda', 'David', 'Elizabeth', 'William', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen', 'Christopher', 'Nancy', 'Daniel', 'Lisa', 'Matthew', 'Betty'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez'];

const getRandomName = () => {
    const first = firstNames[Math.floor(Math.random() * firstNames.length)];
    const last = lastNames[Math.floor(Math.random() * lastNames.length)];
    return `${last}, ${first}`;
};

const getRandomAmount = (min, max, step = 500) => {
    const steps = Math.floor((max - min) / step);
    return min + (Math.floor(Math.random() * (steps + 1)) * step);
};

// Generic replacements for program names
const programReplacements = {
    'Parker Fund': 'Annual Scholarship',
    'TL Storer': 'Camp Alpha',
    'Brownsea': 'Leadership Training',
    'Roland Gauthier': 'Founders',
    'Kevin': 'Director',
    'Lowell': 'City',
    'NE Base Camp': 'Regional Camp'
};

const obfuscateProgramName = (name) => {
    let newName = name;
    for (const [key, value] of Object.entries(programReplacements)) {
        // use regex with word boundaries where possible, or simple replace
        const regex = new RegExp(`\\b${key}\\b`, 'gi');
        newName = newName.replace(regex, value);
        // Fallback for simple string replacement if regex missed it
        newName = newName.replace(key, value);
    }
    return newName;
};

const obfuscateData = () => {
    console.log('Reading data...');
    const cleanedData = JSON.parse(fs.readFileSync(CLEANED_DATA_PATH, 'utf8'));
    const nonSgData = JSON.parse(fs.readFileSync(NON_SG_DATA_PATH, 'utf8'));

    // 1. Obfuscate Non-S&G Data First
    const obfNonSgData = {};
    for (const [year, programs] of Object.entries(nonSgData)) {
        obfNonSgData[year] = programs.map(p => {
            const request = p.request !== null ? getRandomAmount(1000, 8000, 100) : null;
            const disbursement = p.disbursement !== null ? getRandomAmount(500, request || 5000, 100) : null;
            return {
                program: obfuscateProgramName(p.program),
                request: request,
                disbursement: disbursement
            };
        });
    }

    // 2. Obfuscate Cleaned Data (Scholarships/Grants) and combine
    const obfuscatedCombined = cleanedData.map(yearData => {
        const year = yearData.year;

        let sgDistributed = 0;

        // Obfuscate Renewables
        const renewables = (yearData.renewable_scholarships || []).map(item => {
            const oneTime = getRandomAmount(0, 2000, 500);
            const committed = getRandomAmount(1000, 3000, 500);
            const total = oneTime + committed;
            sgDistributed += total;

            // Preserve original grade/note structure but change name
            let gradeStr = item.grade;
            if (gradeStr && typeof gradeStr === 'string') {
                gradeStr = obfuscateProgramName(gradeStr);
            }

            return {
                ...item,
                scout_name: getRandomName(),
                grade: gradeStr,
                committed_renewal: committed,
                one_time_grant: oneTime,
                total_disbursement: total
            };
        });

        // Obfuscate Non-Renewables
        const nonRenewables = (yearData.non_renewable_grants || []).map(item => {
            const grant = getRandomAmount(1000, 3000, 500);
            sgDistributed += grant;

            let gradeStr = item.grade;
            if (gradeStr && typeof gradeStr === 'string') {
                gradeStr = obfuscateProgramName(gradeStr);
            }

            return {
                ...item,
                scout_name: getRandomName(),
                grade: gradeStr,
                grant_amount: grant
            };
        });

        // Calculate Non-S&G Totals for this year
        let nonSgDistributed = 0;
        const yearNonSgItems = obfNonSgData[year] || [];
        yearNonSgItems.forEach(p => {
            nonSgDistributed += (p.disbursement || 0);
        });

        // Make up realistic "Available" and "Clawback" numbers based on distributed
        const sgAvailable = sgDistributed + getRandomAmount(0, 5000, 500) + Math.random() * 100; // Add some cents for realism
        const sgReturned = sgAvailable - sgDistributed;

        const nonSgAvailable = nonSgDistributed + getRandomAmount(0, 2000, 100) + Math.random() * 10;
        const nonSgReturned = nonSgAvailable - nonSgDistributed;

        const priorYearClawback = getRandomAmount(1000, 8000, 100);
        const totalAllotted = sgAvailable + nonSgAvailable;

        return {
            year: year,
            total_allotted_disbursement: parseFloat(totalAllotted.toFixed(2)),
            prior_year_clawback: priorYearClawback,
            financial_summary: {
                scholarships_grants: {
                    amount_available: parseFloat(sgAvailable.toFixed(2)),
                    amount_distributed: sgDistributed,
                    amount_returned: parseFloat(sgReturned.toFixed(2))
                },
                non_scholarship_items: {
                    amount_available: parseFloat(nonSgAvailable.toFixed(2)),
                    amount_distributed: nonSgDistributed,
                    amount_returned: parseFloat(nonSgReturned.toFixed(2))
                }
            },
            non_sg_items: yearNonSgItems,
            renewable_scholarships: renewables,
            non_renewable_grants: nonRenewables
        };
    });

    console.log(`Writing obfuscated data to ${OUTPUT_PATH}...`);
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(obfuscatedCombined, null, 4));
    console.log('Done!');
};

obfuscateData();
