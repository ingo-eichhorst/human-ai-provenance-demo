import express from 'express';
import cors from 'cors';
import { signImageWithC2PA } from './c2paSigningService.js';
import type { C2PAExternalManifest } from '../src/types/c2pa.js';

const app = express();
const PORT = 3002;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'C2PA signing server' });
});

// POST /api/sign-image
// Accepts: { image: base64, manifest: C2PAExternalManifest }
// Returns: { signedImage: base64 }
app.post('/api/sign-image', async (req, res) => {
  try {
    const { image, manifest } = req.body as {
      image: string;
      manifest: C2PAExternalManifest;
    };

    if (!image || !manifest) {
      return res.status(400).json({ error: 'Missing image or manifest in request body' });
    }

    // Convert base64 to buffer
    const imageBuffer = Buffer.from(image, 'base64');

    // Sign image with C2PA manifest
    const signedImageBuffer = await signImageWithC2PA(
      imageBuffer,
      manifest,
      './server/certs/cert.pem',
      './server/certs/private.pem'
    );

    // Convert back to base64
    const signedImageBase64 = signedImageBuffer.toString('base64');

    res.json({ signedImage: signedImageBase64 });
  } catch (error) {
    console.error('Error signing image:', error);
    res.status(500).json({
      error: 'Failed to sign image',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

app.listen(PORT, () => {
  console.log(`C2PA signing server running on http://localhost:${PORT}`);
});
