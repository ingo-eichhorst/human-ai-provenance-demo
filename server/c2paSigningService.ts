import { readFileSync, writeFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { Builder, LocalSigner } from '@contentauth/c2pa-node';
import type { C2PAExternalManifest } from '../src/types/c2pa.js';

/**
 * Sign an image buffer with C2PA manifest using local certificate
 */
export async function signImageWithC2PA(
  imageBuffer: Buffer,
  manifest: C2PAExternalManifest,
  certPath: string,
  keyPath: string
): Promise<Buffer> {
  const certificate = readFileSync(certPath);
  const privateKey = readFileSync(keyPath);
  const signer = LocalSigner.newSigner(
    certificate,
    privateKey,
    'es256',
    'http://timestamp.digicert.com'  // Add TSA timestamping
  );

  const tempDir = tmpdir();
  const inputPath = join(tempDir, `c2pa-input-${Date.now()}.png`);
  const outputPath = join(tempDir, `c2pa-output-${Date.now()}.png`);

  try {
    writeFileSync(inputPath, imageBuffer);

    // Build proper c2pa-node manifest definition
    const c2paActions = manifest.claim.assertions
      .find(a => a.label === 'c2pa.actions')?.data as { actions: unknown[] } | undefined;

    const manifestDefinition = {
      claim_generator: manifest.claim.claimGenerator,
      claim_generator_info: manifest.claim.claimGeneratorInfo
        ? [manifest.claim.claimGeneratorInfo]
        : [{ name: 'Human+AI Provenance Demo', version: '1.0.0' }],
      title: 'Human+AI Document',
      format: 'image/png',
      assertions: c2paActions
        ? [{ label: 'c2pa.actions', data: c2paActions }]
        : [],
    };

    const builder = Builder.withJson(manifestDefinition);
    builder.sign(signer, { path: inputPath }, { path: outputPath });

    return readFileSync(outputPath);
  } catch (error) {
    console.error('C2PA signing error:', error);
    throw new Error(`Failed to sign image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    try {
      unlinkSync(inputPath);
    } catch (err) {
      console.warn(`Failed to clean up temp input file ${inputPath}:`, err instanceof Error ? err.message : err);
    }
    try {
      unlinkSync(outputPath);
    } catch (err) {
      console.warn(`Failed to clean up temp output file ${outputPath}:`, err instanceof Error ? err.message : err);
    }
  }
}
