import fs from 'fs';
import path from 'path';
import { DEFAULT_PRODUCTS } from './src/defaultProducts';

// Generate a clean JSON with lightweight static URL paths
const cleanJsonPath = path.join(process.cwd(), 'public', 'defaultProducts.json');
fs.writeFileSync(cleanJsonPath, JSON.stringify(DEFAULT_PRODUCTS, null, 2), 'utf8');
console.log(`Successfully rewrote ${cleanJsonPath} as a lightweight static asset!`);
