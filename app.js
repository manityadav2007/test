/**
 * Gemini AI Workspace & Chat Application Logic
 * Complete state management, streaming simulated/live responses,
 * Markdown parsing with syntax highlighting, custom Gem projects,
 * voice dictation, LocalStorage persistence, and responsive UI controls.
 */

// LocalStorage Persistence Keys
const STORAGE_KEY_CHATS = 'gemini_chats_v1';
const STORAGE_KEY_PROJECTS = 'gemini_projects_v1';
const STORAGE_KEY_SETTINGS = 'gemini_settings_v1';
const STORAGE_KEY_THEME = 'gemini_theme_v1';

// Default Gems / Custom Project Personas
const DEFAULT_PROJECTS = [
  {
    id: 'gem-python-architect',
    name: 'Python Architect',
    icon: 'code',
    color: 'text-gemini-blue',
    instructions: 'You are a Senior Principal Python Engineer. Provide production-grade, PEP-8 compliant code with type hints, modular patterns, and comprehensive explanations.'
  },
  {
    id: 'gem-creative-writer',
    name: 'Creative Storyteller',
    icon: 'pen-tool',
    color: 'text-gemini-purple',
    instructions: 'You are an acclaimed creative author and narrative master. Craft vivid, evocative descriptions, engaging plot points, and memorable character dialogue.'
  },
  {
    id: 'gem-growth-hacker',
    name: 'Startup & Strategy Advisor',
    icon: 'briefcase',
    color: 'text-amber-400',
    instructions: 'You are a veteran Silicon Valley startup mentor. Deliver razor-sharp, actionable strategies for product design, target market alignment, and rapid growth scaling.'
  },
  {
    id: 'gem-data-scientist',
    name: 'Data & SQL Specialist',
    icon: 'database',
    color: 'text-emerald-400',
    instructions: 'You are an expert Data Scientist. Explain statistical concepts intuitively and write optimized SQL queries, Pandas data pipelines, and analytical visualizations.'
  }
];

// Global Reactive State
const state = {
  chats: [],
  projects: [],
  activeChatId: null,
  activeModel: 'gemini-1.5-pro',
  activeProjectId: null,
  isGenerating: false,
  isVoiceActive: false,
  speechRecognition: null,
  attachments: [],
  settings: {
    apiKey: '',
    globalPrompt: ''
  }
};

// DOM Element Cache
let DOM = {};

// Initialization on Window Load
window.addEventListener('DOMContentLoaded', () => {
  cacheDOMElements();
  initTheme();
  setupMarkedParser();
  loadStateFromStorage();
  initSpeechRecognition();
  renderProjects();
  renderRecentChats();
  
  if (state.chats.length === 0) {
    createNewChat(false);
  } else {
    switchChat(state.chats[0].id);
  }

  attachEventListeners();
  updateLucideIcons();
});

// Cache DOM references for performance
function cacheDOMElements() {
  DOM = {
    sidebar: document.getElementById('sidebar'),
    toggleSidebarBtn: document.getElementById('toggle-sidebar-btn'),
    mobileMenuBtn: document.getElementById('mobile-menu-btn'),
    btnNewChat: document.getElementById('btn-new-chat'),
    newChatTopBtn: document.getElementById('new-chat-top-btn'),
    searchChatsInput: document.getElementById('search-chats-input'),
    projectsListEl: document.getElementById('projects-list'),
    recentChatsListEl: document.getElementById('recent-chats-list'),
    
    modelSelectorBtn: document.getElementById('model-selector-btn'),
    selectedModelNameEl: document.getElementById('selected-model-name'),
    modelDropdown: document.getElementById('model-dropdown'),
    activeProjectBadge: document.getElementById('active-project-badge'),
    activeProjectNameEl: document.getElementById('active-project-name'),
    btnClearProject: document.getElementById('btn-clear-project'),
    
    welcomeView: document.getElementById('welcome-container'),
    messagesContainer: document.getElementById('messages-container'),
    
    userPromptInput: document.getElementById('user-prompt-input'),
    btnSendPrompt: document.getElementById('btn-send-prompt'),
    charCountEl: document.getElementById('char-count'),
    fileInput: document.getElementById('file-input'),
    attachmentBar: document.getElementById('attachment-bar'),
    btnVoiceInput: document.getElementById('btn-voice-input'),
    recordingPulse: document.getElementById('recording-pulse'),
    btnDeepThink: document.getElementById('btn-deep-think'),
    
    btnExportChat: document.getElementById('btn-export-chat'),
    btnClearChat: document.getElementById('btn-clear-chat'),
    btnThemeToggle: document.getElementById('btn-theme-toggle'),
    themeIcon: document.getElementById('theme-icon'),
    themeText: document.getElementById('theme-text'),
    
    gemModal: document.getElementById('gem-modal'),
    btnOpenGemModal: document.getElementById('btn-open-gem-modal'),
    closeGemModal: document.getElementById('close-gem-modal'),
    cancelGemModal: document.getElementById('cancel-gem-modal'),
    gemForm: document.getElementById('gem-form'),
    
    settingsModal: document.getElementById('settings-modal'),
    btnOpenSettings: document.getElementById('btn-open-settings'),
    closeSettingsModal: document.getElementById('close-settings-modal'),
    saveSettingsBtn: document.getElementById('save-settings-btn'),
    apiKeyInput: document.getElementById('api-key-input'),
    globalSystemPrompt: document.getElementById('global-system-prompt')
  };
}

