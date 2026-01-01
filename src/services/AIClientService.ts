import { CryptoService } from './CryptoService';

export interface AIRewriteResponse {
  rewrittenText: string;
  model: string;
  promptHash: string;
  responseHash: string;
}

export class AIClientService {
  private apiKey: string | null = null;

  constructor(private cryptoService: CryptoService) {}

  /**
   * Set OpenAI API key
   */
  setApiKey(key: string): void {
    this.apiKey = key;
  }

  /**
   * Handle API error responses with appropriate error messages
   */
  private async handleApiError(response: Response): Promise<never> {
    const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
    const errorMessage = errorData.error?.message || 'Unknown error';

    if (response.status === 401) {
      throw new Error('Invalid API key - Please check your OpenAI API key');
    } else if (response.status === 429) {
      throw new Error('Rate limit exceeded - Please try again later');
    } else if (response.status >= 500) {
      throw new Error('OpenAI service error - Please try again');
    } else {
      throw new Error(`OpenAI API error: ${errorMessage}`);
    }
  }

  /**
   * Generate text from a prompt (for starter prompts)
   */
  async generateFromPrompt(promptText: string): Promise<AIRewriteResponse> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful creative writing assistant. Generate high-quality text based on the user\'s request.'
          },
          {
            role: 'user',
            content: promptText
          }
        ],
        temperature: 0.8,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      await this.handleApiError(response);
    }

    const data = await response.json();

    // Validate response structure
    if (!data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
      throw new Error('Invalid API response: missing choices array');
    }
    if (!data.choices[0].message || typeof data.choices[0].message.content !== 'string') {
      throw new Error('Invalid API response: missing message content');
    }

    const generatedText = data.choices[0].message.content.trim();

    // Compute hashes
    const promptHash = await this.cryptoService.hash(promptText);
    const responseHash = await this.cryptoService.hash(generatedText);

    return {
      rewrittenText: generatedText,
      model: 'gpt-4o-mini',
      promptHash,
      responseHash
    };
  }

  /**
   * Rewrite text with AI (can be selected text or full document)
   */
  async rewriteText(
    text: string,
    instruction: string
  ): Promise<AIRewriteResponse> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Construct prompt
    const prompt = `Rewrite the following text according to this instruction: ${instruction}\n\nOriginal text:\n${text}\n\nReturn only the rewritten text without any surrounding quotes:`;

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful text rewriting assistant. Only return the rewritten text, nothing else.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      await this.handleApiError(response);
    }

    const data = await response.json();

    // Validate response structure
    if (!data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
      throw new Error('Invalid API response: missing choices array');
    }
    if (!data.choices[0].message || typeof data.choices[0].message.content !== 'string') {
      throw new Error('Invalid API response: missing message content');
    }

    const rewrittenText = data.choices[0].message.content.trim();

    // Compute hashes
    const promptHash = await this.cryptoService.hash(prompt);
    const responseHash = await this.cryptoService.hash(rewrittenText);

    return {
      rewrittenText,
      model: 'gpt-4o-mini',
      promptHash,
      responseHash
    };
  }
}

// Export factory function
export function createAIClientService(cryptoService: CryptoService): AIClientService {
  return new AIClientService(cryptoService);
}
