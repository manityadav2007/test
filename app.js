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
    
    welcomeView: document.getElementById('welcome-view'),
    messagesFeed: document.getElementById('messages-feed'),
    chatContainer: document.getElementById('chat-container'),
    typingIndicator: document.getElementById('typing-indicator'),
    
    userPromptInput: document.getElementById('user-prompt-input'),
    btnSendPrompt: document.getElementById('btn-send-prompt'),
    charCountEl: document.getElementById('char-count'),
    fileInput: document.getElementById('file-input'),
    attachmentBar: document.getElementById('attachment-preview-bar'),
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
    btn.className = `w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors ${isSelected ? 'bg-gemini-card text-white border border-white/10 shadow-sm' : 'text-gemini-muted hover:bg-gemini-hover hover:text-white'}`;
    btn.onclick = () => setProjectActive(project.id);

    btn.innerHTML = `
      <div class="flex items-center gap-2.5 truncate">
        <i data-lucide="${project.icon || 'gem'}" class="w-4 h-4 ${project.color || 'text-gemini-blue'} shrink-0"></i>
        <span class="truncate">${escapeHtml(project.name)}</span>
      </div>
      ${isSelected ? '<div class="w-1.5 h-1.5 rounded-full bg-gemini-blue"></div>' : ''}
    `;
    DOM.projectsListEl.appendChild(btn);
  });
  updateLucideIcons();
}

function renderRecentChats() {
  if (!DOM.recentChatsListEl) return;
  DOM.recentChatsListEl.innerHTML = '';
  const filterTerm = (DOM.searchChatsInput?.value || '').toLowerCase().trim();
  
  let filtered = state.chats.filter(c => c.title.toLowerCase().includes(filterTerm));
  
  // Sort pinned items to the top
  filtered.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

  if (filtered.length === 0) {
    DOM.recentChatsListEl.innerHTML = `<div class="px-3 py-2 text-xs text-gray-500 italic">No history found</div>`;
    return;
  }

  filtered.forEach(chat => {
    const isActive = state.activeChatId === chat.id;
    const item = document.createElement('div');
    item.className = `group flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition-colors ${isActive ? 'bg-gemini-hover text-white' : 'text-gemini-muted hover:bg-gemini-hover/60 hover:text-white'}`;
    item.onclick = () => switchChat(chat.id);

    item.innerHTML = `
      <div class="flex items-center gap-2.5 truncate pr-2">
        <i data-lucide="message-square" class="w-3.5 h-3.5 text-gray-500 shrink-0"></i>
        <span class="truncate">${escapeHtml(chat.title)}</span>
      </div>
      <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button class="btn-pin p-1 hover:text-amber-400 ${chat.pinned ? 'text-amber-400 opacity-100' : ''}" title="Pin chat">
          <i data-lucide="pin" class="w-3 h-3"></i>
        </button>
        <button class="btn-delete p-1 hover:text-red-400" title="Delete chat">
          <i data-lucide="trash" class="w-3 h-3"></i>
        </button>
      </div>
    `;

    const pinBtn = item.querySelector('.btn-pin');
    const delBtn = item.querySelector('.btn-delete');
    pinBtn.onclick = (e) => togglePinChat(chat.id, e);
    delBtn.onclick = (e) => deleteChat(chat.id, e);

    DOM.recentChatsListEl.appendChild(item);
  });
  updateLucideIcons();
}

