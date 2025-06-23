# FAQ

**Q: What platforms does CodeWave support?**
A: Any modern browser (Chrome, Firefox, Edge, Safari). No installation required for frontend.

**Q: Is my code/data private?**
A: Yes. All code and data is stored locally. AI requests are sent only to the selected provider.

**Q: Can I use my own AI model?**
A: Local model support is planned. You can already use Grok 3, OpenAI, or Claude.

**Q: How do I add support for a new architecture?**
A: Implement a new assembler/emulator in `src/assemblers/` and `src/emulators/`, then register it in the managers.

**Q: How do I report bugs?**
A: Open a GitHub Issue with details and steps to reproduce. 