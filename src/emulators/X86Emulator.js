export class X86Emulator {
  constructor() {
    this.registers = new Map();
    this.memory = new Uint8Array(1024 * 1024); // 1MB memory
    this.flags = {
      CF: false, // Carry Flag
      PF: false, // Parity Flag
      AF: false, // Auxiliary Flag
      ZF: false, // Zero Flag
      SF: false, // Sign Flag
      OF: false  // Overflow Flag
    };
    this.wasmModule = null;
    this.pc = 0; // Program Counter
    this.sp = 0x1000; // Stack Pointer
    this.bp = 0x1000; // Base Pointer
    
    this.initializeRegisters();
  }

  async init() {
    // WASM module will be loaded by EmulatorManager
  }

  setWasmModule(module) {
    this.wasmModule = module;
  }

  initializeRegisters() {
    // 32-bit registers
    this.registers.set('eax', 0);
    this.registers.set('ebx', 0);
    this.registers.set('ecx', 0);
    this.registers.set('edx', 0);
    this.registers.set('esi', 0);
    this.registers.set('edi', 0);
    this.registers.set('esp', 0x1000);
    this.registers.set('ebp', 0x1000);

    // 16-bit registers
    this.registers.set('ax', 0);
    this.registers.set('bx', 0);
    this.registers.set('cx', 0);
    this.registers.set('dx', 0);

    // 8-bit registers
    this.registers.set('al', 0);
    this.registers.set('ah', 0);
    this.registers.set('bl', 0);
    this.registers.set('bh', 0);
    this.registers.set('cl', 0);
    this.registers.set('ch', 0);
    this.registers.set('dl', 0);
    this.registers.set('dh', 0);
  }

  async run(machineCode) {
    if (this.wasmModule) {
      // Use WASM module for emulation
      return this.wasmModule.emulate(machineCode);
    }

    // Fallback to JavaScript implementation
    return this.runJS(machineCode);
  }

  runJS(machineCode) {
    this.reset();
    
    const bytes = Array.isArray(machineCode) ? machineCode : 
                  machineCode.split(' ').map(b => parseInt(b, 16));
    
    this.pc = 0;
    const maxSteps = 1000; // Prevent infinite loops
    let steps = 0;

    while (this.pc < bytes.length && steps < maxSteps) {
      const instruction = this.fetchInstruction(bytes);
      this.executeInstruction(instruction);
      steps++;
    }

    return {
      registers: Object.fromEntries(this.registers),
      flags: { ...this.flags },
      memory: Array.from(this.memory.slice(0, 256)), // First 256 bytes
      pc: this.pc,
      steps: steps,
      completed: this.pc >= bytes.length
    };
  }

  async debug(machineCode) {
    this.reset();
    
    const bytes = Array.isArray(machineCode) ? machineCode : 
                  machineCode.split(' ').map(b => parseInt(b, 16));
    
    this.pc = 0;
    const debugInfo = [];

    while (this.pc < bytes.length) {
      const instruction = this.fetchInstruction(bytes);
      const beforeState = {
        pc: this.pc,
        registers: Object.fromEntries(this.registers),
        flags: { ...this.flags }
      };

      this.executeInstruction(instruction);

      const afterState = {
        pc: this.pc,
        registers: Object.fromEntries(this.registers),
        flags: { ...this.flags }
      };

      debugInfo.push({
        instruction,
        before: beforeState,
        after: afterState,
        memory: Array.from(this.memory.slice(0, 256))
      });
    }

    return debugInfo;
  }

  async step(machineCode) {
    const bytes = Array.isArray(machineCode) ? machineCode : 
                  machineCode.split(' ').map(b => parseInt(b, 16));
    
    if (this.pc >= bytes.length) {
      return { completed: true };
    }

    const instruction = this.fetchInstruction(bytes);
    const beforeState = {
      pc: this.pc,
      registers: Object.fromEntries(this.registers),
      flags: { ...this.flags }
    };

    this.executeInstruction(instruction);

    const afterState = {
      pc: this.pc,
      registers: Object.fromEntries(this.registers),
      flags: { ...this.flags }
    };

    return {
      instruction,
      before: beforeState,
      after: afterState,
      memory: Array.from(this.memory.slice(0, 256)),
      completed: this.pc >= bytes.length
    };
  }

  fetchInstruction(bytes) {
    if (this.pc >= bytes.length) {
      return { opcode: 0x90, operands: [], size: 1 }; // NOP
    }

    const opcode = bytes[this.pc];
    let instruction = { opcode, operands: [], size: 1 };

    switch (opcode) {
      case 0x88: // mov reg, reg
        instruction = {
          opcode,
          operands: [bytes[this.pc + 1]],
          size: 2,
          type: 'mov_reg_reg'
        };
        break;

      case 0xB8: // mov reg, imm (eax)
      case 0xB9: // mov reg, imm (ecx)
      case 0xBA: // mov reg, imm (edx)
      case 0xBB: // mov reg, imm (ebx)
        const regCode = opcode - 0xB8;
        const imm = bytes[this.pc + 1] | (bytes[this.pc + 2] << 8) | 
                   (bytes[this.pc + 3] << 16) | (bytes[this.pc + 4] << 24);
        instruction = {
          opcode,
          operands: [regCode, imm],
          size: 5,
          type: 'mov_reg_imm'
        };
        break;

      case 0x01: // add reg, reg
        instruction = {
          opcode,
          operands: [bytes[this.pc + 1]],
          size: 2,
          type: 'add_reg_reg'
        };
        break;

      case 0x29: // sub reg, reg
        instruction = {
          opcode,
          operands: [bytes[this.pc + 1]],
          size: 2,
          type: 'sub_reg_reg'
        };
        break;

      case 0x50: // push eax
      case 0x51: // push ecx
      case 0x52: // push edx
      case 0x53: // push ebx
        const pushRegCode = opcode - 0x50;
        instruction = {
          opcode,
          operands: [pushRegCode],
          size: 1,
          type: 'push_reg'
        };
        break;

      case 0x58: // pop eax
      case 0x59: // pop ecx
      case 0x5A: // pop edx
      case 0x5B: // pop ebx
        const popRegCode = opcode - 0x58;
        instruction = {
          opcode,
          operands: [popRegCode],
          size: 1,
          type: 'pop_reg'
        };
        break;

      case 0xC3: // ret
        instruction = {
          opcode,
          operands: [],
          size: 1,
          type: 'ret'
        };
        break;

      case 0xCD: // int
        instruction = {
          opcode,
          operands: [bytes[this.pc + 1]],
          size: 2,
          type: 'int'
        };
        break;
    }

    return instruction;
  }

  executeInstruction(instruction) {
    switch (instruction.type) {
      case 'mov_reg_reg':
        this.executeMovRegReg(instruction.operands[0]);
        break;
      case 'mov_reg_imm':
        this.executeMovRegImm(instruction.operands[0], instruction.operands[1]);
        break;
      case 'add_reg_reg':
        this.executeAddRegReg(instruction.operands[0]);
        break;
      case 'sub_reg_reg':
        this.executeSubRegReg(instruction.operands[0]);
        break;
      case 'push_reg':
        this.executePushReg(instruction.operands[0]);
        break;
      case 'pop_reg':
        this.executePopReg(instruction.operands[0]);
        break;
      case 'ret':
        this.executeRet();
        break;
      case 'int':
        this.executeInt(instruction.operands[0]);
        break;
    }

    this.pc += instruction.size;
  }

  executeMovRegReg(modrm) {
    const srcReg = (modrm >> 3) & 0x07;
    const dstReg = modrm & 0x07;
    const srcValue = this.getRegisterValue(srcReg);
    this.setRegisterValue(dstReg, srcValue);
  }

  executeMovRegImm(regCode, imm) {
    this.setRegisterValue(regCode, imm);
  }

  executeAddRegReg(modrm) {
    const srcReg = (modrm >> 3) & 0x07;
    const dstReg = modrm & 0x07;
    const srcValue = this.getRegisterValue(srcReg);
    const dstValue = this.getRegisterValue(dstReg);
    const result = dstValue + srcValue;
    
    this.setRegisterValue(dstReg, result);
    this.updateFlags(result, dstValue, srcValue, 'add');
  }

  executeSubRegReg(modrm) {
    const srcReg = (modrm >> 3) & 0x07;
    const dstReg = modrm & 0x07;
    const srcValue = this.getRegisterValue(srcReg);
    const dstValue = this.getRegisterValue(dstReg);
    const result = dstValue - srcValue;
    
    this.setRegisterValue(dstReg, result);
    this.updateFlags(result, dstValue, srcValue, 'sub');
  }

  executePushReg(regCode) {
    const value = this.getRegisterValue(regCode);
    this.sp -= 4;
    this.writeMemory32(this.sp, value);
    this.registers.set('esp', this.sp);
  }

  executePopReg(regCode) {
    const value = this.readMemory32(this.sp);
    this.setRegisterValue(regCode, value);
    this.sp += 4;
    this.registers.set('esp', this.sp);
  }

  executeRet() {
    const returnAddr = this.readMemory32(this.sp);
    this.pc = returnAddr;
    this.sp += 4;
    this.registers.set('esp', this.sp);
  }

  executeInt(interrupt) {
    // Handle software interrupt
    console.log(`Software interrupt: ${interrupt}`);
  }

  getRegisterValue(regCode) {
    const regNames = ['eax', 'ecx', 'edx', 'ebx', 'esp', 'ebp', 'esi', 'edi'];
    const regName = regNames[regCode];
    return this.registers.get(regName) || 0;
  }

  setRegisterValue(regCode, value) {
    const regNames = ['eax', 'ecx', 'edx', 'ebx', 'esp', 'ebp', 'esi', 'edi'];
    const regName = regNames[regCode];
    if (regName) {
      this.registers.set(regName, value);
      
      // Update 16-bit and 8-bit registers
      if (regName === 'eax') {
        this.registers.set('ax', value & 0xFFFF);
        this.registers.set('al', value & 0xFF);
        this.registers.set('ah', (value >> 8) & 0xFF);
      } else if (regName === 'ebx') {
        this.registers.set('bx', value & 0xFFFF);
        this.registers.set('bl', value & 0xFF);
        this.registers.set('bh', (value >> 8) & 0xFF);
      } else if (regName === 'ecx') {
        this.registers.set('cx', value & 0xFFFF);
        this.registers.set('cl', value & 0xFF);
        this.registers.set('ch', (value >> 8) & 0xFF);
      } else if (regName === 'edx') {
        this.registers.set('dx', value & 0xFFFF);
        this.registers.set('dl', value & 0xFF);
        this.registers.set('dh', (value >> 8) & 0xFF);
      }
    }
  }

  updateFlags(result, operand1, operand2, operation) {
    // Zero Flag
    this.flags.ZF = (result & 0xFFFFFFFF) === 0;
    
    // Sign Flag
    this.flags.SF = (result & 0x80000000) !== 0;
    
    // Carry Flag
    if (operation === 'add') {
      this.flags.CF = result > 0xFFFFFFFF;
    } else if (operation === 'sub') {
      this.flags.CF = operand1 < operand2;
    }
    
    // Overflow Flag
    if (operation === 'add') {
      this.flags.OF = ((operand1 & 0x80000000) === (operand2 & 0x80000000)) && 
                     ((result & 0x80000000) !== (operand1 & 0x80000000));
    } else if (operation === 'sub') {
      this.flags.OF = ((operand1 & 0x80000000) !== (operand2 & 0x80000000)) && 
                     ((result & 0x80000000) === (operand2 & 0x80000000));
    }
    
    // Parity Flag (simplified)
    this.flags.PF = (result & 0xFF) % 2 === 0;
  }

  readMemory32(address) {
    return this.memory[address] | (this.memory[address + 1] << 8) | 
           (this.memory[address + 2] << 16) | (this.memory[address + 3] << 24);
  }

  writeMemory32(address, value) {
    this.memory[address] = value & 0xFF;
    this.memory[address + 1] = (value >> 8) & 0xFF;
    this.memory[address + 2] = (value >> 16) & 0xFF;
    this.memory[address + 3] = (value >> 24) & 0xFF;
  }

  reset() {
    this.initializeRegisters();
    this.memory.fill(0);
    this.pc = 0;
    this.sp = 0x1000;
    this.bp = 0x1000;
    this.flags = {
      CF: false,
      PF: false,
      AF: false,
      ZF: false,
      SF: false,
      OF: false
    };
  }
} 