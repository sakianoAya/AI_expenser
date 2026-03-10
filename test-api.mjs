import fs from 'fs';
import path from 'path';

async function testUpload() {
  const filePath = path.join(process.cwd(), 'public', 'icon-512x512.png');
  const fileBuffer = fs.readFileSync(filePath);
  const blob = new Blob([fileBuffer], { type: 'image/png' });
  
  const formData = new FormData();
  formData.append('receipt', blob, 'icon-512x512.png');
  formData.append('locale', 'zh-TW');

  console.log('Sending request to http://localhost:3005/api/ai/receipt...');
  
  try {
    const response = await fetch('http://localhost:3005/api/ai/receipt', {
      method: 'POST',
      body: formData,
    });
    
    console.log(`Status: ${response.status}`);
    const data = await response.text();
    console.log(`Response: ${data}`);
  } catch (error) {
    console.error('Fetch error:', error);
  }
}

testUpload();
