import { Editor } from '../ui/Editor.js';
import { AIService } from '../ai/AIService.js';
import { AssemblerManager } from '../assemblers/AssemblerManager.js';
import { EmulatorManager } from '../emulators/EmulatorManager.js';
import { CollaborationService } from '../core/CollaborationService.js';
import { StorageService } from '../storage/StorageService.js';
import { EventBus } from '../utils/EventBus.js';

export class App {
  constructor() {
    this.eventBus = new EventBus();
    this.storage = new StorageService();
    this.ai = new AIService();
    this.assemblers = new AssemblerManager();
    this.emulators = new EmulatorManager();
    this.collaboration = new CollaborationService();
    this.editor = null;
    
    this.init();
  }

  async init() {
    try {
      // Initialize core services
      await this.storage.init();
      await this.ai.init();
      await this.assemblers.init();
      await this.emulators.init();
      
      // Initialize UI
      this.editor = new Editor('#editor-container', {
        eventBus: this.eventBus,
        ai: this.ai,
        assemblers: this.assemblers,
        emulators: this.emulators,
        storage: this.storage
      });

      // Set up event listeners
      this.setupEventListeners();
      
      // Load last session
      await this.loadLastSession();
      
      console.log('CodeWave initialized successfully');
    } catch (error) {
      console.error('Failed to initialize CodeWave:', error);
      this.showError('Initialization failed: ' + error.message);
    }
  }

  setupEventListeners() {
    this.eventBus.on('code:run', this.handleCodeRun.bind(this));
    this.eventBus.on('code:debug', this.handleCodeDebug.bind(this));
    this.eventBus.on('ai:request', this.handleAIRequest.bind(this));
    this.eventBus.on('collaboration:join', this.handleCollaborationJoin.bind(this));
    this.eventBus.on('storage:save', this.handleSave.bind(this));
  }

  async handleCodeRun(data) {
    try {
      const { code, architecture } = data;
      const assembler = this.assemblers.get(architecture);
      const emulator = this.emulators.get(architecture);
      
      const machineCode = await assembler.assemble(code);
      const result = await emulator.run(machineCode);
      
      this.eventBus.emit('code:result', { machineCode, result });
    } catch (error) {
      this.eventBus.emit('error', error);
    }
  }

  async handleCodeDebug(data) {
    try {
      const { code, architecture } = data;
      const assembler = this.assemblers.get(architecture);
      const emulator = this.emulators.get(architecture);
      
      const machineCode = await assembler.assemble(code);
      const debugInfo = await emulator.debug(machineCode);
      
      this.eventBus.emit('debug:result', debugInfo);
    } catch (error) {
      this.eventBus.emit('error', error);
    }
  }

  async handleAIRequest(data) {
    try {
      const { prompt, context } = data;
      const response = await this.ai.getSuggestion(prompt, context);
      this.eventBus.emit('ai:response', response);
    } catch (error) {
      this.eventBus.emit('error', error);
    }
  }

  async handleCollaborationJoin(data) {
    try {
      const { roomId } = data;
      await this.collaboration.joinRoom(roomId);
      this.eventBus.emit('collaboration:joined', { roomId });
    } catch (error) {
      this.eventBus.emit('error', error);
    }
  }

  async handleSave(data) {
    try {
      await this.storage.saveSession(data);
      this.eventBus.emit('storage:saved');
    } catch (error) {
      this.eventBus.emit('error', error);
    }
  }

  async loadLastSession() {
    try {
      const session = await this.storage.getLastSession();
      if (session) {
        this.eventBus.emit('session:loaded', session);
      }
    } catch (error) {
      console.warn('Failed to load last session:', error);
    }
  }

  showError(message) {
    // Create error notification
    const notification = document.createElement('div');
    notification.className = 'error-notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 5000);
  }

  destroy() {
    this.eventBus.off('code:run');
    this.eventBus.off('code:debug');
    this.eventBus.off('ai:request');
    this.eventBus.off('collaboration:join');
    this.eventBus.off('storage:save');
    
    this.editor?.destroy();
    this.collaboration?.disconnect();
  }
} 