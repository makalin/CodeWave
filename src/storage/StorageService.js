import Dexie from 'dexie';

export class StorageService {
  constructor() {
    this.db = null;
    this.init();
  }

  async init() {
    this.db = new Dexie('CodeWaveDB');
    
    this.db.version(1).stores({
      sessions: '++id, timestamp, name, architecture',
      snippets: '++id, name, code, architecture, tags',
      settings: 'key',
      aiHistory: '++id, timestamp, prompt, response, provider'
    });

    // Add indexes for better performance
    this.db.version(2).stores({
      sessions: '++id, timestamp, name, architecture, *tags',
      snippets: '++id, name, code, architecture, *tags, timestamp',
      settings: 'key',
      aiHistory: '++id, timestamp, prompt, response, provider, *tags'
    });

    await this.db.open();
  }

  // Session management
  async saveSession(sessionData) {
    try {
      const session = {
        timestamp: sessionData.timestamp || Date.now(),
        name: sessionData.name || `Session ${new Date().toLocaleString()}`,
        code: sessionData.code,
        architecture: sessionData.architecture || 'x86',
        tags: sessionData.tags || [],
        sessionId: sessionData.sessionId
      };

      const id = await this.db.sessions.add(session);
      return { id, ...session };
    } catch (error) {
      console.error('Failed to save session:', error);
      throw error;
    }
  }

  async getLastSession() {
    try {
      const session = await this.db.sessions
        .orderBy('timestamp')
        .reverse()
        .first();
      return session;
    } catch (error) {
      console.error('Failed to get last session:', error);
      return null;
    }
  }

  async getSessions(limit = 50) {
    try {
      return await this.db.sessions
        .orderBy('timestamp')
        .reverse()
        .limit(limit)
        .toArray();
    } catch (error) {
      console.error('Failed to get sessions:', error);
      return [];
    }
  }

  async deleteSession(id) {
    try {
      await this.db.sessions.delete(id);
    } catch (error) {
      console.error('Failed to delete session:', error);
      throw error;
    }
  }

  // Snippet management
  async saveSnippet(snippetData) {
    try {
      const snippet = {
        name: snippetData.name,
        code: snippetData.code,
        architecture: snippetData.architecture || 'x86',
        tags: snippetData.tags || [],
        timestamp: Date.now(),
        description: snippetData.description || ''
      };

      const id = await this.db.snippets.add(snippet);
      return { id, ...snippet };
    } catch (error) {
      console.error('Failed to save snippet:', error);
      throw error;
    }
  }

  async getSnippets(architecture = null) {
    try {
      let query = this.db.snippets.orderBy('timestamp').reverse();
      if (architecture) {
        query = query.filter(snippet => snippet.architecture === architecture);
      }
      return await query.toArray();
    } catch (error) {
      console.error('Failed to get snippets:', error);
      return [];
    }
  }

  async searchSnippets(query) {
    try {
      return await this.db.snippets
        .filter(snippet => 
          snippet.name.toLowerCase().includes(query.toLowerCase()) ||
          snippet.code.toLowerCase().includes(query.toLowerCase()) ||
          snippet.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
        )
        .toArray();
    } catch (error) {
      console.error('Failed to search snippets:', error);
      return [];
    }
  }

  async deleteSnippet(id) {
    try {
      await this.db.snippets.delete(id);
    } catch (error) {
      console.error('Failed to delete snippet:', error);
      throw error;
    }
  }

  // Settings management
  async saveSetting(key, value) {
    try {
      await this.db.settings.put({ key, value });
    } catch (error) {
      console.error('Failed to save setting:', error);
      throw error;
    }
  }

  async getSetting(key, defaultValue = null) {
    try {
      const setting = await this.db.settings.get(key);
      return setting ? setting.value : defaultValue;
    } catch (error) {
      console.error('Failed to get setting:', error);
      return defaultValue;
    }
  }

  async getAllSettings() {
    try {
      const settings = await this.db.settings.toArray();
      return settings.reduce((acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      }, {});
    } catch (error) {
      console.error('Failed to get settings:', error);
      return {};
    }
  }

  // AI History management
  async saveAIHistory(historyData) {
    try {
      const history = {
        timestamp: Date.now(),
        prompt: historyData.prompt,
        response: historyData.response,
        provider: historyData.provider,
        tags: historyData.tags || [],
        code: historyData.code || ''
      };

      const id = await this.db.aiHistory.add(history);
      return { id, ...history };
    } catch (error) {
      console.error('Failed to save AI history:', error);
      throw error;
    }
  }

  async getAIHistory(limit = 100) {
    try {
      return await this.db.aiHistory
        .orderBy('timestamp')
        .reverse()
        .limit(limit)
        .toArray();
    } catch (error) {
      console.error('Failed to get AI history:', error);
      return [];
    }
  }

  async clearAIHistory() {
    try {
      await this.db.aiHistory.clear();
    } catch (error) {
      console.error('Failed to clear AI history:', error);
      throw error;
    }
  }

  // Export/Import functionality
  async exportData() {
    try {
      const data = {
        sessions: await this.db.sessions.toArray(),
        snippets: await this.db.snippets.toArray(),
        settings: await this.db.settings.toArray(),
        aiHistory: await this.db.aiHistory.toArray(),
        exportDate: new Date().toISOString()
      };

      return JSON.stringify(data, null, 2);
    } catch (error) {
      console.error('Failed to export data:', error);
      throw error;
    }
  }

  async importData(jsonData) {
    try {
      const data = JSON.parse(jsonData);
      
      // Clear existing data
      await this.db.sessions.clear();
      await this.db.snippets.clear();
      await this.db.settings.clear();
      await this.db.aiHistory.clear();

      // Import new data
      if (data.sessions) {
        await this.db.sessions.bulkAdd(data.sessions);
      }
      if (data.snippets) {
        await this.db.snippets.bulkAdd(data.snippets);
      }
      if (data.settings) {
        await this.db.settings.bulkAdd(data.settings);
      }
      if (data.aiHistory) {
        await this.db.aiHistory.bulkAdd(data.aiHistory);
      }

      return true;
    } catch (error) {
      console.error('Failed to import data:', error);
      throw error;
    }
  }

  // Database maintenance
  async compact() {
    try {
      // This is a placeholder for database compaction
      // In a real implementation, you might want to clean up old data
      const cutoffDate = Date.now() - (30 * 24 * 60 * 60 * 1000); // 30 days ago
      
      await this.db.sessions
        .where('timestamp')
        .below(cutoffDate)
        .delete();

      await this.db.aiHistory
        .where('timestamp')
        .below(cutoffDate)
        .delete();
    } catch (error) {
      console.error('Failed to compact database:', error);
    }
  }

  async getStats() {
    try {
      const [sessionCount, snippetCount, historyCount] = await Promise.all([
        this.db.sessions.count(),
        this.db.snippets.count(),
        this.db.aiHistory.count()
      ]);

      return {
        sessions: sessionCount,
        snippets: snippetCount,
        aiHistory: historyCount,
        totalSize: await this.getDatabaseSize()
      };
    } catch (error) {
      console.error('Failed to get database stats:', error);
      return null;
    }
  }

  async getDatabaseSize() {
    // This is a placeholder - actual implementation would depend on browser APIs
    return 'Unknown';
  }

  // Cleanup
  async destroy() {
    if (this.db) {
      await this.db.close();
      await Dexie.delete('CodeWaveDB');
    }
  }
} 