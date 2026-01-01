export class CryptoService {
  private _publicKey: string | null = null;
  private _privateKey: CryptoKey | null = null;

  get publicKey(): string | null {
    return this._publicKey;
  }

  get privateKey(): CryptoKey | null {
    return this._privateKey;
  }

  /**
   * Initialize crypto keys (generate ECDSA keypair)
   */
  async initialize(): Promise<{ publicKey: string; privateKey: CryptoKey }> {
    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: 'ECDSA',
        namedCurve: 'P-256'
      },
      true, // extractable
      ['sign', 'verify']
    );

    this._privateKey = keyPair.privateKey;

    // Export public key to JWK format for storage/transmission
    const publicKeyJwk = await window.crypto.subtle.exportKey(
      'jwk',
      keyPair.publicKey
    );
    this._publicKey = JSON.stringify(publicKeyJwk);

    return {
      publicKey: this._publicKey,
      privateKey: this._privateKey
    };
  }

  /**
   * Compute SHA-256 hash
   */
  async hash(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', dataBuffer);
    return this.bufferToHex(hashBuffer);
  }

  /**
   * Compute canonical hash of object (for bundle hash)
   */
  async hashObject(obj: object): Promise<string> {
    // Canonical JSON: recursively sorted keys
    const canonical = this.canonicalStringify(obj);
    return this.hash(canonical);
  }

  /**
   * Recursively sort object keys for deterministic JSON
   */
  canonicalStringify(obj: any): string {
    if (obj === null || typeof obj !== 'object') {
      return JSON.stringify(obj);
    }

    if (Array.isArray(obj)) {
      return '[' + obj.map(item => this.canonicalStringify(item)).join(',') + ']';
    }

    const sortedKeys = Object.keys(obj).sort();
    const pairs = sortedKeys.map(key => {
      const value = this.canonicalStringify(obj[key]);
      return `"${key}":${value}`;
    });

    return '{' + pairs.join(',') + '}';
  }

  /**
   * Convert UTF-8 string to Base64 (Unicode-safe)
   * Uses URI encoding to handle non-Latin1 characters
   */
  static utf8ToBase64(str: string): string {
    return btoa(unescape(encodeURIComponent(str)));
  }

  /**
   * Convert Base64 to UTF-8 string (Unicode-safe)
   * Uses URI decoding to handle non-Latin1 characters
   */
  static base64ToUtf8(base64: string): string {
    return decodeURIComponent(escape(atob(base64)));
  }

  /**
   * Sign data with private key
   */
  async sign(data: string, privateKey: CryptoKey): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);

    const signature = await window.crypto.subtle.sign(
      {
        name: 'ECDSA',
        hash: { name: 'SHA-256' }
      },
      privateKey,
      dataBuffer
    );

    return this.bufferToBase64(signature);
  }

  /**
   * Verify signature with public key
   */
  async verify(data: string, signature: string, publicKeyJwk: string): Promise<boolean> {
    try {
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);
      const signatureBuffer = this.base64ToBuffer(signature);

      // Import public key from JWK
      const publicKey = await window.crypto.subtle.importKey(
        'jwk',
        JSON.parse(publicKeyJwk),
        {
          name: 'ECDSA',
          namedCurve: 'P-256'
        },
        true,
        ['verify']
      );

      const isValid = await window.crypto.subtle.verify(
        {
          name: 'ECDSA',
          hash: { name: 'SHA-256' }
        },
        publicKey,
        signatureBuffer,
        dataBuffer
      );

      return isValid;
    } catch (error) {
      console.error('Signature verification failed:', error);
      return false;
    }
  }

  /**
   * Export public key to JWK format
   */
  exportPublicKey(): string | null {
    return this._publicKey;
  }

  /**
   * Convert ArrayBuffer to hex string
   */
  bufferToHex(buffer: ArrayBuffer): string {
    const byteArray = new Uint8Array(buffer);
    const hexCodes = Array.from(byteArray).map(byte => {
      const hex = byte.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    });
    return hexCodes.join('');
  }

  /**
   * Convert ArrayBuffer to Base64 string
   */
  bufferToBase64(buffer: ArrayBuffer): string {
    const byteArray = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < byteArray.byteLength; i++) {
      binary += String.fromCharCode(byteArray[i]);
    }
    return btoa(binary);
  }

  /**
   * Convert Base64 string to ArrayBuffer
   */
  base64ToBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

// Export singleton instance
export const cryptoService = new CryptoService();
