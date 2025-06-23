export class X86Assembler {
  constructor() {
    this.instructions = new Map();
    this.registers = new Map();
    this.wasmModule = null;
    this.initializeInstructions();
    this.initializeRegisters();
  }

  async init() {
    // WASM module will be loaded by AssemblerManager
  }

  setWasmModule(module) {
    this.wasmModule = module;
  }

  initializeInstructions() {
    // Data transfer instructions
    this.instructions.set('mov', {
      opcode: 0x88,
      operands: ['reg', 'reg'],
      size: 2,
      description: 'Move data between registers or memory'
    });
    this.instructions.set('mov', {
      opcode: 0xB8,
      operands: ['reg', 'imm'],
      size: 5,
      description: 'Move immediate value to register'
    });

    // Arithmetic instructions
    this.instructions.set('add', {
      opcode: 0x01,
      operands: ['reg', 'reg'],
      size: 2,
      description: 'Add registers'
    });
    this.instructions.set('add', {
      opcode: 0x81,
      operands: ['reg', 'imm'],
      size: 6,
      description: 'Add immediate value to register'
    });

    this.instructions.set('sub', {
      opcode: 0x29,
      operands: ['reg', 'reg'],
      size: 2,
      description: 'Subtract registers'
    });
    this.instructions.set('sub', {
      opcode: 0x81,
      operands: ['reg', 'imm'],
      size: 6,
      description: 'Subtract immediate value from register'
    });

    // Logical instructions
    this.instructions.set('and', {
      opcode: 0x21,
      operands: ['reg', 'reg'],
      size: 2,
      description: 'Bitwise AND registers'
    });
    this.instructions.set('or', {
      opcode: 0x09,
      operands: ['reg', 'reg'],
      size: 2,
      description: 'Bitwise OR registers'
    });
    this.instructions.set('xor', {
      opcode: 0x31,
      operands: ['reg', 'reg'],
      size: 2,
      description: 'Bitwise XOR registers'
    });

    // Control flow
    this.instructions.set('jmp', {
      opcode: 0xE9,
      operands: ['label'],
      size: 5,
      description: 'Unconditional jump'
    });
    this.instructions.set('je', {
      opcode: 0x74,
      operands: ['label'],
      size: 2,
      description: 'Jump if equal'
    });
    this.instructions.set('jne', {
      opcode: 0x75,
      operands: ['label'],
      size: 2,
      description: 'Jump if not equal'
    });

    // Stack operations
    this.instructions.set('push', {
      opcode: 0x50,
      operands: ['reg'],
      size: 1,
      description: 'Push register onto stack'
    });
    this.instructions.set('pop', {
      opcode: 0x58,
      operands: ['reg'],
      size: 1,
      description: 'Pop register from stack'
    });

    // Function calls
    this.instructions.set('call', {
      opcode: 0xE8,
      operands: ['label'],
      size: 5,
      description: 'Call function'
    });
    this.instructions.set('ret', {
      opcode: 0xC3,
      operands: [],
      size: 1,
      description: 'Return from function'
    });

    // System calls
    this.instructions.set('int', {
      opcode: 0xCD,
      operands: ['imm'],
      size: 2,
      description: 'Software interrupt'
    });
  }

  initializeRegisters() {
    // 32-bit registers
    this.registers.set('eax', { code: 0, size: 32, description: 'Accumulator' });
    this.registers.set('ebx', { code: 3, size: 32, description: 'Base' });
    this.registers.set('ecx', { code: 1, size: 32, description: 'Counter' });
    this.registers.set('edx', { code: 2, size: 32, description: 'Data' });
    this.registers.set('esi', { code: 6, size: 32, description: 'Source Index' });
    this.registers.set('edi', { code: 7, size: 32, description: 'Destination Index' });
    this.registers.set('esp', { code: 4, size: 32, description: 'Stack Pointer' });
    this.registers.set('ebp', { code: 5, size: 32, description: 'Base Pointer' });

    // 16-bit registers
    this.registers.set('ax', { code: 0, size: 16, description: 'Accumulator (16-bit)' });
    this.registers.set('bx', { code: 3, size: 16, description: 'Base (16-bit)' });
    this.registers.set('cx', { code: 1, size: 16, description: 'Counter (16-bit)' });
    this.registers.set('dx', { code: 2, size: 16, description: 'Data (16-bit)' });

    // 8-bit registers
    this.registers.set('al', { code: 0, size: 8, description: 'Accumulator (8-bit low)' });
    this.registers.set('ah', { code: 4, size: 8, description: 'Accumulator (8-bit high)' });
    this.registers.set('bl', { code: 3, size: 8, description: 'Base (8-bit low)' });
    this.registers.set('bh', { code: 7, size: 8, description: 'Base (8-bit high)' });
    this.registers.set('cl', { code: 1, size: 8, description: 'Counter (8-bit low)' });
    this.registers.set('ch', { code: 5, size: 8, description: 'Counter (8-bit high)' });
    this.registers.set('dl', { code: 2, size: 8, description: 'Data (8-bit low)' });
    this.registers.set('dh', { code: 6, size: 8, description: 'Data (8-bit high)' });
  }

  async assemble(code) {
    if (this.wasmModule) {
      // Use WASM module for assembly
      return this.wasmModule.assemble(code);
    }

    // Fallback to JavaScript implementation
    return this.assembleJS(code);
  }

  assembleJS(code) {
    const lines = code.split('\n');
    const machineCode = [];
    const labels = new Map();
    const labelRefs = [];

    // First pass: collect labels
    let address = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.includes(':')) {
        const [label] = line.split(':');
        labels.set(label.trim(), address);
      } else if (line && !line.startsWith(';')) {
        const instruction = this.parseInstruction(line);
        if (instruction) {
          address += instruction.size;
        }
      }
    }

    // Second pass: generate machine code
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith(';') || trimmedLine.includes(':')) {
        continue;
      }

      const instruction = this.parseInstruction(trimmedLine);
      if (instruction) {
        machineCode.push(...instruction.bytes);
      }
    }

    return machineCode;
  }

  parseInstruction(line) {
    const parts = line.split(/\s+/);
    const mnemonic = parts[0].toLowerCase();
    const operands = parts.slice(1).join(' ').split(',').map(op => op.trim());

    const instruction = this.instructions.get(mnemonic);
    if (!instruction) {
      throw new Error(`Unknown instruction: ${mnemonic}`);
    }

    return this.generateMachineCode(mnemonic, operands, instruction);
  }

  generateMachineCode(mnemonic, operands, instruction) {
    const bytes = [];

    switch (mnemonic) {
      case 'mov':
        if (operands.length === 2) {
          const [dst, src] = operands;
          if (this.isRegister(dst)) {
            if (this.isRegister(src)) {
              // mov reg, reg
              bytes.push(0x88);
              bytes.push(0xC0 | (this.getRegisterCode(src) << 3) | this.getRegisterCode(dst));
            } else if (this.isImmediate(src)) {
              // mov reg, imm
              const imm = this.parseImmediate(src);
              bytes.push(0xB8 + this.getRegisterCode(dst));
              bytes.push(imm & 0xFF);
              bytes.push((imm >> 8) & 0xFF);
              bytes.push((imm >> 16) & 0xFF);
              bytes.push((imm >> 24) & 0xFF);
            }
          }
        }
        break;

      case 'add':
        if (operands.length === 2) {
          const [dst, src] = operands;
          if (this.isRegister(dst) && this.isRegister(src)) {
            bytes.push(0x01);
            bytes.push(0xC0 | (this.getRegisterCode(src) << 3) | this.getRegisterCode(dst));
          } else if (this.isRegister(dst) && this.isImmediate(src)) {
            const imm = this.parseImmediate(src);
            bytes.push(0x81);
            bytes.push(0xC0 + this.getRegisterCode(dst));
            bytes.push(imm & 0xFF);
            bytes.push((imm >> 8) & 0xFF);
            bytes.push((imm >> 16) & 0xFF);
            bytes.push((imm >> 24) & 0xFF);
          }
        }
        break;

      case 'sub':
        if (operands.length === 2) {
          const [dst, src] = operands;
          if (this.isRegister(dst) && this.isRegister(src)) {
            bytes.push(0x29);
            bytes.push(0xC0 | (this.getRegisterCode(src) << 3) | this.getRegisterCode(dst));
          } else if (this.isRegister(dst) && this.isImmediate(src)) {
            const imm = this.parseImmediate(src);
            bytes.push(0x81);
            bytes.push(0xE8 + this.getRegisterCode(dst));
            bytes.push(imm & 0xFF);
            bytes.push((imm >> 8) & 0xFF);
            bytes.push((imm >> 16) & 0xFF);
            bytes.push((imm >> 24) & 0xFF);
          }
        }
        break;

      case 'push':
        if (operands.length === 1 && this.isRegister(operands[0])) {
          bytes.push(0x50 + this.getRegisterCode(operands[0]));
        }
        break;

      case 'pop':
        if (operands.length === 1 && this.isRegister(operands[0])) {
          bytes.push(0x58 + this.getRegisterCode(operands[0]));
        }
        break;

      case 'ret':
        bytes.push(0xC3);
        break;

      case 'int':
        if (operands.length === 1 && this.isImmediate(operands[0])) {
          const imm = this.parseImmediate(operands[0]);
          bytes.push(0xCD);
          bytes.push(imm & 0xFF);
        }
        break;
    }

    return {
      bytes,
      size: bytes.length
    };
  }

  isRegister(operand) {
    return this.registers.has(operand.toLowerCase());
  }

  isImmediate(operand) {
    return /^[0-9]+$/.test(operand) || /^0x[0-9a-fA-F]+$/.test(operand);
  }

  getRegisterCode(register) {
    const reg = this.registers.get(register.toLowerCase());
    return reg ? reg.code : 0;
  }

  parseImmediate(operand) {
    if (operand.startsWith('0x')) {
      return parseInt(operand, 16);
    }
    return parseInt(operand, 10);
  }

  async validate(code) {
    const lines = code.split('\n');
    const errors = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith(';') || line.includes(':')) {
        continue;
      }

      try {
        this.parseInstruction(line);
      } catch (error) {
        errors.push({
          line: i + 1,
          message: error.message,
          code: line
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  getSyntaxHighlighting() {
    return {
      keywords: Array.from(this.instructions.keys()),
      registers: Array.from(this.registers.keys()),
      comments: [';'],
      strings: ['"', "'"],
      numbers: /[0-9]+/,
      hexNumbers: /0x[0-9a-fA-F]+/
    };
  }
} 