// Markdown Parsing Configuration
function setupMarkedParser() {
  if (typeof marked !== 'undefined') {
    marked.setOptions({
      highlight: function (code, lang) {
        if (typeof hljs !== 'undefined') {
          const language = hljs.getLanguage(lang) ? lang : 'plaintext';
          return hljs.highlight(code, { language }).value;
        }
        return code;
      },
      breaks: true,
      gfm: true
    });
  }
}

// Helper to safely re-render Lucide icons
function updateLucideIcons() {
  if (typeof lucide !== 'undefined' && lucide.createIcons) {
    lucide.createIcons();
  }
}

// Theme Initialization and Toggle
function initTheme() {
  const savedTheme = localStorage.getItem(STORAGE_KEY_THEME) || 'dark';
  const isDark = savedTheme === 'dark';
  
  if (isDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
  updateThemeUI(isDark);
}

function toggleTheme() {
  const isCurrentlyDark = document.documentElement.classList.contains('dark');
  const nextDark = !isCurrentlyDark;
  
  if (nextDark) {
    document.documentElement.classList.add('dark');
    localStorage.setItem(STORAGE_KEY_THEME, 'dark');
  } else {
    document.documentElement.classList.remove('dark');
    localStorage.setItem(STORAGE_KEY_THEME, 'light');
  }
  updateThemeUI(nextDark);
}

function updateThemeUI(isDark) {
  if (DOM.themeIcon && DOM.themeText) {
    DOM.themeIcon.setAttribute('data-lucide', isDark ? 'moon' : 'sun');
    DOM.themeText.innerText = isDark ? 'Dark Theme' : 'Light Theme';
    updateLucideIcons();
  }
}

// Persistence Handling
function loadStateFromStorage() {
  try {
    const savedChats = localStorage.getItem(STORAGE_KEY_CHATS);
    const savedProjects = localStorage.getItem(STORAGE_KEY_PROJECTS);
    const savedSettings = localStorage.getItem(STORAGE_KEY_SETTINGS);

    state.chats = savedChats ? JSON.parse(savedChats) : [];
    state.projects = savedProjects ? JSON.parse(savedProjects) : DEFAULT_PROJECTS;
    state.settings = savedSettings ? JSON.parse(savedSettings) : { apiKey: '', globalPrompt: '' };
  } catch (err) {
    console.error('Error reading from localStorage:', err);
    state.projects = DEFAULT_PROJECTS;
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY_CHATS, JSON.stringify(state.chats));
    localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(state.projects));
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(state.settings));
  } catch (err) {
    console.error('Error writing to localStorage:', err);
  }
}

// Speech Dictation Web API
function initSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRecognition) {
    state.speechRecognition = new SpeechRecognition();
    state.speechRecognition.continuous = false;
    state.speechRecognition.interimResults = true;
    state.speechRecognition.lang = 'en-US';

    state.speechRecognition.onresult = (event) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      DOM.userPromptInput.value = transcript;
      DOM.userPromptInput.dispatchEvent(new Event('input'));
    };

    state.speechRecognition.onerror = (event) => {
      console.warn('Speech recognition error:', event.error);
      stopVoiceDictation();
    };

    state.speechRecognition.onend = () => {
      stopVoiceDictation();
    };
  }
}

function toggleVoiceDictation() {
  if (!state.speechRecognition) {
    simulateVoiceDictation();
    return;
  }

  if (state.isVoiceActive) {
    state.speechRecognition.stop();
    stopVoiceDictation();
  } else {
    try {
      state.speechRecognition.start();
      startVoiceDictationUI();
    } catch (e) {
      console.warn('Speech recognition start failed, using fallback:', e);
      simulateVoiceDictation();
    }
  }
}

