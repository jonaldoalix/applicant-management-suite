/**
 * Static Asset Builder
 * Injects environment variables into index.html and manifest.json at build time.
 * Run automatically via 'npm start' or 'npm run build'.
 */

const fs = require('fs');
const path = require('path');

// Load env vars from root .env
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const packageJson = require('../package.json');

console.log('✅ Configuration loaded from .env and package.json');

// Define Replacement Map (Placeholder -> Environment Value)
const replacements = {
	__APP_NAME__: process.env.REACT_APP_ORGANIZATION_NAME,
	__APP_VERSION__: packageJson.version,
	__APP_SHORT_NAME__: process.env.REACT_APP_ORGANIZATION_SHORT_NAME,
	__APP_URL__: process.env.REACT_APP_URL,
	__APP_DESCRIPTION__: process.env.REACT_APP_META_DESCRIPTION,
	__THEME_COLOR__: process.env.REACT_APP_THEME_COLOR,
	__META_DESCRIPTION__: process.env.REACT_APP_META_DESCRIPTION,
	__FAVICON__: process.env.REACT_APP_FAVICON,
	__APPLE_TOUCH_ICON__: process.env.REACT_APP_APPLE_TOUCH_ICON,
	__MS_TILE_ICON__: process.env.REACT_APP_MS_TILE_ICON,
	__DARK_BACKGROUND_COLOR__: process.env.REACT_APP_PRELOAD_BG_DARK,
	__LIGHT_BACKGROUND_COLOR__: process.env.REACT_APP_PRELOAD_BG_LIGHT,
};

/**
 * Reads a template, replaces placeholders globally, and writes the output.
 */
const processTemplate = (templatePath, outputPath) => {
	try {
		let content = fs.readFileSync(templatePath, 'utf8');

		for (const [placeholder, value] of Object.entries(replacements)) {
			const finalValue = String(value || '');
			// Regex used for global replacement of the placeholder
			content = content.replace(new RegExp(placeholder, 'g'), finalValue);
		}

		fs.writeFileSync(outputPath, content);
		console.log(`✅ Generated ${path.basename(outputPath)}`);
	} catch (error) {
		console.error(`❌ Error processing ${path.basename(templatePath)}:`, error.message);
		process.exit(1);
	}
};

// Paths
const publicDir = path.resolve(__dirname, '../public');
const targets = [
	{ src: path.join(publicDir, 'template.manifest.json'), dest: path.join(publicDir, 'manifest.json') },
	{ src: path.join(publicDir, 'template.index.html'), dest: path.join(publicDir, 'index.html') },
];

// Execute
targets.forEach((t) => processTemplate(t.src, t.dest));
console.log('✅ Static asset generation complete.');