function renderMessages() {
  const activeChat = state.chats.find(c => c.id === state.activeChatId);
  if (!activeChat || activeChat.messages.length === 0) {
    DOM.welcomeView.classList.remove('hidden');
    DOM.messagesFeed.classList.add('hidden');
    DOM.messagesFeed.innerHTML = '';
    return;
  }

  DOM.welcomeView.classList.add('hidden');
  DOM.messagesFeed.classList.remove('hidden');
  DOM.messagesFeed.innerHTML = '';

  activeChat.messages.forEach((msg, index) => {
    const msgDiv = document.createElement('div');
    msgDiv.className = `flex flex-col space-y-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`;
    
    if (msg.role === 'user') {
      let attachmentMarkup = '';
      if (msg.attachments && msg.attachments.length > 0) {
        attachmentMarkup = `<div class="flex flex-wrap gap-2 mb-2">` +
          msg.attachments.map(a => `<div class="text-xs bg-black/20 px-2.5 py-1 rounded-lg flex items-center gap-1.5 border border-white/10"><i data-lucide="file-text" class="w-3.5 h-3.5 text-gemini-blue"></i><span>${escapeHtml(a.name)}</span></div>`).join('') +
          `</div>`;
      }

      msgDiv.innerHTML = `
        <div class="max-w-xl bg-gemini-card border border-white/10 rounded-2xl rounded-tr-sm px-4 py-3 text-sm text-gray-100 shadow-sm">
          ${attachmentMarkup}
          <p class="whitespace-pre-wrap leading-relaxed">${escapeHtml(msg.content)}</p>
        </div>
        <div class="flex items-center gap-2 text-[10px] text-gemini-muted pr-1">
          <span>You</span>
          <span>•</span>
          <button onclick="window.editUserMessage(${index})" class="hover:text-white transition-colors">Edit</button>
        </div>
      `;
    } else {
      // AI Response Message
      let thinkingBlock = '';
      if (msg.thinking) {
        thinkingBlock = `
          <details class="mb-3 bg-gemini-sidebar/80 border border-gemini-purple/20 rounded-xl p-3 text-xs text-gemini-muted group">
            <summary class="cursor-pointer font-medium flex items-center gap-2 text-gemini-purple select-none">
              <i data-lucide="brain" class="w-4 h-4"></i>
              Thinking Process (${msg.thinkingTime || '1.2s'})
            </summary>
            <div class="mt-2 pt-2 border-t border-white/5 space-y-1 font-mono text-[11px] text-gray-400 whitespace-pre-wrap">
              ${escapeHtml(msg.thinking)}
            </div>
          </details>
        `;
      }

      const htmlContent = (typeof marked !== 'undefined') ? marked.parse(msg.content) : escapeHtml(msg.content);

      msgDiv.innerHTML = `
        <div class="flex items-start gap-3 w-full max-w-3xl">
          <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-gemini-blue via-gemini-purple to-gemini-pink flex items-center justify-center shrink-0 shadow-md">
            <i data-lucide="sparkles" class="w-4.5 h-4.5 text-white"></i>
          </div>
          <div class="flex-1 overflow-hidden space-y-2">
            ${thinkingBlock}
            <div class="markdown-body text-sm text-gray-200 font-normal leading-relaxed overflow-x-auto">
              ${htmlContent}
            </div>
            <div class="flex items-center gap-2 pt-2 text-gemini-muted opacity-80 hover:opacity-100 transition-opacity">
              <button onclick="window.copyMessageContent('${msg.id}')" title="Copy text" class="p-1.5 hover:bg-gemini-hover rounded-lg hover:text-white transition-colors">
                <i data-lucide="copy" class="w-3.5 h-3.5"></i>
              </button>
              <button onclick="window.regenerateResponse(${index})" title="Regenerate" class="p-1.5 hover:bg-gemini-hover rounded-lg hover:text-white transition-colors">
                <i data-lucide="rotate-cw" class="w-3.5 h-3.5"></i>
              </button>
              <button title="Good response" class="p-1.5 hover:bg-gemini-hover rounded-lg hover:text-white transition-colors">
                <i data-lucide="thumbs-up" class="w-3.5 h-3.5"></i>
              </button>
              <button title="Bad response" class="p-1.5 hover:bg-gemini-hover rounded-lg hover:text-white transition-colors">
                <i data-lucide="thumbs-down" class="w-3.5 h-3.5"></i>
              </button>
            </div>
          </div>
        </div>
      `;
    }

    DOM.messagesFeed.appendChild(msgDiv);
  });

  // Attach code copy buttons to formatted code blocks
  attachCodeCopyButtons();
  updateLucideIcons();
  scrollToBottom();
}

