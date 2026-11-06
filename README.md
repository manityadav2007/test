# Gemini AI Workspace & Chat

A production-grade, full-featured AI Chat and Project Workspace web application inspired by Google Gemini. Built with responsive Tailwind CSS, modern ES6 JavaScript, Marked.js, and Highlight.js.

![Gemini AI Workspace](https://img.shields.br/badge/Gemini-Workspace-4285f4?style=for-the-badge&logo=google&logoColor=white)

## 🌟 Highlights & Features

- **Multi-Engine Model Selection**: Switch seamlessly between **Gemini 1.5 Pro** (default reasoning), **Gemini 1.5 Flash** (ultra-fast), and **Gemini 2.0 Thinking** (exposes step-by-step logic chains).
- **Custom Gems & Project Workspaces**: Create custom AI personas with targeted system instructions, icons, and color accents (e.g., *Senior Python Architect*, *Creative Storyteller*, *Startup Advisor*).
- **Rich Markdown & Code Rendering**: Full support for GitHub Flavored Markdown (GFM), structured tables, blockquotes, and code blocks with syntax highlighting (Atom One Dark) and 1-click code copying.
- **Real-Time Streaming Animation**: Dynamic typewriter streaming effect for AI responses paired with pulsing shimmer dots and thinking indicators.
- **Voice Dictation & File Attachments**: Web Speech API integration for instant voice input and mock file/image attachment preview chips.
- **Conversation History & Persistence**: Full multi-chat management stored in `localStorage`. Features include title auto-generation, conversation pinning, search filtering, message editing, branch regeneration, and JSON export.
- **Dark & Light Mode**: Seamless theme toggling with Google Sans styling, dynamic gradient text, and backdrop-blur cards.

## 📁 File Structure

```
├── index.html   # Main SPA layout structuring header, collapsible sidebar, chat feed, and modals
├── style.css    # Gemini design system tokens, font definitions, markdown overrides, and animations
├── app.js       # Core application state engine, markdown parsing, voice dictation, and streaming logic
└── README.md    # Project overview and documentation
```

## 🚀 Quick Start

No build step or Node environment required! Simply open `index.html` directly in any modern web browser or serve via any static file server:

```bash
# Using Python simple HTTP server
python3 -m http.server 8000

# Or using Node serve
npx serve .
```

Navigate to `http://localhost:8000` in your web browser.

## ⚙️ Configuration

- **Custom API Key**: Click the **Settings** icon in the sidebar footer to enter your own Google Gemini API key, or leave it blank to utilize the intelligent built-in mock engine.
- **Global Persona**: Define a fallback global prompt in settings to influence all non-project conversations.

## 🎨 Design System

- **Colors**: Gemini Dark (`#131314` base, `#1e1f20` sidebar, `#282a2c` cards) with Google Signature gradients (`#4285f4`, `#9b72cf`, `#d96570`).
- **Typography**: Inter / Google Sans fallback with Fira Code for code blocks.

License: MIT