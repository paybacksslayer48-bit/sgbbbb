import fs from 'fs';
import path from 'path';

const destDir = path.join(process.cwd(), 'public', 'implants');

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

// 1. Copy JAP implants
const srcDirJap = path.join(process.cwd(), 'src', 'implantsJAP');
if (fs.existsSync(srcDirJap)) {
  const files = fs.readdirSync(srcDirJap);
  for (const file of files) {
    const srcFile = path.join(srcDirJap, file);
    const destFile = path.join(destDir, file);
    if (fs.statSync(srcFile).isFile()) {
      fs.copyFileSync(srcFile, destFile);
      console.log(`Copied from implantsJAP: ${file} to public/implants/`);
    }
  }
}

// 2. Copy assets implants
const srcDirAssets = path.join(process.cwd(), 'src', 'components', 'assets', 'implants');
if (fs.existsSync(srcDirAssets)) {
  const files = fs.readdirSync(srcDirAssets);
  for (const file of files) {
    const srcFile = path.join(srcDirAssets, file);
    const destFile = path.join(destDir, file);
    if (fs.statSync(srcFile).isFile()) {
      fs.copyFileSync(srcFile, destFile);
      console.log(`Copied from assets/implants: ${file} to public/implants/`);
    }
  }
}