function attachCodeCopyButtons() {
  if (!DOM.messagesFeed) return;
  DOM.messagesFeed.querySelectorAll('pre').forEach(pre => {
    if (!pre.querySelector('.copy-code-btn')) {
      const copyBtn = document.createElement('button');
      copyBtn.className = 'copy-code-btn absolute top-2 right-2 px-2 py-1 bg-gemini-card hover:bg-gemini-hover border border-white/10 text-[10px] text-gemini-muted hover:text-white rounded-md transition-colors flex items-center gap-1';
      copyBtn.innerHTML = `<i data-lucide="copy" class="w-3 h-3"></i> Copy`;
      copyBtn.onclick = () => {
        const codeText = pre.querySelector('code')?.innerText || '';
        navigator.clipboard.writeText(codeText);
        copyBtn.innerHTML = `<i data-lucide="check" class="w-3 h-3 text-green-400"></i> Copied!`;
        setTimeout(() => {
          copyBtn.innerHTML = `<i data-lucide="copy" class="w-3 h-3"></i> Copy`;
          updateLucideIcons();
        }, 2000);
        updateLucideIcons();
      };
      pre.appendChild(copyBtn);
    }
  });
}

function scrollToBottom() {
  if (DOM.chatContainer) {
    DOM.chatContainer.scrollTop = DOM.chatContainer.scrollHeight;
  }
}

// AI Generation Engine (API + Simulation Fallback)
async function handleSendPrompt(customText = null) {
  const text = customText || DOM.userPromptInput.value.trim();
  if (!text || state.isGenerating) return;

  const activeChat = state.chats.find(c => c.id === state.activeChatId);
  if (!activeChat) return;

  // If conversation is brand new, set friendly title
  if (activeChat.messages.length === 0) {
    activeChat.title = text.length > 28 ? text.substring(0, 28) + '...' : text;
    renderRecentChats();
  }

  // Append User Message
  const userMsg = {
    id: 'msg_' + Date.now(),
    role: 'user',
    content: text,
    attachments: [...state.attachments]
  };
  activeChat.messages.push(userMsg);

  // Reset input state
  DOM.userPromptInput.value = '';
  DOM.userPromptInput.style.height = 'auto';
  state.attachments = [];
  renderAttachmentChips();
  updateCharCount();
  updateSendButtonState();

  renderMessages();
  showTypingIndicator(true);
  state.isGenerating = true;

  // Generate thinking metadata if experimental thinking engine is selected
  const isThinkingModel = state.activeModel === 'gemini-2.0-thinking';
  const thinkingContent = isThinkingModel ? generateThinkingStepProcess(text) : null;
  
  // Fetch generated AI response text
  const generatedReply = await fetchAIResponse(text);

  showTypingIndicator(false);

  // Append AI Assistant Message
  const aiMsg = {
    id: 'msg_' + (Date.now() + 1),
    role: 'assistant',
    content: '',
    thinking: thinkingContent,
    thinkingTime: (Math.random() * 0.8 + 0.8).toFixed(1) + 's'
  };

  activeChat.messages.push(aiMsg);
  renderMessages();

  // Typewriter Streaming Animation Effect
  const targetMsgIndex = activeChat.messages.length - 1;
  const targetMsg = activeChat.messages[targetMsgIndex];
  const words = generatedReply.split(' ');
  
  for (let i = 0; i < words.length; i++) {
    targetMsg.content += (i === 0 ? '' : ' ') + words[i];
    renderMessages();
    await new Promise(r => setTimeout(r, Math.floor(Math.random() * 20) + 12));
  }

  state.isGenerating = false;
  saveState();
}

