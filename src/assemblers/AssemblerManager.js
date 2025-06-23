import { X86Assembler } from './X86Assembler.js';
import { ARMAssembler } from './ARMAssembler.js';
import { RiscVAssembler } from './RiscVAssembler.js';

export class AssemblerManager {
  constructor() {
    this.assemblers = new Map();
    this.wasmModules = new Map();
  }

  async init() {
    // Initialize assemblers for each architecture
    this.assemblers.set('x86', new X86Assembler());
    this.assemblers.set('arm', new ARMAssembler());
    this.assemblers.set('riscv', new RiscVAssembler());

    // Load WASM modules
    await this.loadWasmModules();
  }

  async loadWasmModules() {
    try {
      // Load x86 WASM module
      const x86Wasm = await import('../../wasm/pkg/codewave_wasm.js');
      await x86Wasm.default();
      this.wasmModules.set('x86', x86Wasm);

      // Load ARM WASM module (placeholder)
      // const armWasm = await import('../../wasm/arm/pkg/codewave_arm_wasm.js');
      // await armWasm.default();
      // this.wasmModules.set('arm', armWasm);

      // Load RISC-V WASM module (placeholder)
      // const riscvWasm = await import('../../wasm/riscv/pkg/codewave_riscv_wasm.js');
      // await riscvWasm.default();
      // this.wasmModules.set('riscv', riscvWasm);
    } catch (error) {
      console.warn('Failed to load WASM modules:', error);
    }
  }

  get(architecture) {
    const assembler = this.assemblers.get(architecture);
    if (!assembler) {
      throw new Error(`Unsupported architecture: ${architecture}`);
    }
    return assembler;
  }

  getSupportedArchitectures() {
    return Array.from(this.assemblers.keys());
  }

  async assemble(code, architecture = 'x86') {
    const assembler = this.get(architecture);
    return await assembler.assemble(code);
  }

  async validate(code, architecture = 'x86') {
    const assembler = this.get(architecture);
    return await assembler.validate(code);
  }

  getSyntaxHighlighting(architecture = 'x86') {
    const assembler = this.get(architecture);
    return assembler.getSyntaxHighlighting();
  }
} 