(function() {
  'use strict';

  // Global widget instance
  let widgetInstance = null;

  class ChatLegislativWidget {
    constructor(config = {}) {
      this.config = {
        apiUrl: 'http://localhost/api/v1',
        municipalityDomain: 'pmb.ro',
        title: 'Asistent Fiscal Demo',
        welcomeMessage: 'Bună ziua! Selectați un topic pentru a începe!',
        primaryColor: '#1976d2',
        ...config
      };
      
      this.isOpen = false;
      this.isLoading = false;
      this.sessionId = this.generateSessionId();
      this.conversationHistory = [];
      
      this.createWidget();
      this.attachEventListeners();
    }

    generateSessionId() {
      return 'session_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    }

    createWidget() {
      // Create button
      this.button = document.createElement('button');
      this.button.innerHTML = '💬';
      this.button.style.cssText = `
        position: fixed !important;
        bottom: 20px !important;
        right: 20px !important;
        width: 60px !important;
        height: 60px !important;
        background: ${this.config.primaryColor} !important;
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
        transition: all 0.3s ease !important;
      `;
      
      // Create container
      this.container = document.createElement('div');
      this.container.style.cssText = `
        position: fixed !important;
        bottom: 90px !important;
        right: 20px !important;
        width: 350px !important;
        height: 500px !important;
        background: white !important;
        border-radius: 12px !important;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15) !important;
        display: none !important;
        flex-direction: column !important;
        z-index: 999998 !important;
        overflow: hidden !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      `;
      
      // Create header
      const header = document.createElement('div');
      header.style.cssText = `
        background: ${this.config.primaryColor} !important;
        color: white !important;
        padding: 16px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
      `;
      header.innerHTML = `
        <div>
          <h3 style="margin: 0; font-size: 16px; font-weight: 600;">${this.config.title}</h3>
        </div>
        <button class="close-btn" style="background: none; border: none; color: white; font-size: 20px; cursor: pointer; padding: 4px; border-radius: 4px;">×</button>
      `;
      
      // Create messages area
      this.messagesArea = document.createElement('div');
      this.messagesArea.style.cssText = `
        flex: 1 !important;
        padding: 16px !important;
        overflow-y: auto !important;
        background: #fafafa !important;
      `;
      this.messagesArea.innerHTML = this.createTopicsMenu();
      
      // Assemble
      this.container.appendChild(header);
      this.container.appendChild(this.messagesArea);
      
      // Add to page
      document.body.appendChild(this.button);
      document.body.appendChild(this.container);
      
      console.log('✅ Working widget created and added to DOM');
    }

    createTopicsMenu() {
      return `
        <div style="text-align: center; color: #666;">
          <h4 style="margin: 0 0 8px 0; color: ${this.config.primaryColor}; font-size: 16px;">${this.config.title}</h4>
          <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.4;">${this.config.welcomeMessage}</p>
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 15px;">
            <button class="topic-card" data-topic="urbanism" style="background: linear-gradient(135deg, ${this.config.primaryColor}, #1565c0); color: white; border: none; border-radius: 12px; padding: 15px 10px; cursor: pointer; text-align: center; font-size: 14px; font-weight: 600; line-height: 1.3; min-height: 80px; display: flex; flex-direction: column; justify-content: center; transition: all 0.3s ease;">
              🏗️ Urbanism<br><small style="font-size: 11px; font-weight: 400; margin-top: 5px; opacity: 0.9;">Autorizații, construcții</small>
            </button>
            <button class="topic-card" data-topic="taxe-locale" style="background: linear-gradient(135deg, ${this.config.primaryColor}, #1565c0); color: white; border: none; border-radius: 12px; padding: 15px 10px; cursor: pointer; text-align: center; font-size: 14px; font-weight: 600; line-height: 1.3; min-height: 80px; display: flex; flex-direction: column; justify-content: center; transition: all 0.3s ease;">
              🏛️ Taxe Locale<br><small style="font-size: 11px; font-weight: 400; margin-top: 5px; opacity: 0.9;">Impozite pe clădiri, auto</small>
            </button>
            <button class="topic-card" data-topic="tva" style="background: linear-gradient(135deg, ${this.config.primaryColor}, #1565c0); color: white; border: none; border-radius: 12px; padding: 15px 10px; cursor: pointer; text-align: center; font-size: 14px; font-weight: 600; line-height: 1.3; min-height: 80px; display: flex; flex-direction: column; justify-content: center; transition: all 0.3s ease;">
              💰 TVA<br><small style="font-size: 11px; font-weight: 400; margin-top: 5px; opacity: 0.9;">Cote, calcule, declarații</small>
            </button>
            <button class="topic-card" data-topic="impozite" style="background: linear-gradient(135deg, ${this.config.primaryColor}, #1565c0); color: white; border: none; border-radius: 12px; padding: 15px 10px; cursor: pointer; text-align: center; font-size: 14px; font-weight: 600; line-height: 1.3; min-height: 80px; display: flex; flex-direction: column; justify-content: center; transition: all 0.3s ease;">
              📊 Impozite<br><small style="font-size: 11px; font-weight: 400; margin-top: 5px; opacity: 0.9;">Profit, venit, micro</small>
            </button>
            <button class="topic-card" data-topic="contributii" style="background: linear-gradient(135deg, ${this.config.primaryColor}, #1565c0); color: white; border: none; border-radius: 12px; padding: 15px 10px; cursor: pointer; text-align: center; font-size: 14px; font-weight: 600; line-height: 1.3; min-height: 80px; display: flex; flex-direction: column; justify-content: center; transition: all 0.3s ease;">
              👥 Contribuții<br><small style="font-size: 11px; font-weight: 400; margin-top: 5px; opacity: 0.9;">CAS, CASS, sociale</small>
            </button>
            <button class="topic-card" data-topic="proceduri" style="background: linear-gradient(135deg, ${this.config.primaryColor}, #1565c0); color: white; border: none; border-radius: 12px; padding: 15px 10px; cursor: pointer; text-align: center; font-size: 14px; font-weight: 600; line-height: 1.3; min-height: 80px; display: flex; flex-direction: column; justify-content: center; transition: all 0.3s ease;">
              📋 Proceduri<br><small style="font-size: 11px; font-weight: 400; margin-top: 5px; opacity: 0.9;">Declarații, termene</small>
            </button>
          </div>
        </div>
      `;
    }

    attachEventListeners() {
      // Button click
      this.button.addEventListener('click', () => this.toggle());
      
      // Close button
      this.container.querySelector('.close-btn').addEventListener('click', () => this.close());
      
      // Topic cards
      this.messagesArea.addEventListener('click', (e) => {
        if (e.target.closest('.topic-card')) {
          e.preventDefault();
          e.stopPropagation();
          const topic = e.target.closest('.topic-card').getAttribute('data-topic');
          this.showQuestionsForTopic(topic);
        }
      });
      
      // Click outside to close
      document.addEventListener('click', (e) => {
        if (this.isOpen && !this.button.contains(e.target) && !this.container.contains(e.target)) {
          this.close();
        }
      });
    }

    showQuestionsForTopic(topic) {
      const questions = {
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

      const topicTitles = {
        'urbanism': '🏗️ Urbanism',
        'taxe-locale': '🏛️ Taxe Locale', 
        'tva': '💰 TVA',
        'impozite': '📊 Impozite',
        'contributii': '👥 Contribuții',
        'proceduri': '📋 Proceduri'
      };

      const questionsHTML = `
        <div style="text-align: left;">
          <div style="display: flex; align-items: center; margin-bottom: 15px; gap: 10px;">
            <button class="back-to-topics" style="background: #f5f5f5; border: none; border-radius: 8px; padding: 8px 12px; font-size: 14px; cursor: pointer; color: #666;">← Înapoi</button>
            <div style="font-size: 16px; font-weight: 600; color: #333;">${topicTitles[topic]}</div>
          </div>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            ${questions[topic].map((q, i) => `
              <button class="question-btn" data-question="${q}" style="background: white; border: 2px solid #e0e0e0; border-radius: 10px; padding: 12px 15px; text-align: left; cursor: pointer; font-size: 14px; line-height: 1.4; transition: all 0.3s ease;">
                ${i + 1}. ${q}
              </button>
            `).join('')}
          </div>
        </div>
      `;

      this.messagesArea.innerHTML = questionsHTML;
      this.attachQuestionListeners();
    }

    attachQuestionListeners() {
      this.messagesArea.addEventListener('click', (e) => {
        if (e.target.classList.contains('back-to-topics')) {
          e.preventDefault();
          e.stopPropagation();
          this.messagesArea.innerHTML = this.createTopicsMenu();
        }
        
        if (e.target.classList.contains('question-btn')) {
          e.preventDefault();
          e.stopPropagation();
          const question = e.target.getAttribute('data-question');
          this.askQuestion(question);
        }
      });
    }

    async askQuestion(question) {
      if (this.isLoading) return;
      
      this.addMessage('user', question);
      this.setLoading(true);
      
      // Optimizare: timeout de 30 secunde pentru răspuns rapid
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      try {
        console.log('🚀 Sending question to API:', question);
        
        const response = await fetch(`${this.config.apiUrl}/chat/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: question,
            session_id: this.sessionId,
            municipality_domain: this.config.municipalityDomain
          }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const result = await response.json();
        console.log('✅ Got response:', result);
        this.addMessage('assistant', result.response, result.sources);
        
      } catch (error) {
        clearTimeout(timeoutId);
        console.error('❌ Chat error:', error);
        
        if (error.name === 'AbortError') {
          this.addMessage('assistant', 'Răspunsul durează prea mult. Vă rog să încercați din nou cu o întrebare mai simplă.', [], true);
        } else {
          this.addMessage('assistant', 'Îmi pare rău, a apărut o eroare. Vă rog să încercați din nou.', [], true);
        }
      } finally {
        this.setLoading(false);
      }
    }

    addMessage(role, content, sources = [], isError = false) {
      const messageDiv = document.createElement('div');
      messageDiv.style.cssText = `
        margin-bottom: 12px !important;
        display: flex !important;
        align-items: flex-start !important;
        gap: 8px !important;
        ${role === 'user' ? 'flex-direction: row-reverse !important;' : ''}
      `;
      
      const avatar = document.createElement('div');
      avatar.style.cssText = `
        width: 32px !important;
        height: 32px !important;
        border-radius: 50% !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        font-size: 14px !important;
        font-weight: bold !important;
        flex-shrink: 0 !important;
        ${role === 'user' ? `background: ${this.config.primaryColor} !important; color: white !important;` : 'background: #666 !important; color: white !important;'}
      `;
      avatar.textContent = role === 'user' ? 'D' : '🤖';
      
      const messageContent = document.createElement('div');
      messageContent.style.cssText = `
        ${role === 'user' ? `background: ${this.config.primaryColor} !important; color: white !important;` : 'background: white !important;'}
        padding: 12px !important;
        border-radius: 12px !important;
        max-width: 80% !important;
        word-wrap: break-word !important;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1) !important;
        ${isError ? 'background: #ffebee !important; color: #c62828 !important;' : ''}
      `;
      messageContent.innerHTML = content.replace(/\n/g, '<br>');
      
      messageDiv.appendChild(avatar);
      messageDiv.appendChild(messageContent);
      
      // Clear welcome on first user message
      if (role === 'user' && this.conversationHistory.length === 0) {
        this.messagesArea.innerHTML = '';
      }
      
      this.messagesArea.appendChild(messageDiv);
      
      // Add navigation buttons after assistant response
      if (role === 'assistant') {
        this.addNavigationButtons();
      }
      
      this.messagesArea.scrollTop = this.messagesArea.scrollHeight;
      this.conversationHistory.push({ role, content });
    }

    addNavigationButtons() {
      const navDiv = document.createElement('div');
      navDiv.className = 'navigation-buttons';
      navDiv.style.cssText = `
        display: flex !important;
        gap: 8px !important;
        padding: 10px !important;
        background: linear-gradient(135deg, #f8f9fa, #e9ecef) !important;
        border-radius: 10px !important;
        margin: 15px 0 !important;
        border: 1px solid #dee2e6 !important;
      `;
      navDiv.innerHTML = `
        <button class="nav-menu-btn" style="flex: 1; background: white; border: 1px solid #ced4da; border-radius: 8px; padding: 8px 12px; font-size: 12px; cursor: pointer; font-weight: 500; transition: all 0.3s ease;">
          📋 Înapoi la Meniu
        </button>
        <button class="nav-new-question-btn" style="flex: 1; background: white; border: 1px solid #ced4da; border-radius: 8px; padding: 8px 12px; font-size: 12px; cursor: pointer; font-weight: 500; transition: all 0.3s ease;">
          ➕ Altă Întrebare
        </button>
      `;
      
      // Add event listeners
      navDiv.querySelector('.nav-menu-btn').addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.messagesArea.innerHTML = this.createTopicsMenu();
      });
      
      navDiv.querySelector('.nav-new-question-btn').addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.messagesArea.innerHTML = this.createTopicsMenu();
      });
      
      this.messagesArea.appendChild(navDiv);
    }

    setLoading(loading) {
      this.isLoading = loading;
      if (loading) {
        const loader = document.createElement('div');
        loader.className = 'chat-loading';
        loader.style.cssText = `
          display: flex !important;
          align-items: center !important;
          gap: 8px !important;
          padding: 12px !important;
          color: #666 !important;
          font-size: 14px !important;
        `;
        loader.innerHTML = 'Se gândește... <div style="display: flex; gap: 2px;"><div style="width: 6px; height: 6px; background: #666; border-radius: 50%; animation: loading 1.4s ease-in-out infinite both; animation-delay: -0.32s;"></div><div style="width: 6px; height: 6px; background: #666; border-radius: 50%; animation: loading 1.4s ease-in-out infinite both; animation-delay: -0.16s;"></div><div style="width: 6px; height: 6px; background: #666; border-radius: 50%; animation: loading 1.4s ease-in-out infinite both;"></div></div>';
        this.messagesArea.appendChild(loader);
        this.messagesArea.scrollTop = this.messagesArea.scrollHeight;
      } else {
        const loader = this.messagesArea.querySelector('.chat-loading');
        if (loader) loader.remove();
      }
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
      this.container.style.display = 'flex';
      this.button.innerHTML = '×';
      this.button.style.background = '#666';
    }

    close() {
      this.isOpen = false;
      this.container.style.display = 'none';
      this.button.innerHTML = '💬';
      this.button.style.background = this.config.primaryColor;
    }
  }

  // Add loading animation CSS
  const style = document.createElement('style');
  style.textContent = `
    @keyframes loading {
      0%, 80%, 100% { transform: scale(0); }
      40% { transform: scale(1); }
    }
  `;
  document.head.appendChild(style);

  // Auto-init
  document.addEventListener('DOMContentLoaded', function() {
    const scriptTag = document.querySelector('script[data-chat-legislativ]');
    let config = {};
    
    if (scriptTag) {
      if (scriptTag.dataset.apiUrl) config.apiUrl = scriptTag.dataset.apiUrl;
      if (scriptTag.dataset.municipalityDomain) config.municipalityDomain = scriptTag.dataset.municipalityDomain;
      if (scriptTag.dataset.primaryColor) config.primaryColor = scriptTag.dataset.primaryColor;
      if (scriptTag.dataset.title) config.title = scriptTag.dataset.title;
      if (scriptTag.dataset.welcomeMessage) config.welcomeMessage = scriptTag.dataset.welcomeMessage;
    }
    
    widgetInstance = new ChatLegislativWidget(config);
    console.log('✅ Working chat widget initialized');
  });

  // Global API
  window.ChatLegislativWidget = {
    init: function(config) {
      return new ChatLegislativWidget(config);
    },
    getInstance: function() {
      return widgetInstance;
    }
  };
})();