import { nanoid } from 'nanoid';

export class AIService {
  constructor() {
    this.providers = new Map();
    this.config = {
      defaultProvider: 'grok3',
      fallbackProvider: 'openai',
      maxRetries: 3,
      timeout: 30000,
      apiKeys: {}
    };
    this.conversationHistory = [];
  }

  async init() {
    // Load configuration from storage
    const savedConfig = localStorage.getItem('codewave_ai_config');
    if (savedConfig) {
      this.config = { ...this.config, ...JSON.parse(savedConfig) };
    }

    // Initialize providers
    await this.initializeProviders();
  }

  async initializeProviders() {
    // Grok 3 (xAI)
    this.providers.set('grok3', {
      name: 'Grok 3',
      async request(prompt, context) {
        const response = await fetch('https://api.x.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.apiKeys.grok3}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'grok-3',
            messages: [
              {
                role: 'system',
                content: 'You are an expert assembly language and low-level programming assistant. Provide clear, accurate, and helpful responses about x86, ARM, RISC-V assembly, machine code, and computer architecture.'
              },
              {
                role: 'user',
                content: `Context: ${context}\n\nQuestion: ${prompt}`
              }
            ],
            max_tokens: 1000,
            temperature: 0.3
          })
        });

        if (!response.ok) {
          throw new Error(`Grok 3 API error: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
      }
    });

    // OpenAI GPT-4
    this.providers.set('openai', {
      name: 'OpenAI GPT-4',
      async request(prompt, context) {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.apiKeys.openai}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4',
            messages: [
              {
                role: 'system',
                content: 'You are an expert assembly language and low-level programming assistant. Provide clear, accurate, and helpful responses about x86, ARM, RISC-V assembly, machine code, and computer architecture.'
              },
              {
                role: 'user',
                content: `Context: ${context}\n\nQuestion: ${prompt}`
              }
            ],
            max_tokens: 1000,
            temperature: 0.3
          })
        });

        if (!response.ok) {
          throw new Error(`OpenAI API error: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
      }
    });

    // Anthropic Claude
    this.providers.set('claude', {
      name: 'Anthropic Claude',
      async request(prompt, context) {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': this.config.apiKeys.claude,
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: 'claude-3-sonnet-20240229',
            max_tokens: 1000,
            messages: [
              {
                role: 'user',
                content: `You are an expert assembly language and low-level programming assistant. Provide clear, accurate, and helpful responses about x86, ARM, RISC-V assembly, machine code, and computer architecture.\n\nContext: ${context}\n\nQuestion: ${prompt}`
              }
            ]
          })
        });

        if (!response.ok) {
          throw new Error(`Claude API error: ${response.status}`);
        }

        const data = await response.json();
        return data.content[0].text;
      }
    });

    // Local model (placeholder for future integration)
    this.providers.set('local', {
      name: 'Local Model',
      async request(prompt, context) {
        // Placeholder for local model integration
        throw new Error('Local model not yet implemented');
      }
    });
  }

  async getSuggestion(prompt, context = '') {
    const requestId = nanoid();
    const timestamp = Date.now();

    // Add to conversation history
    this.conversationHistory.push({
      id: requestId,
      timestamp,
      prompt,
      context,
      provider: this.config.defaultProvider
    });

    // Try primary provider
    let response = null;
    let error = null;

    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      try {
        const providers = [this.config.defaultProvider];
        if (attempt > 0 && this.config.fallbackProvider) {
          providers.push(this.config.fallbackProvider);
        }

        for (const providerName of providers) {
          const provider = this.providers.get(providerName);
          if (!provider) continue;

          try {
            response = await provider.request(prompt, context);
            break;
          } catch (e) {
            console.warn(`Provider ${providerName} failed:`, e);
            error = e;
          }
        }

        if (response) break;
      } catch (e) {
        error = e;
        await this.delay(1000 * (attempt + 1)); // Exponential backoff
      }
    }

    if (!response) {
      throw new Error(`All AI providers failed: ${error?.message || 'Unknown error'}`);
    }

    // Update conversation history
    const historyEntry = this.conversationHistory.find(h => h.id === requestId);
    if (historyEntry) {
      historyEntry.response = response;
      historyEntry.success = true;
    }

    return {
      id: requestId,
      response,
      provider: this.config.defaultProvider,
      timestamp
    };
  }

  async getCodeCompletion(code, language = 'x86') {
    const prompt = `Complete this ${language} assembly code:\n\n${code}\n\nProvide only the completed code without explanations.`;
    const context = `Language: ${language} assembly`;
    
    const result = await this.getSuggestion(prompt, context);
    return result.response;
  }

  async getCodeExplanation(code, language = 'x86') {
    const prompt = `Explain this ${language} assembly code line by line:\n\n${code}`;
    const context = `Language: ${language} assembly`;
    
    const result = await this.getSuggestion(prompt, context);
    return result.response;
  }

  async getOptimizationSuggestion(code, language = 'x86') {
    const prompt = `Suggest optimizations for this ${language} assembly code:\n\n${code}`;
    const context = `Language: ${language} assembly, focus on performance optimization`;
    
    const result = await this.getSuggestion(prompt, context);
    return result.response;
  }

  async getBugDetection(code, language = 'x86') {
    const prompt = `Analyze this ${language} assembly code for potential bugs or issues:\n\n${code}`;
    const context = `Language: ${language} assembly, focus on bug detection and security issues`;
    
    const result = await this.getSuggestion(prompt, context);
    return result.response;
  }

  setApiKey(provider, key) {
    this.config.apiKeys[provider] = key;
    localStorage.setItem('codewave_ai_config', JSON.stringify(this.config));
  }

  getApiKey(provider) {
    return this.config.apiKeys[provider];
  }

  setDefaultProvider(provider) {
    if (this.providers.has(provider)) {
      this.config.defaultProvider = provider;
      localStorage.setItem('codewave_ai_config', JSON.stringify(this.config));
    }
  }

  getProviders() {
    return Array.from(this.providers.keys()).map(key => ({
      key,
      name: this.providers.get(key).name
    }));
  }

  getConversationHistory() {
    return this.conversationHistory;
  }

  clearConversationHistory() {
    this.conversationHistory = [];
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
} 