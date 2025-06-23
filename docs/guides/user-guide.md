# User Guide

## What is CodeWave?
CodeWave is a fast, AI-assisted IDE for low-level programming (assembly, machine code, hardware-near systems) with real-time emulation, visualization, and collaboration.

## Installation
1. Clone the repo: `git clone https://github.com/makalin/CodeWave.git`
2. Install dependencies: `npm install`
3. Start dev server: `npm run dev`
4. Open `http://localhost:3000` in your browser

## Main Features
- Monaco-based code editor with syntax highlighting
- Real x86 assembler/emulator (ARM/RISC-V coming soon)
- AI code suggestions (Grok 3, OpenAI, Claude)
- Real-time collaboration (WebRTC)
- Debugger, register/memory visualization
- Offline-first, session/snippet management

## Usage
- Write code in the editor
- Click **Run** to assemble and emulate
- Click **Debug** for step-by-step execution
- Use **AI** for code suggestions, explanations, bug finding
- Use **Share** to collaborate in real time

See [AI Guide](./ai-guide.md) and [Assembler/Emulator Guide](./assembler-emulator.md) for more details. 