function startVoiceDictationUI() {
  state.isVoiceActive = true;
  DOM.recordingPulse.classList.remove('hidden');
  DOM.btnVoiceInput.classList.add('text-red-400');
  DOM.userPromptInput.placeholder = 'Listening... Speak now...';
}

function stopVoiceDictation() {
  state.isVoiceActive = false;
  DOM.recordingPulse.classList.add('hidden');
  DOM.btnVoiceInput.classList.remove('text-red-400');
  DOM.userPromptInput.placeholder = "Ask Gemini or type '/' for prompts...";
}

function simulateVoiceDictation() {
  if (state.isVoiceActive) {
    stopVoiceDictation();
    return;
  }
  startVoiceDictationUI();
  setTimeout(() => {
    if (state.isVoiceActive) {
      DOM.userPromptInput.value = 'Explain the key differences between Gemini 1.5 Pro and Gemini 1.5 Flash.';
      DOM.userPromptInput.dispatchEvent(new Event('input'));
      stopVoiceDictation();
    }
  }, 2500);
}

// Conversation Management Logic
function createNewChat(switchToIt = true) {
  const newChat = {
    id: 'chat_' + Date.now(),
    title: 'New Conversation',
    projectId: state.activeProjectId,
    model: state.activeModel,
    messages: [],
    pinned: false,
    createdAt: new Date().toISOString()
  };

  state.chats.unshift(newChat);
  saveState();
  renderRecentChats();

  if (switchToIt) {
    switchChat(newChat.id);
  }
}

function switchChat(chatId) {
  state.activeChatId = chatId;
  const chat = state.chats.find(c => c.id === chatId);
  
  if (!chat) return;

  if (chat.projectId) {
    const project = state.projects.find(p => p.id === chat.projectId);
    if (project) setProjectActive(project.id, false);
    else clearActiveProject(false);
  } else {
    clearActiveProject(false);
  }

  if (chat.model) {
    selectModel(chat.model, false);
  }

  renderMessages();
  renderRecentChats();
}

function deleteChat(chatId, e) {
  if (e) e.stopPropagation();
  state.chats = state.chats.filter(c => c.id !== chatId);
  saveState();

  if (state.activeChatId === chatId) {
    if (state.chats.length > 0) {
      switchChat(state.chats[0].id);
    } else {
      createNewChat(true);
    }
  } else {
    renderRecentChats();
  }
}

function togglePinChat(chatId, e) {
  if (e) e.stopPropagation();
  const chat = state.chats.find(c => c.id === chatId);
  if (chat) {
    chat.pinned = !chat.pinned;
    saveState();
    renderRecentChats();
  }
}

// UI Rendering Functions
function renderProjects() {
  if (!DOM.projectsListEl) return;
  DOM.projectsListEl.innerHTML = '';
  
  state.projects.forEach(project => {
    const isSelected = state.activeProjectId === project.id;
    const btn = document.createElement('button');
    btn.className = `w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${!isSelected ? 'text-gray-300 hover:bg-gemini-hover hover:text-white' : 'bg-gemini-blue/20 text-gemini-accent border border-gemini-blue/30'}`;
    btn.onclick = () => setProjectActive(project.id, true);
    btn.innerHTML = `
      <div class="flex items-center gap-2.5 truncate">
        <i data-lucide="${project.icon || 'folder'}" class="w-4 h-4 ${project.color || 'text-gemini-blue'} shrink-0"></i>
        <span class="truncate">${escapeHtml(project.name)}</span>
      </div>
    `;
    DOM.projectsListEl.appendChild(btn);
  });
  updateLucideIcons();
}

