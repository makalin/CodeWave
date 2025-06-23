import { X86Emulator } from './X86Emulator.js';
import { ARMEmulator } from './ARMEmulator.js';
import { RiscVEmulator } from './RiscVEmulator.js';

export class EmulatorManager {
  constructor() {
    this.emulators = new Map();
    this.wasmModules = new Map();
  }

  async init() {
    // Initialize emulators for each architecture
    this.emulators.set('x86', new X86Emulator());
    this.emulators.set('arm', new ARMEmulator());
    this.emulators.set('riscv', new RiscVEmulator());

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
    const emulator = this.emulators.get(architecture);
    if (!emulator) {
      throw new Error(`Unsupported architecture: ${architecture}`);
    }
    return emulator;
  }

  getSupportedArchitectures() {
    return Array.from(this.emulators.keys());
  }

  async run(machineCode, architecture = 'x86') {
    const emulator = this.get(architecture);
    return await emulator.run(machineCode);
  }

  async debug(machineCode, architecture = 'x86') {
    const emulator = this.get(architecture);
    return await emulator.debug(machineCode);
  }

  async step(machineCode, architecture = 'x86') {
    const emulator = this.get(architecture);
    return await emulator.step(machineCode);
  }

  reset(architecture = 'x86') {
    const emulator = this.get(architecture);
    return emulator.reset();
  }
} 