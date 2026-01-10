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
 * Create LLM provider based on environment configuration
 * @param {Object} env - Environment variables
 * @returns {LLMProvider|null} - Configured LLM provider or null
 */
export function createLLMProvider(env) {
  // Use OpenAI if configured
  if (env.OPENAI_API_KEY) {
    return new OpenAIProvider(env.OPENAI_API_KEY, env.OPENAI_MODEL || "gpt-4o-mini");
  }

  // Return null if no provider configured (will use stub)
  return null;
}