function renderRecentChats() {
  if (!DOM.recentChatsListEl) return;
  DOM.recentChatsListEl.innerHTML = '';

  const searchQuery = (DOM.searchChatsInput?.value || '').toLowerCase();
  
  const filtered = state.chats.filter(c => 
    c.title.toLowerCase().includes(searchQuery) || 
    c.messages.some(m => m.content.toLowerCase().includes(searchQuery))
  );

  const pinnedChats = filtered.filter(c => c.pinned);
  const unpinnedChats = filtered.filter(c => !c.pinned);
  const orderedChats = [...pinnedChats, ...unpinnedChats];

  if (orderedChats.length === 0) {
    DOM.recentChatsListEl.innerHTML = `<p class="px-3 text-xs text-gemini-muted italic">No chats found.</p>`;
    return;
  }

  orderedChats.forEach(chat => {
    const isActive = chat.id === state.activeChatId;
    const item = document.createElement('div');
    item.className = `group flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer transition-all ${!isActive ? 'text-gray-300 hover:bg-gemini-sidebar hover:text-white' : 'bg-gemini-hover text-white font-medium shadow-sm'}`;
    item.onclick = () => switchChat(chat.id);

    item.innerHTML = `
      <div class="flex items-center gap-2.5 overflow-hidden">
        <i data-lucide="${chat.pinned ? 'pin' : 'message-square'}" class="w-3.5 h-3.5 ${chat.pinned ? 'text-amber-400' : 'text-gemini-muted'} shrink-0"></i>
        <span class="truncate">${escapeHtml(chat.title)}</span>
      </div>
      <div class="hidden group-hover:flex items-center gap-1 shrink-0">
        <button title="${chat.pinned ? 'Unpin chat' : 'Pin chat'}" class="p-1 hover:text-amber-400 text-gemini-muted rounded" onclick="togglePinChat('${chat.id}', event)">
          <i data-lucide="${chat.pinned ? 'pin-off' : 'pin'}" class="w-3 h-3"></i>
        </button>
        <button title="Delete chat" class="p-1 hover:text-red-400 text-gemini-muted rounded" onclick="deleteChat('${chat.id}', event)">
          <i data-lucide="trash-2" class="w-3 h-3"></i>
        </button>
      </div>
    `;
    DOM.recentChatsListEl.appendChild(item);
  });
  updateLucideIcons();
}

function renderMessages() {
  if (!DOM.messagesContainer) return;
  
  const activeChat = state.chats.find(c => c.id === state.activeChatId);
  
  if (!activeChat || activeChat.messages.length === 0) {
    if (DOM.welcomeView) DOM.welcomeView.classList.remove('hidden');
    const dynamicMsgs = DOM.messagesContainer.querySelectorAll('.chat-message-node');
    dynamicMsgs.forEach(node => node.remove());
    return;
  }

  if (DOM.welcomeView) DOM.welcomeView.classList.add('hidden');

  const dynamicMsgs = DOM.messagesContainer.querySelectorAll('.chat-message-node');
  dynamicMsgs.forEach(node => node.remove());

  activeChat.messages.forEach(msg => {
    if (msg.role === 'user') {
      appendUserMessageUI(msg.content, msg.attachments, false);
    } else {
      appendAiMessageUI(msg.content, msg.model, false);
    }
  });

  DOM.messagesContainer.scrollTop = DOM.messagesContainer.scrollHeight;
}

function handleSendPrompt(customText = null) {
  const text = customText || DOM.userPromptInput?.value.trim();
  if (!text || state.isGenerating) return;

  const activeChat = state.chats.find(c => c.id === state.activeChatId);
  if (!activeChat) return;

  if (activeChat.messages.length === 0) {
    activeChat.title = text.slice(0, 32) + (text.length > 32 ? '...' : '');
  }

  const attachmentsCopy = [...state.attachments];
  state.attachments = [];
  renderAttachmentChips();

  const userMsg = { role: 'user', content: text, attachments: attachmentsCopy, timestamp: new Date().toISOString() };
  activeChat.messages.push(userMsg);
  saveState();

  if (DOM.welcomeView) DOM.welcomeView.classList.add('hidden');
  appendUserMessageUI(text, attachmentsCopy, true);

  if (DOM.userPromptInput) {
    DOM.userPromptInput.value = '';
    DOM.userPromptInput.style.height = 'auto';
    updateCharCount();
    updateSendButtonState();
  }

  streamAiResponse(text);
}

function appendUserMessageUI(content, attachments = [], autoScroll = true) {
  const node = document.createElement('div');
  node.className = 'chat-message-node flex justify-end max-w-4xl mx-auto my-4';
  
  let attachmentMarkup = '';
  if (attachments && attachments.length > 0) {
    attachmentMarkup = `<div class="flex flex-wrap gap-1.5 mb-2">` + 
      attachments.map(a => `<span class="inline-flex items-center gap-1 text-[11px] bg-black/20 text-gray-200 px-2.5 py-1 rounded-md border border-white/10"><i data-lucide="paperclip" class="w-3 h-3 text-gemini-accent"></i>${escapeHtml(a.name)}</span>`).join('') +
      `</div>`;
  }

  node.innerHTML = `
    <div class="bg-gemini-card border border-white/10 rounded-2xl rounded-tr-sm px-5 py-3.5 max-w-[85%] text-sm text-gray-100 shadow-md">
      ${attachmentMarkup}
      <div class="whitespace-pre-wrap leading-relaxed">${escapeHtml(content)}</div>
    </div>
  `;
  DOM.messagesContainer.appendChild(node);
  updateLucideIcons();
  if (autoScroll) DOM.messagesContainer.scrollTop = DOM.messagesContainer.scrollHeight;
}

