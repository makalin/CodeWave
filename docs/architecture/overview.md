# Architecture Overview

## Main Modules
- **UI**: Monaco-based editor, sidebar, modals
- **AI**: Multi-provider AI service (Grok 3, OpenAI, Claude)
- **Assembler/Emulator**: Modular, WASM-ready, supports x86/ARM/RISC-V
- **Collaboration**: WebRTC peer-to-peer
- **Storage**: IndexedDB via Dexie
- **EventBus**: Decoupled event-driven communication

## Data Flow
1. User writes code in editor
2. On Run/Debug, code is assembled and emulated
3. Results are visualized in sidebar
4. AI requests are sent to selected provider
5. Collaboration syncs code in real time

## Extending CodeWave
- Add new architectures by implementing assembler/emulator modules
- Add new AI providers in `AIService`
- UI is modular and event-driven 