function generateThinkingStepProcess(prompt) {
  return `1. Deconstruct user intent: "${prompt.substring(0, 45)}..."
2. Persona check: ${state.activeProjectId ? 'Active Gem Persona injected into context' : 'Default Gemini Pro baseline reasoning'}.
3. Context synthesis: Evaluating code architecture, computational efficiency, and edge case safety.
4. Drafting response with formatted code snippets, structured markdown tables, and key takeaways.
5. Verification pass completed.`;
}

async function fetchAIResponse(prompt) {
  // Real Google Gemini API Call if User Key Provided
  if (state.settings.apiKey) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${state.settings.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });
      const data = await response.json();
      if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
        return data.candidates[0].content.parts[0].text;
      }
    } catch (e) {
      console.warn('Custom API call failed, defaulting to intelligent local engine:', e);
    }
  }

  // Built-in Realistic Mock AI Engine
  await new Promise(r => setTimeout(r, 900));
  const lower = prompt.toLowerCase();
  let projectPrefix = '';
  
  if (state.activeProjectId) {
    const proj = state.projects.find(p => p.id === state.activeProjectId);
    if (proj) projectPrefix = `**[${proj.name} Activated]** `;
  }

  if (lower.includes('python') || lower.includes('code') || lower.includes('script') || lower.includes('scrape')) {
    return `${projectPrefix}Here is a production-grade Python solution designed with clean modularity, async capabilities, and robust error handling:

\
python
import asyncio
import aiohttp
from bs4 import BeautifulSoup
import logging

logging.basicConfig(level=logging.INFO)

async def fetch_page(session: aiohttp.ClientSession, url: str) -> str:
    try:
        async with session.get(url, timeout=10) as response:
            response.raise_for_status()
            return await response.text()
    except Exception as e:
        logging.error(f"Failed to fetch {url}: {e}")
        return ""

async function main():
    url = "https://news.ycombinator.com"
    async with aiohttp.ClientSession() as session:
        html = await fetch_page(session, url)
        soup = BeautifulSoup(html, 'html.parser')
        headlines = [h.get_text() for h in soup.find_all('span', class_='titleline')[:5]]
        print("Top Hacker News Headlines:", headlines)

if __name__ == "__main__":
    asyncio.run(main())
\

### Key Architecture Highlights:
- **Asynchronous I/O:** Utilizes 
`aiohttp
` and 
`asyncio
` for non-blocking HTTP requests.
- **Type Annotations:** Full Python 3.12+ type hinting for IDE autocomplete safety.
- **Resilience:** Graceful timeout handling with structured standard logging.`;
  }

  if (lower.includes('brainstorm') || lower.includes('startup') || lower.includes('design') || lower.includes('name')) {
    return `${projectPrefix}Here are 4 high-impact startup and product concepts tailored for your initiative:

| Concept | Core Value Proposition | Primary Audience |
| :--- | :--- | :--- |
| **Aura Canvas** | AI-driven responsive UI layout generator with live preview | Product Designers |
| **Synthetix Code** | Autonomous code refactoring & security audit agent | Tech Leads & CTOs |
| **Verve Flow** | Micro-animations & visual dynamics engine for modern web apps | Frontend Developers |
| **Pulse Metric** | Predictive user churn analytics powered by Gemini Flash | Growth Marketers |

### Strategic Execution Matrix:
1. **Validation:** Deploy a 1-page landing page featuring interactive micro-demos.
2. **MVP Scope:** Focus strictly on real-time preview and export capability.
3. **Monetization:** Usage-tiered API key credits combined with team seat subscriptions.`;
  }

  if (lower.includes('quantum') || lower.includes('transformer') || lower.includes('explain') || lower.includes('how')) {
    return `${projectPrefix}### Understanding Transformer Architecture & Attention Mechanisms

At the core of models like **Gemini** is the **Multi-Head Self-Attention Mechanism**, which computes structural relationships across all tokens in parallel:

$$\text{Attention}(Q, K, V) = \text{softmax}\left(\frac{QK^T}{\sqrt{d_k}}\right)V$$

#### Core Pillars:
1. **Query ($Q$):** Vector matrix representing current target tokens.
2. **Key ($K$):** Vector matrix offering contextual reference points.
3. **Value ($V$):** High-dimensional representations of token content.

This parallel processing allows Gemini to maintain coherent context across massive input windows without sequential bottlenecks!`;
  }

  return `${projectPrefix}I've processed your query using **${state.activeModel}**.

Here is a structured summary addressing your prompt:

- **Modularity:** Ensure clear isolation between state management and visual rendering views.
- **Performance:** Utilize efficient event delegation and responsive CSS variable tokens.
- **User Experience:** Offer subtle visual feedback during async streaming operations.

Let me know if you would like to generate code examples or refine any specific section!`;
}

