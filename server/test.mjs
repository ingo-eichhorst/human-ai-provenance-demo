import { readFileSync, writeFileSync } from 'fs';
import { Reader } from '@contentauth/c2pa-node';

// Create a minimal 1x1 PNG (base64)
const minimalPNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

// Create a minimal C2PA manifest
const manifest = {
  '@context': 'https://c2pa.org/specifications/manifest/v2.0',
  claim: {
    'dc:format': 'image/png',
    instanceId: 'test-' + Date.now(),
    claimGenerator: 'Human+AI Provenance Demo/1.0.0',
    claimGeneratorInfo: { name: 'Human+AI Provenance Demo', version: '1.0.0' },
    assertions: [
      {
        label: 'c2pa.actions',
        data: {
          actions: [
            {
              action: 'c2pa.created',
              when: new Date().toISOString(),
              softwareAgent: 'Human+AI Provenance Demo/1.0.0'
            }
          ]
        }
      }
    ]
  }
};

console.log('Signing image...');

// Send request
const response = await fetch('http://localhost:3002/api/sign-image', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    image: minimalPNG,
    manifest: manifest
  })
});

if (!response.ok) {
  const error = await response.json();
  console.log('FAILED:', error.error);
  console.log('Message:', error.message);
  process.exit(1);
}

const { signedImage } = await response.json();
console.log('SUCCESS: Image signed!');

// Save to file
const outputPath = '/tmp/test-signed-image.png';
writeFileSync(outputPath, Buffer.from(signedImage, 'base64'));
console.log('Saved to:', outputPath);
console.log('');

// Verify the signed image
console.log('=== Verifying signed image ===');
const imageBuffer = readFileSync(outputPath);

const reader = await Reader.fromAsset({
  buffer: imageBuffer,
  mimeType: 'image/png'
});

if (!reader) {
  console.log('ERROR: No C2PA manifest found');
  process.exit(1);
}

console.log('OK: C2PA manifest found!');
console.log('Embedded:', reader.isEmbedded());

const manifestStore = reader.json();
const activeManifest = reader.getActive();

if (activeManifest) {
  console.log('Claim generator:', activeManifest.claim_generator);
  console.log('');
}

// Check validation_status
if (manifestStore.validation_status) {
  console.log('=== Validation Status ===');
  if (manifestStore.validation_status.length === 0) {
    console.log('OK: No validation errors!');
  } else {
    manifestStore.validation_status.forEach((status, index) => {
      console.log('Status', index + 1);
      console.log('  Code:', status.code);
      if (status.url) console.log('  URL:', status.url);
      if (status.explanation) console.log('  Explanation:', status.explanation);
    });
  }
} else {
  console.log('No validation_status field in manifest');
}

console.log('');
console.log('Test file saved to:', outputPath);
console.log('Upload this file to https://verify.contentauthenticity.org/ to test');