function appendAiMessageUI(content, modelName, autoScroll = true) {
  const node = document.createElement('div');
  node.className = 'chat-message-node flex items-start gap-4 max-w-4xl mx-auto my-6';
  
  let htmlContent = content;
  if (typeof marked !== 'undefined') {
    try {
      htmlContent = marked.parse(content);
    } catch (e) {
      htmlContent = escapeHtml(content);
    }
  }

  node.innerHTML = `
    <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-gemini-blue via-gemini-purple to-gemini-pink flex items-center justify-center text-white shrink-0 shadow-md mt-1">
      <i data-lucide="sparkles" class="w-4 h-4"></i>
    </div>
    <div class="flex-1 overflow-hidden">
      <div class="flex items-center gap-2 mb-1.5">
        <span class="text-xs font-semibold text-gray-200">Gemini</span>
        <span class="text-[10px] text-gemini-muted bg-white/5 px-2 py-0.5 rounded-full border border-white/5 font-mono">${escapeHtml(modelName || state.activeModel)}</span>
      </div>
      <div class="markdown-body text-sm text-gray-200 leading-relaxed">
        ${htmlContent}
      </div>
    </div>
  `;
  DOM.messagesContainer.appendChild(node);
  updateLucideIcons();
  if (autoScroll) DOM.messagesContainer.scrollTop = DOM.messagesContainer.scrollHeight;
  return node;
}

function streamAiResponse(promptText) {
  state.isGenerating = true;
  updateSendButtonState();

  const activeChat = state.chats.find(c => c.id === state.activeChatId);
  const selectedModel = state.activeModel;

  const node = document.createElement('div');
  node.className = 'chat-message-node flex items-start gap-4 max-w-4xl mx-auto my-6';
  node.innerHTML = `
    <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-gemini-blue via-gemini-purple to-gemini-pink flex items-center justify-center text-white shrink-0 shadow-md mt-1">
      <i data-lucide="sparkles" class="w-4 h-4 animate-spin"></i>
    </div>
    <div class="flex-1 overflow-hidden">
      <div class="flex items-center gap-2 mb-1.5">
        <span class="text-xs font-semibold text-gray-200">Gemini</span>
        <span class="text-[10px] text-gemini-muted bg-white/5 px-2 py-0.5 rounded-full border border-white/5 font-mono">${escapeHtml(selectedModel)}</span>
      </div>
      <div class="ai-stream-content markdown-body text-sm text-gray-200 leading-relaxed">
        <div class="flex items-center gap-1.5 py-2">
          <span class="shimmer-dot"></span>
          <span class="shimmer-dot"></span>
          <span class="shimmer-dot"></span>
        </div>
      </div>
    </div>
  `;
  DOM.messagesContainer.appendChild(node);
  updateLucideIcons();
  DOM.messagesContainer.scrollTop = DOM.messagesContainer.scrollHeight;

  const responseText = generateSimulatedResponse(promptText);
  const contentEl = node.querySelector('.ai-stream-content');
  
  let currentIdx = 0;
  const chunkLength = 4;
  const interval = setInterval(() => {
    currentIdx += chunkLength;
    const partial = responseText.slice(0, currentIdx);
    
    if (typeof marked !== 'undefined') {
      try {
        contentEl.innerHTML = marked.parse(partial);
      } catch (e) {
        contentEl.innerText = partial;
      }
    } else {
      contentEl.innerText = partial;
    }

    DOM.messagesContainer.scrollTop = DOM.messagesContainer.scrollHeight;

    if (currentIdx >= responseText.length) {
      clearInterval(interval);
      state.isGenerating = false;
      updateSendButtonState();
      
      if (activeChat) {
        activeChat.messages.push({
          role: 'model',
          content: responseText,
          model: selectedModel,
          timestamp: new Date().toISOString()
        });
        saveState();
        renderRecentChats();
      }
    }
  }, 20);
}

