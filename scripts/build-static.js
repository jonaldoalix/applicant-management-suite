import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const packageJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf8'));
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

const processTemplate = (templatePath, outputPath) => {
  let templateContent = fs.readFileSync(templatePath, 'utf8');
  for (const [placeholder, value] of Object.entries(replacements)) {
    templateContent = templateContent.replace(new RegExp(placeholder, 'g'), String(value || ''));
  }
  fs.writeFileSync(outputPath, templateContent);
  console.log(`Generated ${path.basename(outputPath)} from template.`);
};

processTemplate(path.resolve(__dirname, '../public/template.manifest.json'), path.resolve(__dirname, '../public/manifest.json'));
processTemplate(path.resolve(__dirname, '../public/template.index.html'), path.resolve(__dirname, '../index.html'));
console.log('Static asset generation complete.');
