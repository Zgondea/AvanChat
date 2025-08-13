(function() {
  'use strict';

  console.log('🔧 Chat Widget script loaded');

  // Configuration
  const DEFAULT_CONFIG = {
    apiUrl: 'http://localhost:8000/api/v1',
    municipalityDomain: window.location.hostname,
    municipalityId: null,
    position: 'bottom-right',
    primaryColor: '#1976d2',
    welcomeMessage: 'Bună ziua! Sunt asistentul AI pentru întrebări despre taxe și impozite. Cu ce vă pot ajuta?',
    placeholder: 'Scrieți întrebarea dvs. despre taxe și impozite...',
    title: 'Asistent Legislativ',
    enableSources: true,
    enableTyping: true,
    cssUrl: null, // Auto-detect from script location
  };

  // Global widget instance
  let widgetInstance = null;

  class ChatLegislativWidget {
    constructor(config = {}) {
      this.config = { ...DEFAULT_CONFIG, ...config };
      console.log('🔧 Widget Config:', this.config);
      this.isOpen = false;
      this.isLoading = false;
      this.sessionId = this.generateSessionId();
      this.conversationHistory = [];
      this.municipalityInfo = null;
      
      this.init();
    }

    generateSessionId() {
      return 'session_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    }

    createTopicsMenu() {
      console.log('🎯 Creating topics menu...');
      return `
        <div class="topics-selection">
          <div class="topics-title">Selectați topicul pentru întrebări:</div>
          <div class="topics-grid">
            <button class="topic-card" data-topic="urbanism">
              🏗️ Urbanism
              <small>Autorizații, construcții, amenajări</small>
            </button>
            <button class="topic-card" data-topic="taxe-locale">
              🏛️ Taxe Locale
              <small>Impozite pe clădiri, teren, auto</small>
            </button>
            <button class="topic-card" data-topic="tva">
              💰 TVA
              <small>Cote, calcule, declarații</small>
            </button>
            <button class="topic-card" data-topic="impozite">
              📊 Impozite
              <small>Profit, venit, microîntreprinderi</small>
            </button>
            <button class="topic-card" data-topic="contributii">
              👥 Contribuții
              <small>CAS, CASS, contribuții sociale</small>
            </button>
            <button class="topic-card" data-topic="proceduri">
              📋 Proceduri
              <small>Declarații, termene, documente</small>
            </button>
          </div>
        </div>
      `;
    }

    showQuestionsForTopic(topic) {
      const questions = this.getQuestionsForTopic(topic);
      const topicTitles = {
        'urbanism': '🏗️ Urbanism',
        'taxe-locale': '🏛️ Taxe Locale', 
        'tva': '💰 TVA',
        'impozite': '📊 Impozite',
        'contributii': '👥 Contribuții',
        'proceduri': '📋 Proceduri'
      };

      const questionsHTML = `
        <div class="questions-selection">
          <div class="questions-header">
            <button class="back-to-topics">← Înapoi la topice</button>
            <div class="questions-title">${topicTitles[topic]}</div>
          </div>
          <div class="questions-list">
            ${questions.map((q, i) => `
              <button class="question-btn" data-question="${q}">
                ${i + 1}. ${q}
              </button>
            `).join('')}
            <button class="custom-question-btn" data-topic="${topic}">
              ✏️ Altă întrebare despre ${topicTitles[topic].replace(/[🏗️🏛️💰📊👥📋]\s/, '')}
            </button>
          </div>
        </div>
      `;

      // Resetez atributele pentru event listeners
      this.messagesArea.removeAttribute('data-topics-attached');
      this.messagesArea.removeAttribute('data-questions-attached');

      this.messagesArea.innerHTML = `
        <div class="chat-welcome">
          <h4>Bun venit!</h4>
          <p>${this.config.welcomeMessage}</p>
          ${questionsHTML}
        </div>
      `;

      this.attachQuestionListeners();
    }

    getQuestionsForTopic(topic) {
      const questionsByTopic = {
        'urbanism': [
          'Cum obțin autorizația de construire?',
          'Ce documente trebuie pentru amenajări interioare?', 
          'Care sunt taxele pentru autorizația de construire?',
          'Cum schimb destinația unui imobil?',
          'Ce sancțiuni sunt pentru construcțiile ilegale?'
        ],
        'taxe-locale': [
          'Care sunt taxele locale la primărie?',
          'Cum se calculează taxa pe clădiri?',
          'Când se plătesc taxele locale?',
          'Ce scutiri există pentru pensionari?',
          'Cum contest o taxă locală?'
        ],
        'tva': [
          'Care este cota standard de TVA în România?',
          'Când se aplică cota redusă de TVA?',
          'Ce bunuri sunt scutite de TVA?',
          'Cum funcționează TVA la încasare?',
          'Când se depune declarația de TVA?'
        ],
        'impozite': [
          'Ce este impozitul pe profit?',
          'Care sunt cotele de impozit pe venit?',
          'Cum se calculează impozitul pentru microîntreprinderi?',
          'Ce cheltuieli sunt deductibile?',
          'Când se plătesc impozitele?'
        ],
        'contributii': [
          'Care sunt contribuțiile sociale obligatorii?',
          'Cum se calculează CAS și CASS?',
          'Ce contribuții plătesc freelancerii?',
          'Care sunt plafonele pentru contribuții?',
          'Când se plătesc contribuțiile sociale?'
        ],
        'proceduri': [
          'Ce termene sunt pentru declarații?',
          'Cum depun declarația unică?',
          'Ce documente trebuie pentru scutiri?',
          'Cum înregistrez o firmă?',
          'Unde mă adresez pentru informații fiscale?'
        ]
      };

      return questionsByTopic[topic] || [];
    }

    attachTopicListeners() {
      // Nu adaugă event listeners dacă există deja
      if (this.messagesArea.hasAttribute('data-topics-attached')) {
        return;
      }
      
      // Marchează că event listeners au fost adăugați
      this.messagesArea.setAttribute('data-topics-attached', 'true');
      
      // Ascultă click-urile pe topic cards
      this.messagesArea.addEventListener('click', (e) => {
        const topicCard = e.target.closest('.topic-card');
        if (topicCard) {
          e.preventDefault();
          e.stopPropagation();
          const topic = topicCard.getAttribute('data-topic');
          console.log('🎯 Selected topic:', topic);
          this.showQuestionsForTopic(topic);
        }
      });
    }

    attachQuestionListeners() {
      // Nu adaugă event listeners dacă există deja
      if (this.messagesArea.hasAttribute('data-questions-attached')) {
        return;
      }
      
      // Marchează că event listeners au fost adăugați
      this.messagesArea.setAttribute('data-questions-attached', 'true');
      
      // Ascultă click-urile pe întrebări
      this.messagesArea.addEventListener('click', (e) => {
        // Buton înapoi la topice
        if (e.target.classList.contains('back-to-topics')) {
          e.preventDefault();
          e.stopPropagation();
          console.log('🔙 Going back to topics');
          this.showTopicsMenu();
          return;
        }
        
        // Întrebare predefinită
        if (e.target.classList.contains('question-btn')) {
          e.preventDefault();
          e.stopPropagation();
          const question = e.target.getAttribute('data-question');
          console.log('❓ Sending question:', question);
          this.sendPredefinedQuestion(question);
          return;
        }
        
        // Întrebare custom
        if (e.target.classList.contains('custom-question-btn')) {
          e.preventDefault();
          e.stopPropagation();
          console.log('✏️ Opening custom question input');
          this.showCustomQuestionInput();
          return;
        }
      });
    }

    showTopicsMenu() {
      // Elimină butoanele de navigare existente
      const existingNav = this.messagesArea.querySelector('.navigation-helper');
      if (existingNav) {
        existingNav.remove();
      }
      
      // Resetez atributele pentru event listeners
      this.messagesArea.removeAttribute('data-topics-attached');
      this.messagesArea.removeAttribute('data-questions-attached');
      
      this.messagesArea.innerHTML = `
        <div class="chat-welcome">
          <h4>Bun venit!</h4>
          <p>${this.config.welcomeMessage}</p>
          ${this.createTopicsMenu()}
        </div>
      `;
      this.attachTopicListeners();
    }

    async sendPredefinedQuestion(question) {
      // Previne trimiterea multiplă
      if (this.isLoading) {
        console.log('⚠️ Already processing a question, skipping...');
        return;
      }
      
      console.log('📤 Sending predefined question:', question);
      
      // Ascunde meniul și trimite întrebarea
      this.addUserMessage(question);
      
      // Show loading
      this.setLoading(true);
      
      try {
        const response = await this.sendMessage(question);
        this.addMessage('assistant', response.response, response.sources);
      } catch (error) {
        console.error('Chat error:', error);
        this.addMessage('assistant', 'Îmi pare rău, a apărut o eroare. Vă rog să încercați din nou.', [], true);
      } finally {
        this.setLoading(false);
      }
    }

    showCustomQuestionInput() {
      // Afișează input-ul pentru întrebare custom
      const inputArea = this.container.querySelector('.chat-legislativ-input');
      inputArea.style.display = 'block';
      this.input.focus();
      this.input.placeholder = 'Scrieți întrebarea dvs. personalizată...';
    }

    addNavigationButton() {
      // Creează un buton floating pentru navigare
      const navButton = document.createElement('div');
      navButton.className = 'navigation-helper';
      navButton.innerHTML = `
        <button class="nav-menu-btn" title="Înapoi la meniu topice">
          📋 Meniu Topice
        </button>
        <button class="nav-new-question-btn" title="Pune o întrebare nouă">
          ➕ Întrebare Nouă
        </button>
      `;
      
      // Inserează la începutul zonei de mesaje
      this.messagesArea.insertBefore(navButton, this.messagesArea.firstChild);
      
      // Adaugă event listeners
      navButton.querySelector('.nav-menu-btn').addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.showTopicsMenu();
      });
      
      navButton.querySelector('.nav-new-question-btn').addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.showCustomQuestionInput();
      });
    }

    preventAutoClose() {
      // Protejează doar wrapper-ul general - lasă elementele interne să funcționeze
      this.wrapper.addEventListener('click', (e) => {
        // Oprește propagarea doar pentru click-uri generale, nu pentru butoane specifice
        if (!e.target.classList.contains('topic-card') && 
            !e.target.classList.contains('question-btn') && 
            !e.target.classList.contains('custom-question-btn') && 
            !e.target.classList.contains('back-to-topics') &&
            !e.target.classList.contains('nav-menu-btn') &&
            !e.target.classList.contains('nav-new-question-btn') &&
            !e.target.closest('.topic-card') &&
            !e.target.closest('.question-btn') &&
            !e.target.closest('.custom-question-btn') &&
            !e.target.closest('.back-to-topics') &&
            !e.target.closest('.navigation-helper')) {
          e.stopPropagation();
        }
      });
    }

    async init() {
      console.log('🚀 Starting widget initialization...');
      await this.loadCSS();
      console.log('✅ CSS loaded, fetching municipality info...');
      await this.fetchMunicipalityInfo();
      console.log('✅ Municipality info fetched, creating widget...');
      this.createWidget();
      console.log('✅ Widget created, attaching event listeners...');
      this.attachEventListeners();
      this.attachTopicListeners();
      this.preventAutoClose();
      console.log('✅ Widget initialization complete!');
    }

    async loadCSS() {
      return new Promise((resolve) => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        // Use same directory as the script or configured CSS URL
        const scriptSrc = document.querySelector('script[data-chat-legislativ]')?.src;
        const basePath = scriptSrc ? scriptSrc.replace(/[^/]*$/, '') : './';
        link.href = this.config.cssUrl || `${basePath}fiscal-chat-widget.css`;
        link.onload = () => {
          console.log('✅ CSS loaded successfully from:', link.href);
          resolve();
        };
        link.onerror = (error) => {
          console.error('❌ CSS failed to load from:', link.href, error);
          resolve(); // Continue even if CSS fails to load
        };
        document.head.appendChild(link);
        console.log('🎨 Loading CSS from:', link.href);
      });
    }

    async fetchMunicipalityInfo() {
      try {
        const response = await fetch(`${this.config.apiUrl}/chat/municipalities`);
        const municipalities = await response.json();
        
        if (this.config.municipalityId) {
          this.municipalityInfo = municipalities.find(m => m.id === this.config.municipalityId);
        } else {
          this.municipalityInfo = municipalities.find(m => m.domain === this.config.municipalityDomain);
        }
        
        if (!this.municipalityInfo && municipalities.length > 0) {
          this.municipalityInfo = municipalities[0]; // Fallback to first municipality
        }
      } catch (error) {
        console.warn('Failed to fetch municipality info:', error);
      }
    }

    createWidget() {
      // Create button
      this.button = document.createElement('button');
      this.button.className = 'chat-legislativ-button';
      this.button.innerHTML = '💬';
      this.button.setAttribute('aria-label', 'Deschide chat asistent legislativ');
      console.log('🔘 Button created:', this.button);
      
      // Create container
      this.container = document.createElement('div');
      this.container.className = 'chat-legislativ-container';
      
      // Create header
      const header = document.createElement('div');
      header.className = 'chat-legislativ-header';
      header.innerHTML = `
        <div>
          <h3>${this.config.title}</h3>
          <div class="municipality-info">
            ${this.municipalityInfo ? this.municipalityInfo.name : 'Sistem Chat Legislativ'}
          </div>
        </div>
        <button class="chat-legislativ-close" aria-label="Închide chat">×</button>
      `;
      
      // Create messages area
      this.messagesArea = document.createElement('div');
      this.messagesArea.className = 'chat-legislativ-messages';
      this.messagesArea.innerHTML = `
        <div class="chat-welcome">
          <h4>Bun venit!</h4>
          <p>${this.config.welcomeMessage}</p>
          ${this.createTopicsMenu()}
        </div>
      `;
      
      // Create input area (hidden initially)
      const inputArea = document.createElement('div');
      inputArea.className = 'chat-legislativ-input';
      inputArea.style.display = 'none'; // Ascuns până când se selectează "întrebare custom"
      inputArea.innerHTML = `
        <form class="chat-input-form">
          <textarea 
            class="chat-input-field" 
            placeholder="${this.config.placeholder}"
            rows="1"
            aria-label="Scrieți mesajul dvs."
          ></textarea>
          <button type="submit" class="chat-send-button" aria-label="Trimite mesaj">
            <span>→</span>
          </button>
        </form>
      `;
      
      // Assemble container
      this.container.appendChild(header);
      this.container.appendChild(this.messagesArea);
      this.container.appendChild(inputArea);
      
      // Create wrapper with styles
      this.wrapper = document.createElement('div');
      this.wrapper.className = 'chat-legislativ-widget';
      this.wrapper.appendChild(this.button);
      this.wrapper.appendChild(this.container);
      
      // Apply custom styles
      if (this.config.primaryColor !== DEFAULT_CONFIG.primaryColor) {
        this.wrapper.style.setProperty('--primary-color', this.config.primaryColor);
      }
      
      // Add to page
      document.body.appendChild(this.wrapper);
      console.log('🎯 Widget elements added to DOM:', this.wrapper);
      console.log('🔍 Widget in document:', document.contains(this.wrapper));
      console.log('🏗️ Body children count:', document.body.children.length);
      console.log('📋 Widget classes:', this.wrapper.className);
      console.log('🎯 Widget HTML:', this.wrapper.outerHTML.substring(0, 200));
      
      // Force button visibility for debugging
      this.button.style.cssText = `
        position: fixed !important;
        bottom: 20px !important;
        right: 20px !important;
        width: 60px !important;
        height: 60px !important;
        background: #1976d2 !important;
        color: white !important;
        border: none !important;
        border-radius: 50% !important;
        cursor: pointer !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        font-size: 24px !important;
        z-index: 999999 !important;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15) !important;
      `;
      
      console.log('📏 Widget button size:', this.button.offsetWidth, 'x', this.button.offsetHeight);
      console.log('📐 Widget container size:', this.container.offsetWidth, 'x', this.container.offsetHeight);
      
      // Create a simple test element to verify DOM manipulation works
      const testDiv = document.createElement('div');
      testDiv.id = 'chat-widget-test';
      testDiv.style.cssText = `
        position: fixed !important;
        top: 10px !important;
        left: 10px !important;
        width: 200px !important;
        height: 50px !important;
        background: red !important;
        color: white !important;
        z-index: 999999 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        font-size: 14px !important;
      `;
      testDiv.innerHTML = 'CHAT WIDGET TEST';
      document.body.appendChild(testDiv);
      console.log('🧪 Test element added:', testDiv);
      
      // Get form elements
      this.form = this.container.querySelector('.chat-input-form');
      this.input = this.container.querySelector('.chat-input-field');
      this.sendButton = this.container.querySelector('.chat-send-button');
      this.closeButton = this.container.querySelector('.chat-legislativ-close');
    }

    attachEventListeners() {
      // Button click
      this.button.addEventListener('click', () => this.toggle());
      
      // Close button - funcționează doar pentru butonul X
      this.closeButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        this.close();
      });
      
      // Form submission
      this.form.addEventListener('submit', (e) => this.handleSubmit(e));
      
      // Input auto-resize
      this.input.addEventListener('input', () => this.autoResizeInput());
      
      // Enter key handling
      this.input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.handleSubmit(e);
        }
      });
      
      // Click outside to close
      document.addEventListener('click', (e) => {
        if (this.isOpen && !this.wrapper.contains(e.target)) {
          this.close();
        }
      });
      
      // Escape key to close
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.isOpen) {
          this.close();
        }
      });
    }

    autoResizeInput() {
      this.input.style.height = 'auto';
      this.input.style.height = Math.min(this.input.scrollHeight, 100) + 'px';
    }

    toggle() {
      if (this.isOpen) {
        this.close();
      } else {
        this.open();
      }
    }

    open() {
      this.isOpen = true;
      this.container.classList.add('open');
      this.button.classList.add('opened');
      this.button.innerHTML = '×';
      this.input.focus();
      
      // Scroll to bottom
      setTimeout(() => this.scrollToBottom(), 100);
    }

    close() {
      this.isOpen = false;
      this.container.classList.remove('open');
      this.button.classList.remove('opened');
      this.button.innerHTML = '💬';
    }

    async handleSubmit(e) {
      e.preventDefault();
      
      const message = this.input.value.trim();
      if (!message || this.isLoading) return;
      
      // Add user message
      this.addMessage('user', message);
      this.input.value = '';
      this.autoResizeInput();
      
      // Show loading
      this.setLoading(true);
      
      try {
        const response = await this.sendMessage(message);
        this.addMessage('assistant', response.response, response.sources);
      } catch (error) {
        console.error('Chat error:', error);
        this.addMessage('assistant', 'Îmi pare rău, a apărut o eroare. Vă rog să încercați din nou.', [], true);
      } finally {
        this.setLoading(false);
      }
    }

    async sendMessage(message) {
      console.log('📡 Sending message to API:', message);
      console.log('🔧 API URL:', this.config.apiUrl);
      
      const payload = {
        message: message,
        session_id: this.sessionId,
        conversation_history: this.conversationHistory.slice(-10) // Keep last 10 messages
      };
      
      if (this.municipalityInfo) {
        if (this.config.municipalityId) {
          payload.municipality_id = this.config.municipalityId;
        } else {
          payload.municipality_domain = this.config.municipalityDomain;
        }
      }
      
      console.log('📦 Payload:', payload);
      
      try {
        const response = await fetch(`${this.config.apiUrl}/chat/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
        
        console.log('📡 Response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ API Error:', errorText);
          throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
        }
        
        const result = await response.json();
        console.log('✅ API Response:', result);
        return result;
        
      } catch (error) {
        console.error('💥 Network Error:', error);
        throw error;
      }
    }

    addUserMessage(content) {
      this.addMessage('user', content);
    }

    addMessage(role, content, sources = [], isError = false) {
      const messageElement = document.createElement('div');
      messageElement.className = `chat-message ${role}`;
      
      const avatar = document.createElement('div');
      avatar.className = 'chat-message-avatar';
      avatar.textContent = role === 'user' ? 'D' : '🤖';
      
      const messageContent = document.createElement('div');
      messageContent.className = 'chat-message-content';
      
      if (isError) {
        messageContent.classList.add('chat-error');
      }
      
      // Process content for basic markdown
      const processedContent = this.processContent(content);
      messageContent.innerHTML = processedContent;
      
      // Add timestamp
      const time = document.createElement('div');
      time.className = 'chat-message-time';
      time.textContent = new Date().toLocaleTimeString('ro-RO', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      messageContent.appendChild(time);
      
      // Add sources if enabled and present
      if (this.config.enableSources && sources && sources.length > 0) {
        const sourcesElement = document.createElement('div');
        sourcesElement.className = 'chat-message-sources';
        sourcesElement.innerHTML = `
          <div class="sources-title">Surse:</div>
          ${sources.map(source => 
            `<span class="source-chip" title="${source.document_name}">
              ${source.document_name}${source.page_number ? ` (p.${source.page_number})` : ''}
            </span>`
          ).join('')}
        `;
        messageContent.appendChild(sourcesElement);
      }
      
      messageElement.appendChild(avatar);
      messageElement.appendChild(messageContent);
      
      // Remove welcome message on first user message, dar adaugă buton pentru revenire
      if (role === 'user' && this.conversationHistory.length === 0) {
        const welcome = this.messagesArea.querySelector('.chat-welcome');
        if (welcome) {
          welcome.remove();
          // Adaugă un buton mic pentru a reveni la meniu
          this.addNavigationButton();
        }
      }
      
      this.messagesArea.appendChild(messageElement);
      this.scrollToBottom();
      
      // Update conversation history
      this.conversationHistory.push({ role, content });
    }

    processContent(content) {
      // Basic markdown processing
      return content
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code>$1</code>')
        .replace(/\n/g, '<br>');
    }

    setLoading(loading) {
      this.isLoading = loading;
      this.sendButton.disabled = loading;
      
      // Remove existing loading indicator
      const existingLoader = this.messagesArea.querySelector('.chat-loading');
      if (existingLoader) {
        existingLoader.remove();
      }
      
      if (loading) {
        const loader = document.createElement('div');
        loader.className = 'chat-loading';
        loader.innerHTML = `
          <div class="chat-message-avatar" style="background: #666; color: white;">🤖</div>
          <div>
            Se gândește...
            <div class="chat-loading-dots">
              <div class="chat-loading-dot"></div>
              <div class="chat-loading-dot"></div>
              <div class="chat-loading-dot"></div>
            </div>
          </div>
        `;
        this.messagesArea.appendChild(loader);
        this.scrollToBottom();
      }
    }

    scrollToBottom() {
      this.messagesArea.scrollTop = this.messagesArea.scrollHeight;
    }

    // Public API
    destroy() {
      if (this.wrapper && this.wrapper.parentNode) {
        this.wrapper.parentNode.removeChild(this.wrapper);
      }
      widgetInstance = null;
    }

    updateConfig(newConfig) {
      this.config = { ...this.config, ...newConfig };
    }
  }

  // Global API
  window.ChatLegislativWidget = {
    init: function(config) {
      if (widgetInstance) {
        console.warn('Chat Legislativ Widget is already initialized');
        return widgetInstance;
      }
      
      widgetInstance = new ChatLegislativWidget(config);
      return widgetInstance;
    },
    
    getInstance: function() {
      return widgetInstance;
    },
    
    destroy: function() {
      if (widgetInstance) {
        widgetInstance.destroy();
      }
    }
  };

  // Auto-init if data attributes are present
  document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 DOM Content Loaded, initializing widget...');
    const scriptTag = document.querySelector('script[data-chat-legislativ]');
    console.log('📜 Script tag found:', scriptTag);
    if (scriptTag) {
      const config = {};
      
      // Extract config from data attributes
      if (scriptTag.dataset.apiUrl) config.apiUrl = scriptTag.dataset.apiUrl;
      if (scriptTag.dataset.municipalityId) config.municipalityId = scriptTag.dataset.municipalityId;
      if (scriptTag.dataset.municipalityDomain) config.municipalityDomain = scriptTag.dataset.municipalityDomain;
      if (scriptTag.dataset.primaryColor) config.primaryColor = scriptTag.dataset.primaryColor;
      if (scriptTag.dataset.title) config.title = scriptTag.dataset.title;
      if (scriptTag.dataset.welcomeMessage) config.welcomeMessage = scriptTag.dataset.welcomeMessage;
      if (scriptTag.dataset.cssUrl) config.cssUrl = scriptTag.dataset.cssUrl;
      
      console.log('📋 Extracted config from data attributes:', config);
      try {
        window.ChatLegislativWidget.init(config);
        console.log('✅ Widget initialized successfully');
      } catch (error) {
        console.error('💥 Widget initialization failed:', error);
      }
    } else {
      console.log('❌ No script tag with data-chat-legislativ found');
    }
  });

})();