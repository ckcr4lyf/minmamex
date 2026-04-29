import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from 'fs';
import { execSync } from 'child_process';
import { createHash } from 'crypto';
import { resolve, dirname } from 'path';

const API_URL = process.env.API_URL || 'http://127.0.0.1:3434';
const PUBLIC_DIR = resolve('public');
const BUILD_DIR = resolve('build/public');

if (!existsSync(BUILD_DIR)) {
  mkdirSync(BUILD_DIR, { recursive: true });
}

let jsContent = readFileSync(`${PUBLIC_DIR}/index.js`, 'utf-8');
jsContent = jsContent.replace(
  /const API_HOST = '.*';/,
  `const API_HOST = '${API_URL}';`
);

const minified = execSync(
  `npx terser --compress --mangle`,
  { input: jsContent }
).toString();

const hash = createHash('md5').update(minified).digest('hex').slice(0, 8);
const outputFile = `index.${hash}.js`;
writeFileSync(`${BUILD_DIR}/${outputFile}`, minified);

let html = readFileSync(`${PUBLIC_DIR}/index.html`, 'utf-8');
html = html.replace(
  /<script src="index\.js"><\/script>/,
  `<script src="${outputFile}"></script>`
);
writeFileSync(`${BUILD_DIR}/index.html`, html);

console.log(`Built: ${outputFile} (API_URL: ${API_URL})`);