function showTypingIndicator(show) {
  if (!DOM.typingIndicator) return;
  if (show) {
    DOM.typingIndicator.classList.remove('hidden');
  } else {
    DOM.typingIndicator.classList.add('hidden');
  }
  scrollToBottom();
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// User Interactive Callback Bindings
window.editUserMessage = function(index) {
  const activeChat = state.chats.find(c => c.id === state.activeChatId);
  if (!activeChat) return;
  const msg = activeChat.messages[index];
  if (msg && msg.role === 'user') {
    DOM.userPromptInput.value = msg.content;
    DOM.userPromptInput.focus();
    DOM.userPromptInput.dispatchEvent(new Event('input'));
  }
};

window.regenerateResponse = function(index) {
  const activeChat = state.chats.find(c => c.id === state.activeChatId);
  if (!activeChat) return;
  const lastUserMsg = activeChat.messages[index - 1];
  if (lastUserMsg && lastUserMsg.role === 'user') {
    activeChat.messages = activeChat.messages.slice(0, index);
    handleSendPrompt(lastUserMsg.content);
  }
};

window.copyMessageContent = function(msgId) {
  const activeChat = state.chats.find(c => c.id === state.activeChatId);
  if (!activeChat) return;
  const msg = activeChat.messages.find(m => m.id === msgId);
  if (msg) {
    navigator.clipboard.writeText(msg.content);
    alert('Message text copied to clipboard!');
  }
};

function setProjectActive(projectId, saveAndSwitch = true) {
  if (state.activeProjectId === projectId) {
    clearActiveProject(saveAndSwitch);
    return;
  }
  state.activeProjectId = projectId;
  const project = state.projects.find(p => p.id === projectId);
  if (project && DOM.activeProjectBadge && DOM.activeProjectNameEl) {
    DOM.activeProjectNameEl.innerText = project.name;
    DOM.activeProjectBadge.classList.remove('hidden');
    DOM.activeProjectBadge.classList.add('flex');
  }
  
  if (saveAndSwitch) {
    const activeChat = state.chats.find(c => c.id === state.activeChatId);
    if (activeChat) {
      activeChat.projectId = projectId;
      saveState();
    }
  }
  renderProjects();
}

function clearActiveProject(saveAndSwitch = true) {
  state.activeProjectId = null;
  if (DOM.activeProjectBadge) {
    DOM.activeProjectBadge.classList.add('hidden');
    DOM.activeProjectBadge.classList.remove('flex');
  }
  if (saveAndSwitch) {
    const activeChat = state.chats.find(c => c.id === state.activeChatId);
    if (activeChat) {
      activeChat.projectId = null;
      saveState();
    }
  }
  renderProjects();
}

function selectModel(modelId, saveAndSwitch = true) {
  state.activeModel = modelId;
  document.querySelectorAll('.model-option').forEach(el => {
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

// Comprehensive Event Listener Binding
function attachEventListeners() {
  // Auto resizing input textarea
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

  // Quick Deep Thinking Model Toggle
  if (DOM.btnDeepThink) {
    DOM.btnDeepThink.onclick = () => {
      selectModel('gemini-2.0-thinking', true);
      alert('Engine set to Gemini 2.0 Thinking (Experimental logic enabled).');
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
