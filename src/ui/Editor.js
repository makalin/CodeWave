import * as monaco from 'monaco-editor';
import { nanoid } from 'nanoid';

export class Editor {
  constructor(containerSelector, options) {
    this.container = document.querySelector(containerSelector);
    this.options = options;
    this.editor = null;
    this.aiSuggestions = [];
    this.collaborationSession = null;
    this.sessionId = nanoid();
    
    this.init();
  }

  async init() {
    await this.setupMonaco();
    this.setupEventListeners();
    this.setupAIIntegration();
    this.setupCollaboration();
    this.loadLastSession();
  }

  async setupMonaco() {
    // Configure Monaco Editor
    monaco.editor.defineTheme('codewave-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: '7fdfff' },
        { token: 'register', foreground: 'ffb86c' },
        { token: 'comment', foreground: '6a9955' },
        { token: 'string', foreground: 'ce9178' },
        { token: 'number', foreground: 'b5cea8' },
        { token: 'hex', foreground: 'b5cea8' }
      ],
      colors: {
        'editor.background': '#181c20',
        'editor.foreground': '#e0e6ed',
        'editor.lineHighlightBackground': '#23272e',
        'editorCursor.foreground': '#7fdfff',
        'editorWhitespace.foreground': '#3a4452'
      }
    });

    // Create editor instance
    this.editor = monaco.editor.create(this.container, {
      value: this.getDefaultCode(),
      language: 'x86asm',
      theme: 'codewave-dark',
      fontSize: 14,
      fontFamily: 'Fira Mono, Consolas, monospace',
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      automaticLayout: true,
      wordWrap: 'on',
      lineNumbers: 'on',
      folding: true,
      selectOnLineNumbers: true,
      roundedSelection: false,
      readOnly: false,
      cursorStyle: 'line',
      automaticLayout: true,
      contextmenu: true,
      mouseWheelZoom: true,
      suggestOnTriggerCharacters: true,
      quickSuggestions: {
        other: true,
        comments: false,
        strings: false
      }
    });

    // Set up language support
    this.setupLanguageSupport();
  }

  setupLanguageSupport() {
    // X86 Assembly language configuration
    monaco.languages.register({ id: 'x86asm' });
    
    monaco.languages.setMonarchTokensProvider('x86asm', {
      keywords: [
        'mov', 'add', 'sub', 'mul', 'div', 'inc', 'dec',
        'and', 'or', 'xor', 'not', 'shl', 'shr', 'rol', 'ror',
        'jmp', 'je', 'jne', 'jg', 'jl', 'jge', 'jle', 'ja', 'jb',
        'call', 'ret', 'push', 'pop', 'int', 'iret',
        'cmp', 'test', 'loop', 'loope', 'loopne'
      ],
      
      registers: [
        'eax', 'ebx', 'ecx', 'edx', 'esi', 'edi', 'esp', 'ebp',
        'ax', 'bx', 'cx', 'dx', 'si', 'di', 'sp', 'bp',
        'al', 'ah', 'bl', 'bh', 'cl', 'ch', 'dl', 'dh'
      ],

      tokenizer: {
        root: [
          [/[a-zA-Z_]\w*/, {
            cases: {
              '@keywords': 'keyword',
              '@registers': 'register',
              '@default': 'identifier'
            }
          }],
          [/0x[0-9a-fA-F]+/, 'hex'],
          [/\d+/, 'number'],
          [/;.*$/, 'comment'],
          [/["'].*["']/, 'string'],
          [/[+\-*\/=<>!&|^~%]/, 'operator'],
          [/[{}()\[\]]/, 'delimiter']
        ]
      }
    });

    // Auto-completion
    monaco.languages.registerCompletionItemProvider('x86asm', {
      provideCompletionItems: (model, position) => {
        const suggestions = [
          ...this.options.assemblers.get('x86').getSyntaxHighlighting().keywords.map(keyword => ({
            label: keyword,
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: keyword,
            documentation: `x86 instruction: ${keyword}`
          })),
          ...this.options.assemblers.get('x86').getSyntaxHighlighting().registers.map(reg => ({
            label: reg,
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: reg,
            documentation: `x86 register: ${reg}`
          }))
        ];

        return { suggestions };
      }
    });
  }

  setupEventListeners() {
    // Code change events
    this.editor.onDidChangeModelContent(() => {
      this.handleCodeChange();
    });

    // Keyboard shortcuts
    this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      this.saveSession();
    });

    this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyR, () => {
      this.runCode();
    });

    this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyD, () => {
      this.debugCode();
    });

    this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyL, () => {
      this.requestAISuggestion();
    });

    // Listen to app events
    this.options.eventBus.on('code:result', this.handleCodeResult.bind(this));
    this.options.eventBus.on('debug:result', this.handleDebugResult.bind(this));
    this.options.eventBus.on('ai:response', this.handleAIResponse.bind(this));
    this.options.eventBus.on('session:loaded', this.handleSessionLoaded.bind(this));
  }

  setupAIIntegration() {
    // AI suggestion widget
    this.aiWidget = document.createElement('div');
    this.aiWidget.className = 'ai-suggestion-widget';
    this.aiWidget.style.display = 'none';
    this.container.appendChild(this.aiWidget);

    // Debounced AI requests
    this.aiRequestTimeout = null;
  }

  setupCollaboration() {
    // WebRTC collaboration setup
    if (this.options.collaboration) {
      this.collaborationSession = this.options.collaboration;
      this.setupCollaborationEvents();
    }
  }

  setupCollaborationEvents() {
    this.collaborationSession.on('code:update', (data) => {
      if (data.sessionId !== this.sessionId) {
        this.applyRemoteChange(data);
      }
    });

    this.collaborationSession.on('cursor:update', (data) => {
      if (data.sessionId !== this.sessionId) {
        this.updateRemoteCursor(data);
      }
    });
  }

  handleCodeChange() {
    const code = this.editor.getValue();
    
    // Save to storage
    this.saveToStorage(code);
    
    // Send to collaboration
    if (this.collaborationSession) {
      this.collaborationSession.send('code:update', {
        sessionId: this.sessionId,
        code: code,
        timestamp: Date.now()
      });
    }

    // Debounced AI suggestions
    if (this.aiRequestTimeout) {
      clearTimeout(this.aiRequestTimeout);
    }
    
    this.aiRequestTimeout = setTimeout(() => {
      this.requestAISuggestion();
    }, 2000);
  }

  async requestAISuggestion() {
    const code = this.editor.getValue();
    if (!code.trim()) return;

    try {
      const suggestion = await this.options.ai.getCodeCompletion(code, 'x86');
      this.showAISuggestion(suggestion);
    } catch (error) {
      console.warn('AI suggestion failed:', error);
    }
  }

  showAISuggestion(suggestion) {
    this.aiWidget.innerHTML = `
      <div class="ai-suggestion-header">
        <span>🤖 AI Suggestion</span>
        <button onclick="this.parentElement.parentElement.style.display='none'">×</button>
      </div>
      <div class="ai-suggestion-content">
        <pre>${suggestion}</pre>
        <button onclick="this.applyAISuggestion('${suggestion.replace(/'/g, "\\'")}')">Apply</button>
      </div>
    `;
    this.aiWidget.style.display = 'block';
  }

  applyAISuggestion(suggestion) {
    const currentValue = this.editor.getValue();
    this.editor.setValue(currentValue + '\n' + suggestion);
    this.aiWidget.style.display = 'none';
  }

  runCode() {
    const code = this.editor.getValue();
    const architecture = 'x86'; // Default for now
    
    this.options.eventBus.emit('code:run', { code, architecture });
  }

  debugCode() {
    const code = this.editor.getValue();
    const architecture = 'x86'; // Default for now
    
    this.options.eventBus.emit('code:debug', { code, architecture });
  }

  handleCodeResult(data) {
    // Display results in output panel
    this.showOutput('Machine Code', data.machineCode);
    this.showOutput('Registers', JSON.stringify(data.result.registers, null, 2));
  }

  handleDebugResult(data) {
    // Display debug information
    this.showDebugInfo(data);
  }

  handleAIResponse(data) {
    // Handle AI responses
    console.log('AI Response:', data);
  }

  handleSessionLoaded(session) {
    if (session.code) {
      this.editor.setValue(session.code);
    }
  }

  showOutput(title, content) {
    // Create or update output panel
    let outputPanel = document.getElementById('output-panel');
    if (!outputPanel) {
      outputPanel = document.createElement('div');
      outputPanel.id = 'output-panel';
      outputPanel.className = 'output-panel';
      document.body.appendChild(outputPanel);
    }

    outputPanel.innerHTML = `
      <div class="output-header">
        <h3>${title}</h3>
        <button onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
      <div class="output-content">
        <pre>${content}</pre>
      </div>
    `;
  }

  showDebugInfo(debugInfo) {
    // Create debug panel with step-by-step execution
    let debugPanel = document.getElementById('debug-panel');
    if (!debugPanel) {
      debugPanel = document.createElement('div');
      debugPanel.id = 'debug-panel';
      debugPanel.className = 'debug-panel';
      document.body.appendChild(debugPanel);
    }

    const steps = debugInfo.map((step, index) => `
      <div class="debug-step">
        <h4>Step ${index + 1}</h4>
        <div class="debug-registers">
          <strong>Registers:</strong>
          <pre>${JSON.stringify(step.after.registers, null, 2)}</pre>
        </div>
        <div class="debug-flags">
          <strong>Flags:</strong>
          <pre>${JSON.stringify(step.after.flags, null, 2)}</pre>
        </div>
      </div>
    `).join('');

    debugPanel.innerHTML = `
      <div class="debug-header">
        <h3>Debug Information</h3>
        <button onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
      <div class="debug-content">
        ${steps}
      </div>
    `;
  }

  saveSession() {
    const code = this.editor.getValue();
    this.options.eventBus.emit('storage:save', {
      code,
      timestamp: Date.now(),
      sessionId: this.sessionId
    });
  }

  saveToStorage(code) {
    localStorage.setItem('codewave_last_code', code);
  }

  loadLastSession() {
    const lastCode = localStorage.getItem('codewave_last_code');
    if (lastCode) {
      this.editor.setValue(lastCode);
    }
  }

  getDefaultCode() {
    return `; CodeWave - x86 Assembly Example
; Add two numbers and store result in eax

mov eax, 5      ; Load first number
mov ebx, 3      ; Load second number
add eax, ebx    ; Add them together
int 0x80        ; System call (Linux)`;
  }

  applyRemoteChange(data) {
    // Apply changes from collaboration
    this.editor.setValue(data.code);
  }

  updateRemoteCursor(data) {
    // Update remote cursor position
    // Implementation depends on collaboration service
  }

  getValue() {
    return this.editor.getValue();
  }

  setValue(value) {
    this.editor.setValue(value);
  }

  focus() {
    this.editor.focus();
  }

  destroy() {
    if (this.editor) {
      this.editor.dispose();
    }
    if (this.aiRequestTimeout) {
      clearTimeout(this.aiRequestTimeout);
    }
  }
} 