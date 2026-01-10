/**
 * LLM provider interface and implementations for reply suggestions
 */

/**
 * LLM provider interface
 * @interface LLMProvider
 */
export class LLMProvider {
  /**
   * Generate a suggested reply
   * @param {string} prompt - The prompt to send to the LLM
   * @returns {Promise<{draft: string, confidence: number}>}
   */
  async generateReply(_prompt) {
    throw new Error("Not implemented");
  }
}

/**
 * OpenAI provider implementation
 */
export class OpenAIProvider extends LLMProvider {
  /**
   * @param {string} apiKey - OpenAI API key
   * @param {string} model - Model to use (default: gpt-4o-mini)
   */
  constructor(apiKey, model = "gpt-4o-mini") {
    super();
    this.apiKey = apiKey;
    this.model = model;
    this.baseUrl = "https://api.openai.com/v1/chat/completions";
  }

  /**
   * Generate reply using OpenAI
   * @param {string} prompt - The prompt
   * @returns {Promise<{draft: string, confidence: number}>}
   */
  async generateReply(prompt) {
    if (!this.apiKey) {
      throw new Error("OpenAI API key not configured");
    }

    try {
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: "system",
              content:
                "You are a helpful assistant that generates professional, friendly, and concise email replies for property hosts responding to guest inquiries. Keep replies warm, helpful, and action-oriented.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 500,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenAI API error: ${response.status} ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      const draft = data.choices?.[0]?.message?.content?.trim() || "";

      if (!draft) {
        throw new Error("Empty response from OpenAI");
      }

      // Confidence based on presence of response (high if we got a response)
      return {
        draft,
        confidence: 0.85, // High confidence for LLM-generated responses
      };
    } catch (error) {
      console.error("OpenAI API error:", error);
      throw error;
    }
  }
}

/**
 * Anthropic (Claude) provider implementation
 */
export class AnthropicProvider extends LLMProvider {
  /**
   * @param {string} apiKey - Anthropic API key
   * @param {string} model - Model to use (default: claude-3-haiku-20240307)
   */
  constructor(apiKey, model = "claude-3-haiku-20240307") {
    super();
    this.apiKey = apiKey;
    this.model = model;
    this.baseUrl = "https://api.anthropic.com/v1/messages";
  }

  /**
   * Generate reply using Anthropic
   * @param {string} prompt - The prompt
   * @returns {Promise<{draft: string, confidence: number}>}
   */
  async generateReply(prompt) {
    if (!this.apiKey) {
      throw new Error("Anthropic API key not configured");
    }

    try {
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 500,
          system:
            "You are a helpful assistant that generates professional, friendly, and concise email replies for property hosts responding to guest inquiries. Keep replies warm, helpful, and action-oriented.",
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Anthropic API error: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      const draft = data.content?.[0]?.text?.trim() || "";

      if (!draft) {
        throw new Error("Empty response from Anthropic");
      }

      return {
        draft,
        confidence: 0.85, // High confidence for LLM-generated responses
      };
    } catch (error) {
      console.error("Anthropic API error:", error);
      throw error;
    }
  }
}

/**
 * Create LLM provider based on environment configuration
 * @param {Object} env - Environment variables
 * @returns {LLMProvider|null} - Configured LLM provider or null
 */
export function createLLMProvider(env) {
  // Prefer OpenAI if configured
  if (env.OPENAI_API_KEY) {
    return new OpenAIProvider(env.OPENAI_API_KEY, env.OPENAI_MODEL || "gpt-4o-mini");
  }

  // Fall back to Anthropic if configured
  if (env.ANTHROPIC_API_KEY) {
    return new AnthropicProvider(env.ANTHROPIC_API_KEY, env.ANTHROPIC_MODEL || "claude-3-haiku-20240307");
  }

  // Return null if no provider configured (will use stub)
  return null;
}