function generateSimulatedResponse(promptText) {
  const activeProject = state.projects.find(p => p.id === state.activeProjectId);
  const projectContext = activeProject ? `[Active Gem Context: ${activeProject.name}]\n` : '';

  const lower = promptText.toLowerCase();

  if (lower.includes('code') || lower.includes('react') || lower.includes('javascript') || lower.includes('python')) {
    return `${projectContext}Here is a clean, production-ready implementation tailored to your request:\n\n\
```javascript\n\
// Modular React Dashboard Component\n\
import React, { useState, useEffect } from 'react';\n\
\n\
export default function AnalyticsWidget({ title = \"Live Metrics\" }) {\n\
  const [data, setData] = useState([]);\n\
  const [loading, setLoading] = useState(true);\n\
\n\
  useEffect(() => {\n\
    // Simulated real-time streaming pipeline\n\
    const timer = setTimeout(() => {\n\
      setData([\n\
        { id: 1, metric: 'Active Sessions', value: '42,890', growth: '+14.2%' },\n\
        { id: 2, metric: 'Conversion Rate', value: '3.84%', growth: '+0.8%' },\n\
        { id: 3, metric: 'API Latency', value: '18ms', growth: '-5.1%' }\n\
      ]);\n\
      setLoading(false);\n\
    }, 800);\n\
    return () => clearTimeout(timer);\n\
  }, []);\n\
\n\
  if (loading) return <div class=\"p-4 text-gray-400\">Loading live telemetry...</div>;\n\
\n\
  return (\n\
    <div className=\"p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl\">\n\
      <h3 className=\"text-lg font-semibold text-white mb-4\">{title}</h3>\n\
      <div className=\"grid grid-cols-1 md:grid-cols-3 gap-4\">\n\
        {data.map(item => (\n\
          <div key={item.id} className=\"p-4 bg-slate-800/50 rounded-xl border border-slate-700/50\">\n\
            <p className=\"text-xs text-slate-400 font-medium\">{item.metric}</p>\n\
            <p className=\"text-2xl font-bold text-white mt-1\">{item.value}</p>\n\
            <span className=\"text-xs font-semibold text-emerald-400 mt-2 block\">{item.growth} vs last week</span>\n\
          </div>\n\
        ))}\n\
      </div>\n\
    </div>\n\
  );\n\
}\n\
```\n\n\
### Key Features:\n\
1. **Asynchronous Telemetry Stream**: Clean state initialization with zero layout shift.\n\
2. **Accessible Styling**: Styled with modern Tailwind utility classes.\n\
3. **Type-Safe Props**: Optimized for high-throughput dashboard renders.`;
  }

  if (lower.includes('explain') || lower.includes('what is')) {
    return `${projectContext}### Architectural Insight & Analysis\n\n**Gemini 1.5 Architecture** introduces native long-context window capability (up to 2 Million tokens) combined with multimodal understanding across text, audio, video, and complex codebases.\n\n#### Core Mechanics:\n- **Transformer Decoder Pipeline**: Enables retrieval of precise data points from millions of tokens of context with >99% recall efficiency.\n- **Sparse Mixture of Experts (MoE)**: Routing requests dynamically to specialized sub-networks to achieve lower latency and high efficiency.\n- **Unified Multimodal Tokenization**: Process code structures, media signals, and language embeddings natively in a single latent space.`;
  }

  return `${projectContext}I have processed your query using **${state.activeModel}**.\n\nHere is a structured overview addressing your point:\n\n1. **Strategic Optimization**: Ensure your workflow maintains high performance across all edge clients.\n2. **Scalable Design Patterns**: Keep component state isolated and leverage modern ES6+ paradigms.\n3. **Extensibility**: Custom Gems allow you to persist custom system prompts and domain expertise.\n\nLet me know if you would like me to generate code examples, dive deeper into implementation details, or draft technical specs!`;
}

// Model & Project Selector Handlers
function selectModel(modelId, saveAndSwitch = true) {
  state.activeModel = modelId;
  
  const options = document.querySelectorAll('.model-option');
  options.forEach(el => {
    if (el.dataset.model === modelId) {
      el.classList.add('bg-gemini-hover');
      if (DOM.selectedModelNameEl) DOM.selectedModelNameEl.innerText = el.dataset.name;
    } else {
      el.classList.remove('bg-gemini-hover');
    }
  });
  if (DOM.modelDropdown) DOM.modelDropdown.classList.add('hidden');
  
  if (saveAndSwitch) {
    const activeChat = state.chats.find(c => c.id === state.activeChatId);
    if (activeChat) {
      activeChat.model = modelId;
      saveState();
    }
  }
}

function setProjectActive(projectId, updateChat = true) {
  state.activeProjectId = projectId;
  const project = state.projects.find(p => p.id === projectId);
  
  if (project && DOM.activeProjectBadge && DOM.activeProjectNameEl) {
    DOM.activeProjectNameEl.innerText = project.name;
    DOM.activeProjectBadge.classList.remove('hidden');
    DOM.activeProjectBadge.classList.add('flex');
  }

  renderProjects();

  if (updateChat) {
    const activeChat = state.chats.find(c => c.id === state.activeChatId);
    if (activeChat) {
      activeChat.projectId = projectId;
      saveState();
    }
  }
}

function clearActiveProject(updateChat = true) {
  state.activeProjectId = null;
  if (DOM.activeProjectBadge) {
    DOM.activeProjectBadge.classList.add('hidden');
    DOM.activeProjectBadge.classList.remove('flex');
  }
  renderProjects();

  if (updateChat) {
    const activeChat = state.chats.find(c => c.id === state.activeChatId);
    if (activeChat) {
      activeChat.projectId = null;
      saveState();
    }
  }
}

function renderAttachmentChips() {
  if (!DOM.attachmentBar) return;
  if (state.attachments.length === 0) {
    DOM.attachmentBar.classList.add('hidden');
    DOM.attachmentBar.classList.remove('flex');
    DOM.attachmentBar.innerHTML = '';
    return;
  }
  DOM.attachmentBar.classList.remove('hidden');
  DOM.attachmentBar.classList.add('flex');
  DOM.attachmentBar.innerHTML = '';

  state.attachments.forEach((att, idx) => {
    const chip = document.createElement('div');
    chip.className = 'flex items-center gap-1.5 px-3 py-1 bg-gemini-card border border-white/10 rounded-full text-xs text-gray-200 shrink-0';
    chip.innerHTML = `
      <i data-lucide="paperclip" class="w-3 h-3 text-gemini-blue"></i>
      <span>${escapeHtml(att.name)}</span>
      <button onclick="window.removeAttachment(${idx})" class="hover:text-red-400 ml-1"><i data-lucide="x" class="w-3 h-3"></i></button>
    `;
    DOM.attachmentBar.appendChild(chip);
  });
  updateLucideIcons();
}

window.removeAttachment = function(index) {
  state.attachments.splice(index, 1);
  renderAttachmentChips();
};

function updateCharCount() {
  if (!DOM.charCountEl || !DOM.userPromptInput) return;
  const len = DOM.userPromptInput.value.length;
  DOM.charCountEl.innerText = `${len} / 4000`;
}

function updateSendButtonState() {
  if (!DOM.btnSendPrompt || !DOM.userPromptInput) return;
  const hasText = DOM.userPromptInput.value.trim().length > 0;
  DOM.btnSendPrompt.disabled = !hasText || state.isGenerating;
}

// Utility: HTML Escaping
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Comprehensive Event Listener Binding
function attachEventListeners() {
  // Auto resizing input textarea
  if (DOM.userPromptInput) {
    DOM.userPromptInput.addEventListener('input', () => {
      DOM.userPromptInput.style.height = 'auto';
      DOM.userPromptInput.style.height = (DOM.userPromptInput.scrollHeight) + 'px';
      updateCharCount();
      updateSendButtonState();
    });

    DOM.userPromptInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendPrompt();
      }
    });
  }

  if (DOM.btnSendPrompt) DOM.btnSendPrompt.onclick = () => handleSendPrompt();
  if (DOM.btnNewChat) DOM.btnNewChat.onclick = () => createNewChat(true);
  if (DOM.newChatTopBtn) DOM.newChatTopBtn.onclick = () => createNewChat(true);

  // Sidebar Toggles
  if (DOM.toggleSidebarBtn) {
    DOM.toggleSidebarBtn.onclick = () => {
      DOM.sidebar.classList.toggle('w-72');
      DOM.sidebar.classList.toggle('w-16');
      DOM.sidebar.querySelectorAll('.sidebar-label').forEach(el => el.classList.toggle('hidden'));
    };
  }

  if (DOM.mobileMenuBtn) {
    DOM.mobileMenuBtn.onclick = () => {
      DOM.sidebar.classList.toggle('-translate-x-full');
      DOM.sidebar.classList.toggle('fixed');
      DOM.sidebar.classList.toggle('inset-y-0');
      DOM.sidebar.classList.toggle('left-0');
    };
  }

  // Search chat filter listener
  if (DOM.searchChatsInput) {
    DOM.searchChatsInput.addEventListener('input', renderRecentChats);
  }

  // Model selector dropdown toggle
  if (DOM.modelSelectorBtn) {
    DOM.modelSelectorBtn.onclick = (e) => {
      e.stopPropagation();
      DOM.modelDropdown.classList.toggle('hidden');
    };
  }

  document.addEventListener('click', () => {
    if (DOM.modelDropdown) DOM.modelDropdown.classList.add('hidden');
  });

  document.querySelectorAll('.model-option').forEach(option => {
    option.onclick = (e) => {
      e.stopPropagation();
      selectModel(option.dataset.model, true);
    };
  });

  if (DOM.btnClearProject) DOM.btnClearProject.onclick = () => clearActiveProject(true);

  // Prompt Suggestion Card Clicks
  document.querySelectorAll('.suggestion-card').forEach(card => {
    card.onclick = () => {
      const promptText = card.querySelector('p')?.innerText;
      if (promptText) handleSendPrompt(promptText);
    };
  });

  // Attachments File Input
  if (DOM.fileInput) {
    DOM.fileInput.onchange = (e) => {
      const files = Array.from(e.target.files);
      files.forEach(f => {
        state.attachments.push({ name: f.name, size: f.size });
      });
      renderAttachmentChips();
    };
  }

  // Voice dictation button
  if (DOM.btnVoiceInput) {
    DOM.btnVoiceInput.onclick = toggleVoiceDictation;
  }

  // Quick Fast Model Toggle
  if (DOM.btnDeepThink) {
    DOM.btnDeepThink.onclick = () => {
      selectModel('gemini-1.5-flash', true);
      alert('Engine set to Gemini 1.5 Flash (Fast Model (v3) enabled).');
    };
  }

  // Export Conversation to JSON
  if (DOM.btnExportChat) {
    DOM.btnExportChat.onclick = () => {
      const activeChat = state.chats.find(c => c.id === state.activeChatId);
      if (!activeChat || activeChat.messages.length === 0) {
        alert('No conversation content to export.');
        return;
      }
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(activeChat, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `${activeChat.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    };
  }

  // Clear Current Chat Conversation
  if (DOM.btnClearChat) {
    DOM.btnClearChat.onclick = () => {
      const activeChat = state.chats.find(c => c.id === state.activeChatId);
      if (activeChat && confirm('Are you sure you want to clear this conversation feed?')) {
        activeChat.messages = [];
        saveState();
        renderMessages();
      }
    };
  }

  // Theme Toggle Button
  if (DOM.btnThemeToggle) {
    DOM.btnThemeToggle.onclick = toggleTheme;
  }

  // Custom Gem / Project Modal Listeners
  if (DOM.btnOpenGemModal) DOM.btnOpenGemModal.onclick = () => DOM.gemModal.classList.remove('hidden');
  if (DOM.closeGemModal) DOM.closeGemModal.onclick = () => DOM.gemModal.classList.add('hidden');
  if (DOM.cancelGemModal) DOM.cancelGemModal.onclick = () => DOM.gemModal.classList.add('hidden');

  if (DOM.gemForm) {
    DOM.gemForm.onsubmit = (e) => {
      e.preventDefault();
      const name = document.getElementById('gem-name')?.value.trim();
      const icon = document.getElementById('gem-icon')?.value;
      const color = document.getElementById('gem-color')?.value;
      const instructions = document.getElementById('gem-instructions')?.value.trim();

      if (!name) return;

      const newGem = {
        id: 'gem_' + Date.now(),
        name,
        icon: icon || 'sparkles',
        color: color || 'text-gemini-blue',
        instructions
      };

      state.projects.push(newGem);
      saveState();
      renderProjects();
      setProjectActive(newGem.id, true);
      DOM.gemModal.classList.add('hidden');
      DOM.gemForm.reset();
    };
  }

  // Settings Modal Controls
  if (DOM.btnOpenSettings) {
    DOM.btnOpenSettings.onclick = () => {
      if (DOM.apiKeyInput) DOM.apiKeyInput.value = state.settings.apiKey || '';
      if (DOM.globalSystemPrompt) DOM.globalSystemPrompt.value = state.settings.globalPrompt || '';
      DOM.settingsModal.classList.remove('hidden');
    };
  }
  if (DOM.closeSettingsModal) DOM.closeSettingsModal.onclick = () => DOM.settingsModal.classList.add('hidden');
  if (DOM.saveSettingsBtn) {
    DOM.saveSettingsBtn.onclick = () => {
      state.settings.apiKey = DOM.apiKeyInput?.value.trim() || '';
      state.settings.globalPrompt = DOM.globalSystemPrompt?.value.trim() || '';
      saveState();
      DOM.settingsModal.classList.add('hidden');
      alert('Workspace settings saved successfully!');
    };
  }
}
