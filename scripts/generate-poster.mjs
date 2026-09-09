import { chromium } from 'playwright';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

async function main() {
  console.log('🚀 Launching browser to capture 60x160 cm poster (1200 x 3200 px)...');

  const browser = await chromium.launch({
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1200, height: 3200 },
    deviceScaleFactor: 1, // exact 1200 x 3200 px
  });

  const page = await context.newPage();

  // Load the HTML file via file:// URL
  const htmlPath = path.join(rootDir, 'public', 'poster.html');
  const fileUrl = `file://${htmlPath.replace(/\\/g, '/')}`;

  console.log(`📄 Loading HTML from: ${fileUrl}`);
  await page.goto(fileUrl, { waitUntil: 'networkidle' });

  // Wait extra 2 seconds for fonts and Tailwind CDN to fully settle
  await page.waitForTimeout(2000);

  const posterElement = page.locator('#poster-root');
  const rawPngBuffer = await posterElement.screenshot({
    type: 'png',
  });

  await browser.close();
  console.log(`📸 Screenshot captured! Raw size: ${(rawPngBuffer.length / (1024 * 1024)).toFixed(2)} MB`);

  // Target destinations
  const publicOutPath = path.join(rootDir, 'public', 'Poster_E-Government_TwoLines_SiagaKita.png');
  const kmipnOutPath = 'D:\\03_Data\\Mine\\Kuliah\\Tugas\\Semester 4\\Manajemen Proyek\\KMIPN\\Poster_E-Government_TwoLines_SiagaKita.png';

  // Process with sharp to ensure optimal quality under 2 MB
  let processedBuffer;
  if (rawPngBuffer.length > 2 * 1024 * 1024) {
    console.log('⚠️ Raw size > 2MB, optimizing PNG compression with sharp...');
    processedBuffer = await sharp(rawPngBuffer)
      .png({ quality: 90, compressionLevel: 9, palette: true })
      .toBuffer();
  } else {
    processedBuffer = await sharp(rawPngBuffer)
      .png({ compressionLevel: 8 })
      .toBuffer();
  }

  // If still > 2MB (just in case), ensure strict clamp < 1.9MB
  if (processedBuffer.length > 2 * 1024 * 1024) {
    console.log('⚠️ Second pass optimization to guarantee < 2.0 MB limit...');
    processedBuffer = await sharp(rawPngBuffer)
      .png({ quality: 80, palette: true, compressionLevel: 9 })
      .toBuffer();
  }

  const finalMb = (processedBuffer.length / (1024 * 1024)).toFixed(2);
  console.log(`✅ Final Poster Size: ${finalMb} MB (${processedBuffer.length} bytes)`);

  fs.writeFileSync(publicOutPath, processedBuffer);
  console.log(`💾 Saved to: ${publicOutPath}`);

  try {
    fs.writeFileSync(kmipnOutPath, processedBuffer);
    console.log(`💾 Saved to: ${kmipnOutPath}`);
  } catch (err) {
    console.warn(`Could not write to KMIPN root directly: ${err.message}`);
  }

  console.log('🎉 Poster generation completed successfully!');
}

main().catch((err) => {
  console.error('❌ Error generating poster:', err);
  process.exit(1);
});
