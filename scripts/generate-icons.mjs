import sharp from 'sharp';

const input = 'C:\\Users\\owner\\.gemini\\antigravity\\brain\\c2875994-bb34-49b3-8de1-a26a591af6a7\\ai_neon_icon_1773106937090.png';

async function generate() {
  try {
    await sharp(input).resize(512, 512).toFile('app/icon.png');
    await sharp(input).resize(180, 180).toFile('app/apple-icon.png');
    await sharp(input).resize(192, 192).toFile('public/icon-192x192.png');
    await sharp(input).resize(512, 512).toFile('public/icon-512x512.png');
    console.log('Icons generated successfully');
  } catch (err) {
    console.error('Failed to generate icons:', err);
  }
}

generate();
