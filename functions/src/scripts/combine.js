const fs = require('fs');
const path = require('path');

// Define file paths (pointing to root directory)
const normalizedDataPath = path.join(__dirname, '../../normalizedData.json');
const nonSGDataPath = path.join(__dirname, '../../nonSGData.json');
const outputPath = path.join(__dirname, '../../combinedNormalizedData.json');

function mergeData(normalizedData, nonSGData) {
	return normalizedData.map((yearObject) => {
		const year = yearObject.year;
		const nonScholarshipItems = nonSGData[String(year)] || [];

		return {
			...yearObject,
			non_sg_items: nonScholarshipItems,
		};
	});
}

function runMerge() {
	try {
		const normalizedData = JSON.parse(fs.readFileSync(normalizedDataPath, 'utf8'));
		const nonSGData = JSON.parse(fs.readFileSync(nonSGDataPath, 'utf8'));

		const combinedNormalizedData = mergeData(normalizedData, nonSGData);

		fs.writeFileSync(outputPath, JSON.stringify(combinedNormalizedData, null, 2), 'utf8');
		console.log(`Merge complete. Output saved to: ${outputPath}`);
	} catch (error) {
		console.error('Merge failed:', error);
	}
}

runMerge();
