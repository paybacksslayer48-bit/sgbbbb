import fs from 'fs';
import path from 'path';

const srcDir = path.join(process.cwd(), 'implants');
const destDir = path.join(process.cwd(), 'public', 'implants');

if (fs.existsSync(srcDir)) {
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  const files = fs.readdirSync(srcDir);
  for (const file of files) {
    const srcFile = path.join(srcDir, file);
    const destFile = path.join(destDir, file);
    if (fs.statSync(srcFile).isFile()) {
      fs.copyFileSync(srcFile, destFile);
      console.log(`Copied ${file} to public/implants/`);
    }
  }
} else {
  console.log('No implants directory found.');
}
