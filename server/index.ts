import express from 'express';
import cors from 'cors';
import { z } from 'zod';
import { signImageWithC2PA } from './c2paSigningService.js';
import type { C2PAExternalManifest } from '../src/types/c2pa.js';

const app = express();
const PORT = 3002;

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST']
}));
app.use(express.json({ limit: '10mb' }));

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'C2PA signing server' });
});

// Zod validation schema for sign-image request
const SignImageRequestSchema = z.object({
  image: z.string().min(1, 'Image is required'),
  manifest: z.object({
    '@context': z.string(),
    claim: z.object({
      'dc:format': z.string(),
      instanceId: z.string(),
      claimGenerator: z.string(),
      assertions: z.array(z.object({
        label: z.string(),
        data: z.unknown()
      }))
    })
  })
});

// POST /api/sign-image
// Accepts: { image: base64, manifest: C2PAExternalManifest }
// Returns: { signedImage: base64 }
app.post('/api/sign-image', async (req, res) => {
  try {
    // Validate request body with Zod
    const validationResult = SignImageRequestSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: validationResult.error.errors
      });
    }

    const { image, manifest } = validationResult.data as {
      image: string;
      manifest: C2PAExternalManifest;
    };

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
