(function() {
  'use strict';
  // Widget version 2025-08-20-10-30 - Modern interface with intelligent category detection

  // Global widget instance
  let widgetInstance = null;

  class ChatLegislativWidget {
    constructor(config = {}) {
      this.config = {
        apiUrl: 'http://localhost/api/v1',
        municipalityDomain: 'pmb.ro',
        title: 'Asistent Legislativ',
        sectorName: '',
        welcomeMessage: 'Bună ziua! Cum vă pot ajuta astăzi?',
        primaryColor: '#1976d2',
        ...config
      };
      
      this.isOpen = false;
      this.isLoading = false;
      this.sessionId = this.generateSessionId();
      this.conversationHistory = [];
      this.currentTopic = null;
      this.currentMode = 'main'; // 'main', 'topics', 'custom'
      
      this.createWidget();
      this.attachEventListeners();
    }

    generateSessionId() {
      return 'session_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    }

    createWidget() {
      // Create button
      this.button = document.createElement('button');
      this.button.innerHTML = '<img src="/widget/icons/robot.png" style="width:38px;height:38px;pointer-events:none;">';
      this.button.style.cssText = `
        position: fixed !important;
        bottom: 24px !important;
        right: 24px !important;
        width: 64px !important;
        height: 64px !important;
        background: linear-gradient(135deg, ${this.config.primaryColor}, #1565c0) !important;
        color: white !important;
        border: none !important;
        border-radius: 50% !important;
        cursor: pointer !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        font-size: 28px !important;
        z-index: 999999 !important;
        box-shadow: 0 8px 32px rgba(0,0,0,0.16), 0 4px 16px rgba(25, 118, 210, 0.4) !important;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
      `;
      
      // Add hover effects
      this.button.addEventListener('mouseenter', () => {
        this.button.style.transform = 'scale(1.1)';
        this.button.style.boxShadow = '0 12px 40px rgba(0,0,0,0.2), 0 6px 20px rgba(25, 118, 210, 0.6)';
      });
      
      this.button.addEventListener('mouseleave', () => {
        this.button.style.transform = 'scale(1)';
        this.button.style.boxShadow = '0 8px 32px rgba(0,0,0,0.16), 0 4px 16px rgba(25, 118, 210, 0.4)';
      });
      
      // Create container
      this.container = document.createElement('div');
      this.container.style.cssText = `
        position: fixed !important;
        bottom: 100px !important;
        right: 24px !important;
        width: 380px !important;
        height: 650px !important;
        background: white !important;
        border-radius: 20px !important;
        box-shadow: 0 20px 60px rgba(0,0,0,0.15), 0 8px 32px rgba(0,0,0,0.1) !important;
        display: none !important;
        flex-direction: column !important;
        z-index: 999998 !important;
        overflow: hidden !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
        border: 1px solid rgba(255,255,255,0.2) !important;
      `;
      
      // Create header
      const header = document.createElement('div');
      header.style.cssText = `
        background: linear-gradient(135deg, ${this.config.primaryColor}, #1565c0) !important;
        color: white !important;
        padding: 24px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        position: relative !important;
        overflow: hidden !important;
      `;
      header.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px; z-index: 1; position: relative;">
          <div style="width: 40px; height: 40px; background: rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(10px);">
            <img src="/widget/icons/robot.png" style="width:28px;height:28px;">
          </div>
          <div>
            <h3 style="margin: 0; font-size: 18px; font-weight: 600; letter-spacing: -0.5px;">${this.config.title}</h3>
            <p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.9;">Online acum</p>
          </div>
        </div>
        <button class="close-btn" style="background: rgba(255,255,255,0.2); border: none; color: white; font-size: 16px; cursor: pointer; padding: 8px; border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; transition: all 0.3s; z-index: 1; position: relative; backdrop-filter: blur(10px);">×</button>
      `;
      
      // Create messages area
      this.messagesArea = document.createElement('div');
      this.messagesArea.style.cssText = `
        flex: 1 !important;
        padding: 16px !important;
        overflow-y: auto !important;
        overflow-x: hidden !important;
        background: #fafafa !important;
        width: 100% !important;
        box-sizing: border-box !important;
      `;
      this.messagesArea.innerHTML = this.createMainMenu();
      
      // Create scroll fade indicator
      this.createScrollFade();
      
      // Create welcome tooltip
      this.createWelcomeTooltip();
      
      // Assemble
      this.container.appendChild(header);
      this.container.appendChild(this.messagesArea);
      
      // Add to page
      document.body.appendChild(this.button);
      document.body.appendChild(this.container);
      
      console.log('✅ Modern widget created and added to DOM');
    }

    createWelcomeTooltip() {
      console.log('🎬 Creating welcome tooltip...');
      this.welcomeTooltip = document.createElement('div');
      this.welcomeTooltip.style.cssText = `
        position: fixed !important;
        bottom: 100px !important;
        right: 100px !important;
        background: linear-gradient(135deg, #1976d2, #1565c0) !important;
        color: white !important;
        padding: 20px 24px !important;
        border-radius: 20px !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
        font-size: 14px !important;
        font-weight: 500 !important;
        box-shadow: 0 12px 40px rgba(25, 118, 210, 0.25), 0 6px 20px rgba(0, 0, 0, 0.1) !important;
        z-index: 999996 !important;
        max-width: 320px !important;
        min-width: 280px !important;
        cursor: pointer !important;
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1) !important;
        display: block !important;
        visibility: visible !important;
        border: 2px solid rgba(255, 255, 255, 0.15) !important;
        backdrop-filter: blur(10px) !important;
        opacity: 0 !important;
        transform: translateY(20px) scale(0.9) !important;
      `;
      
      this.welcomeTooltip.innerHTML = `
        <div style="position: relative; display: flex; align-items: center; gap: 12px;">
          <div style="
            width: 40px; 
            height: 40px; 
            background: rgba(255, 255, 255, 0.2); 
            border-radius: 50%; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            font-size: 20px;
            backdrop-filter: blur(10px);
          ">👋</div>
          <div style="flex: 1;">
            <div style="font-weight: 600; margin-bottom: 2px;">Bună ziua!</div>
            <div style="font-size: 13px; opacity: 0.95;">Sunt aici să vă ajut cu orice întrebare</div>
          </div>
          <div style="
            position: absolute;
            bottom: -12px;
            right: -8px;
            width: 0;
            height: 0;
            border-left: 20px solid #1565c0;
            border-top: 12px solid transparent;
            border-bottom: 12px solid transparent;
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
          "></div>
        </div>
      `;
      
      // Auto-hide after 12 seconds
      setTimeout(() => {
        if (this.welcomeTooltip && this.welcomeTooltip.parentNode) {
          this.welcomeTooltip.style.animation = 'welcomeSlideOut 0.5s ease-in forwards';
          setTimeout(() => {
            if (this.welcomeTooltip && this.welcomeTooltip.parentNode) {
              this.welcomeTooltip.remove();
            }
          }, 500);
        }
      }, 12000);
      
      // Click to hide and open widget
      this.welcomeTooltip.addEventListener('click', () => {
        this.welcomeTooltip.style.animation = 'welcomeSlideOut 0.3s ease-in forwards';
        setTimeout(() => {
          if (this.welcomeTooltip && this.welcomeTooltip.parentNode) {
            this.welcomeTooltip.remove();
          }
        }, 300);
        this.open();
      });
      
      // Add hover effects
      this.welcomeTooltip.addEventListener('mouseenter', () => {
        this.welcomeTooltip.style.transform = 'translateY(-5px) scale(1.02)';
        this.welcomeTooltip.style.boxShadow = '0 16px 50px rgba(25, 118, 210, 0.35), 0 8px 24px rgba(0, 0, 0, 0.15)';
      });
      
      this.welcomeTooltip.addEventListener('mouseleave', () => {
        this.welcomeTooltip.style.transform = 'translateY(0) scale(1)';
        this.welcomeTooltip.style.boxShadow = '0 12px 40px rgba(25, 118, 210, 0.25), 0 6px 20px rgba(0, 0, 0, 0.1)';
      });
      
      document.body.appendChild(this.welcomeTooltip);
      console.log('✅ Welcome tooltip added to DOM:', this.welcomeTooltip);
      
      // Show with manual animation after 2 seconds
      setTimeout(() => {
        if (this.welcomeTooltip && this.welcomeTooltip.parentNode) {
          this.welcomeTooltip.style.opacity = '1';
          this.welcomeTooltip.style.transform = 'translateY(0) scale(1)';
          console.log('🎬 Welcome tooltip animated in');
        }
      }, 2000);
    }

    createScrollFade() {
      // Gradient fade la sfârșitul conținutului
      this.scrollFade = document.createElement('div');
      this.scrollFade.style.cssText = `
        position: absolute !important;
        bottom: 0 !important;
        left: 0 !important;
        right: 0 !important;
        height: 40px !important;
        background: linear-gradient(to top, rgba(250, 250, 250, 1) 0%, rgba(250, 250, 250, 0.8) 50%, rgba(250, 250, 250, 0) 100%) !important;
        pointer-events: none !important;
        z-index: 5 !important;
        opacity: 0 !important;
        transition: opacity 0.3s ease !important;
      `;
      
      // Custom scrollbar styling
      this.messagesArea.style.cssText += `
        scrollbar-width: thin !important;
        scrollbar-color: rgba(25, 118, 210, 0.3) transparent !important;
      `;
      
      // Webkit scrollbar pentru Chrome/Safari
      const scrollbarStyle = document.createElement('style');
      scrollbarStyle.textContent = `
        .messages-area::-webkit-scrollbar {
          width: 6px;
        }
        .messages-area::-webkit-scrollbar-track {
          background: transparent;
        }
        .messages-area::-webkit-scrollbar-thumb {
          background: rgba(25, 118, 210, 0.3);
          border-radius: 3px;
          transition: background 0.3s ease;
        }
        .messages-area::-webkit-scrollbar-thumb:hover {
          background: rgba(25, 118, 210, 0.5);
        }
      `;
      document.head.appendChild(scrollbarStyle);
      this.messagesArea.classList.add('messages-area');
      
      this.container.appendChild(this.scrollFade);
      
      // Monitor scroll pentru fade effect
      this.messagesArea.addEventListener('scroll', () => {
        this.updateScrollFade();
      });
      
      // Initial check
      setTimeout(() => {
        this.updateScrollFade();
      }, 100);
      setTimeout(() => {
        this.updateScrollFade();
      }, 300);
      
      // Observer pentru detectarea schimbărilor
      const resizeObserver = new ResizeObserver(() => {
        this.updateScrollFade();
      });
      resizeObserver.observe(this.messagesArea);
    }

    updateScrollFade() {
      if (!this.scrollFade || !this.messagesArea) return;
      
      const { scrollTop, scrollHeight, clientHeight } = this.messagesArea;
      const isScrollable = scrollHeight > clientHeight + 5;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 15;
      
      if (isScrollable && !isAtBottom) {
        this.scrollFade.style.opacity = '1';
      } else {
        this.scrollFade.style.opacity = '0';
      }
    }

    createMainMenu() {
      return `
        <div style="text-align: center; color: #666; padding: 16px;">
          <div style="margin-bottom: 18px;">
            <div style="display: flex; flex-direction: column; align-items: center; margin-bottom: 16px;">
              <div style="width: 48px; height: 48px; background: linear-gradient(135deg, ${this.config.primaryColor}, #42a5f5); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; box-shadow: 0 8px 24px rgba(25, 118, 210, 0.3); margin-bottom: 12px;"><img src="/widget/icons/robot.png" style="width:32px;height:32px;"></div>
              <div style="text-align: center;">
                <h3 style="margin: 0; color: ${this.config.primaryColor}; font-size: 18px; font-weight: 600;">${this.config.title}</h3>
                ${this.config.sectorName ? `<p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.7; font-weight: 400;">${this.config.sectorName}</p>` : ''}
              </div>
            </div>
            <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #666;">Bună ziua! Sunt asistentul legislativ al Primăriei Sector 5.</p>
          </div>
          
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 16px;">
            <button class="topic-card" data-topic="taxe-locale-impozite" style="background: linear-gradient(145deg, #ffffff, #f8fafc); color: #1e293b; border: 2px solid #e2e8f0; border-radius: 16px; padding: 18px 12px; cursor: pointer; text-align: center; font-size: 14px; font-weight: 600; line-height: 1.4; min-height: 88px; display: flex; flex-direction: column; justify-content: center; align-items: center; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06), 0 2px 8px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.9);">
              <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 8px; filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1));"><img src="/widget/icons/TaxeLocale.png" style="width:36px;height:36px;"></div>
              <div style="font-size: 14px; letter-spacing: 0.02em; text-shadow: 0 1px 2px rgba(255, 255, 255, 0.8);">Taxe Locale și Impozite</div>
              <small style="font-size: 10px; font-weight: 500; margin-top: 4px; opacity: 0.75; color: #64748b; text-shadow: 0 1px 1px rgba(255, 255, 255, 0.5);">Toate tipurile de taxe</small>
            </button>
            <button class="topic-card" data-topic="urbanism" style="background: linear-gradient(145deg, #ffffff, #f8fafc); color: #1e293b; border: 2px solid #e2e8f0; border-radius: 16px; padding: 18px 12px; cursor: pointer; text-align: center; font-size: 14px; font-weight: 600; line-height: 1.4; min-height: 88px; display: flex; flex-direction: column; justify-content: center; align-items: center; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06), 0 2px 8px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.9);">
              <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 8px; filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1));"><img src="/widget/icons/Urbanism.png" style="width:36px;height:36px;"></div>
              <div style="font-size: 14px; letter-spacing: 0.02em; text-shadow: 0 1px 2px rgba(255, 255, 255, 0.8);">Urbanism</div>
              <small style="font-size: 10px; font-weight: 500; margin-top: 4px; opacity: 0.75; color: #64748b; text-shadow: 0 1px 1px rgba(255, 255, 255, 0.5);">Autorizații, construcții</small>
            </button>
          </div>
          
          <!-- Buton Întrebare Proprie -->
          <button class="main-action-btn" data-action="custom-question" style="
            width: 100%;
            background: linear-gradient(135deg, #6c757d, #495057);
            color: white;
            border: none;
            border-radius: 16px;
            padding: 16px 20px;
            cursor: pointer;
            text-align: center;
            font-size: 16px;
            font-weight: 600;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 8px 32px rgba(108, 117, 125, 0.2);
            position: relative;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            margin-bottom: 16px;
          ">
            <span style="font-size: 18px;">✍️</span>
            <span>Întrebare Proprie</span>
          </button>
          

        
        <style>
          @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.5; transform: scale(1.2); }
          }
          
          .topic-card:hover {
            transform: translateY(-4px) scale(1.02);
            border-color: #cbd5e1;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12), 0 4px 16px rgba(0, 0, 0, 0.08), inset 0 2px 0 rgba(255, 255, 255, 0.9);
          }
          
          .topic-card:active {
            transform: translateY(-2px) scale(1.01);
            border-color: #94a3b8;
            box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08), 0 1px 4px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.6);
          }
          
          .main-action-btn:hover {
            transform: translateY(-2px) scale(1.02);
            box-shadow: 0 12px 40px rgba(108, 117, 125, 0.3);
          }
          
          .main-action-btn:active {
            transform: translateY(-1px) scale(1.01);
          }
          
          .main-action-btn::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
            transition: left 0.5s;
          }
          
          .main-action-btn:hover::before {
            left: 100%;
          }
        </style>
      `;
    }


    createCustomQuestionForm() {
      return `
        <div style="padding: 20px;">
          <div style="display: flex; align-items: center; margin-bottom: 20px; gap: 12px;">
            <button class="back-to-main" style="
              background: #f8f9fa;
              border: 1px solid #dee2e6;
              border-radius: 8px;
              padding: 8px 12px;
              font-size: 14px;
              cursor: pointer;
              color: #666;
              transition: all 0.3s ease;
            ">← Înapoi</button>
            <div style="flex: 1;">
              <h3 style="margin: 0; color: ${this.config.primaryColor}; font-size: 16px; font-weight: 600;">✍️ Întrebare Proprie</h3>
              <p style="margin: 2px 0 0 0; font-size: 12px; color: #666;">Scrie întrebarea ta și sistemul va detecta automat categoria</p>
            </div>
          </div>
          
          <div style="margin-bottom: 20px;">
            <div style="position: relative;">
              <textarea 
                id="customQuestionInput" 
                placeholder="Exemplu: Cum pot obține autorizația de construire pentru o casă? Sau: Care sunt taxele pentru înregistrarea unei firme?"
                style="
                  width: 100%;
                  min-height: 100px;
                  padding: 16px;
                  border: 2px solid #e9ecef;
                  border-radius: 12px;
                  font-size: 14px;
                  font-family: inherit;
                  resize: vertical;
                  box-sizing: border-box;
                  transition: all 0.3s ease;
                  background: #fafafa;
                "
              ></textarea>
              <div style="
                position: absolute;
                bottom: 8px;
                right: 8px;
                font-size: 11px;
                color: #adb5bd;
                background: white;
                padding: 2px 6px;
                border-radius: 4px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              " id="charCounter">0/500</div>
            </div>
          </div>
          
          <div style="margin-bottom: 20px;">
            <div style="
              background: linear-gradient(135deg, #e3f2fd, #f3e5f5);
              border: 1px solid #bbdefb;
              border-radius: 12px;
              padding: 16px;
              position: relative;
              overflow: hidden;
            ">
              <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                <div style="width: 32px; height: 32px; background: linear-gradient(135deg, #2196f3, #9c27b0); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px;">🧠</div>
                <div>
                  <div style="font-weight: 600; color: #1976d2; font-size: 14px;">Detecție Inteligentă Activă</div>
                  <div style="font-size: 11px; color: #666;">Sistemul analizează automat categoria întrebării tale</div>
                </div>
              </div>
              
              <div id="categoryDetection" style="
                display: flex;
                flex-wrap: wrap;
                gap: 6px;
                margin-top: 12px;
              ">
                <span style="background: rgba(255, 107, 107, 0.1); color: #ff6b6b; padding: 4px 8px; border-radius: 6px; font-size: 11px; border: 1px solid rgba(255, 107, 107, 0.2);">🏗️ Urbanism</span>
                <span style="background: rgba(0, 210, 211, 0.1); color: #00d2d3; padding: 4px 8px; border-radius: 6px; font-size: 11px; border: 1px solid rgba(0, 210, 211, 0.2);">💰 Taxe Locale și Impozite</span>
              </div>
            </div>
          </div>
          
          <button id="submitCustomQuestion" disabled style="
            width: 100%;
            background: linear-gradient(135deg, ${this.config.primaryColor}, #42a5f5);
            color: white;
            border: none;
            border-radius: 12px;
            padding: 16px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            opacity: 0.5;
            position: relative;
            overflow: hidden;
          ">
            <span style="display: flex; align-items: center; justify-content: center; gap: 8px;">
              <span>🚀</span>
              <span>Trimite Întrebarea</span>
            </span>
          </button>
        </div>
        
        <style>
          #customQuestionInput:focus {
            border-color: ${this.config.primaryColor};
            outline: none;
            box-shadow: 0 0 0 3px rgba(25, 118, 210, 0.1);
            background: white;
          }
          
          #submitCustomQuestion:not(:disabled) {
            opacity: 1;
          }
          
          #submitCustomQuestion:not(:disabled):hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 32px rgba(25, 118, 210, 0.3);
          }
          
          .back-to-main:hover {
            background: #e9ecef;
            border-color: #ced4da;
          }
        </style>
      `;
    }

    attachEventListeners() {
      // Button click
      this.button.addEventListener('click', () => this.toggle());
      
      // Close button
      this.container.querySelector('.close-btn').addEventListener('click', () => this.close());
      
      // Main action buttons and other interactions
      this.messagesArea.addEventListener('click', (e) => {
        // Main action buttons
        if (e.target.closest('.main-action-btn')) {
          e.preventDefault();
          e.stopPropagation();
          const action = e.target.closest('.main-action-btn').getAttribute('data-action');
          this.handleMainAction(action);
          return;
        }
        
        // Topic cards
        if (e.target.closest('.topic-card')) {
          e.preventDefault();
          e.stopPropagation();
          const topic = e.target.closest('.topic-card').getAttribute('data-topic');
          this.currentTopic = topic;
          this.showQuestionsForTopic(topic);
          return;
        }
        
        // Back buttons
        if (e.target.classList.contains('back-to-topics') || e.target.classList.contains('back-to-main')) {
          e.preventDefault();
          e.stopPropagation();
          this.currentTopic = null;
          this.currentMode = 'main';
          this.messagesArea.innerHTML = this.createMainMenu();
          return;
        }
        
        // Question buttons - improved detection
        if (e.target.closest('.question-btn') || e.target.classList.contains('question-btn')) {
          e.preventDefault();
          e.stopPropagation();
          const questionBtn = e.target.closest('.question-btn') || e.target;
          const question = questionBtn.getAttribute('data-question');
          if (question) {
            this.askQuestion(question);
          }
          return;
        }
        
        // Custom question submit
        if (e.target.id === 'submitCustomQuestion') {
          e.preventDefault();
          e.stopPropagation();
          const input = this.messagesArea.querySelector('#customQuestionInput');
          if (input && input.value.trim()) {
            this.askQuestion(input.value.trim());
          }
          return;
        }
      });
      
      // Handle textarea input for custom questions
      this.messagesArea.addEventListener('input', (e) => {
        if (e.target.id === 'customQuestionInput') {
          this.handleCustomQuestionInput(e.target);
        }
      });
      
      // Click outside to close
      document.addEventListener('click', (e) => {
        if (this.isOpen && !this.button.contains(e.target) && !this.container.contains(e.target)) {
          this.close();
        }
      });
    }

    handleMainAction(action) {
      if (action === 'custom-question') {
        this.currentMode = 'custom';
        this.messagesArea.innerHTML = this.createCustomQuestionForm();
      }
    }

    handleCustomQuestionInput(textarea) {
      const text = textarea.value;
      const counter = this.messagesArea.querySelector('#charCounter');
      const submitBtn = this.messagesArea.querySelector('#submitCustomQuestion');
      
      // Update character counter
      if (counter) {
        counter.textContent = `${text.length}/500`;
      }
      
      // Enable/disable submit button
      if (submitBtn) {
        if (text.trim().length > 5) {
          submitBtn.disabled = false;
          submitBtn.style.opacity = '1';
        } else {
          submitBtn.disabled = true;
          submitBtn.style.opacity = '0.5';
        }
      }
      
      // Simple category detection simulation
      this.simulateCategoryDetection(text);
    }

    simulateCategoryDetection(text) {
      const categoryEl = this.messagesArea.querySelector('#categoryDetection');
      if (!categoryEl) return;
      
      const keywords = {
        'urbanism': ['construi', 'autorizat', 'clădi', 'amenaj', 'imobil', 'teren'],
        'taxe-locale-impozite': ['tva', 'taxa', 'valoare', 'adăugat', 'factur', 'impozit', 'profit', 'venit', 'declarat', 'local', 'primăr', 'sector', 'municipal', 'contribut', 'cas', 'cass', 'social', 'pensi']
      };
      
      const spans = categoryEl.querySelectorAll('span');
      spans.forEach(span => {
        span.style.opacity = '0.3';
        span.style.transform = 'scale(0.95)';
      });
      
      if (text.length > 10) {
        const textLower = text.toLowerCase();
        Object.keys(keywords).forEach((category, index) => {
          const hasKeywords = keywords[category].some(keyword => textLower.includes(keyword));
          if (hasKeywords && spans[index]) {
            spans[index].style.opacity = '1';
            spans[index].style.transform = 'scale(1.05)';
            spans[index].style.background = 'rgba(25, 118, 210, 0.2)';
            spans[index].style.color = '#1976d2';
          }
        });
      }
    }

    showQuestionsForTopic(topic) {
      const topicTitles = {
        'urbanism': '🏗️ Urbanism',
        'taxe-locale-impozite': '💰 Taxe Locale și Impozite'
      };

      const topicSelections = {
        'urbanism': [
          { title: 'Autorizații de Construire', keywords: 'autorizație de construire documente necesare' },
          { title: 'Lucrări Interioare', keywords: 'lucrări care nu necesită autorizație' },
          { title: 'Certificate Urbanism', keywords: 'certificat de urbanism' },
          { title: 'Avize și Acorduri', keywords: 'avize acorduri construcții' },
          { title: 'Proceduri Autorizare', keywords: 'procedura autorizație construire' },
          { title: 'Documentație Tehnică', keywords: 'documentație tehnică DT construcții' },
          { title: 'Modificări Construcții', keywords: 'modificarea structurii clădirii' },
          { title: 'Reglementări Urbanism', keywords: 'reglementări urbanistice construcții' }
        ],
        'taxe-locale-impozite': [
          { title: 'Taxa pe Clădiri', keywords: 'taxa clădiri' },
          { title: 'Taxa pe Teren', keywords: 'taxa teren' },
          { title: 'TVA România', keywords: 'TVA cota standard România' },
          { title: 'Impozit pe Profit', keywords: 'impozit profit calculare' },
          { title: 'Contribuții Sociale', keywords: 'contribuții sociale obligatorii' },
          { title: 'Termene Plată', keywords: 'termene plată taxe' },
          { title: 'Scutiri Pensionari', keywords: 'scutiri taxe pensionari' },
          { title: 'Contestații Taxe', keywords: 'contestații taxe locale' },
          { title: 'Declarații Fiscale', keywords: 'declarații fiscale' },
          { title: 'Penalități și Dobânzi', keywords: 'penalități dobânzi taxe' }
        ]
      };

      const questionsHTML = `
        <div style="padding: 20px;">
          <div style="display: flex; align-items: center; margin-bottom: 20px; gap: 10px;">
            <button class="back-to-topics" style="background: #f5f5f5; border: none; border-radius: 8px; padding: 8px 12px; font-size: 14px; cursor: pointer; color: #666; transition: all 0.3s ease;">← Înapoi</button>
            <div style="font-size: 16px; font-weight: 600; color: #333;">${topicTitles[topic]}</div>
          </div>
          
          <div style="margin-bottom: 16px; padding: 12px; background: linear-gradient(135deg, #e3f2fd, #f3e5f5); border-radius: 12px; border: 1px solid #bbdefb;">
            <div style="font-size: 13px; color: #1976d2; font-weight: 600; margin-bottom: 4px;">💡 Selectează o temă pentru căutare inteligentă</div>
            <div style="font-size: 11px; color: #666;">Sistemul va căuta în toate documentele încărcate informațiile relevante pentru tema selectată</div>
          </div>
          
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
            ${topicSelections[topic].map((item) => `
              <button class="question-btn" data-question="${item.keywords}" style="
                background: linear-gradient(145deg, #ffffff, #f8fafc); 
                color: #1e293b; 
                border: 2px solid #e2e8f0; 
                border-radius: 12px; 
                padding: 14px 12px; 
                cursor: pointer !important; 
                text-align: center; 
                font-size: 13px; 
                font-weight: 600; 
                line-height: 1.3; 
                min-height: 60px; 
                display: flex; 
                flex-direction: column; 
                justify-content: center; 
                align-items: center; 
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.9);
                user-select: none;
              ">
                <div style="font-size: 13px; letter-spacing: 0.02em; text-shadow: 0 1px 2px rgba(255, 255, 255, 0.8); text-align: center;">${item.title}</div>
              </button>
            `).join('')}
          </div>
          
          <div style="margin-top: 20px; padding: 16px; background: #f8f9fa; border-radius: 12px; border: 1px solid #e9ecef;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
              <span style="font-size: 16px;">✍️</span>
              <span style="font-size: 14px; font-weight: 600; color: #495057;">Sau scrie întrebarea ta specifică:</span>
            </div>
            <div style="position: relative;">
              <input type="text" id="customTopicInput" placeholder="Ex: Cum obțin autorizația pentru extindere casă..." style="
                width: 100%;
                padding: 12px 16px;
                border: 2px solid #e9ecef;
                border-radius: 10px;
                font-size: 14px;
                font-family: inherit;
                box-sizing: border-box;
                transition: all 0.3s ease;
                background: white;
              ">
              <button id="submitTopicQuestion" style="
                position: absolute;
                right: 4px;
                top: 4px;
                bottom: 4px;
                background: linear-gradient(135deg, ${this.config.primaryColor}, #42a5f5);
                color: white;
                border: none;
                border-radius: 8px;
                padding: 0 16px;
                cursor: pointer;
                font-size: 12px;
                font-weight: 600;
                transition: all 0.3s ease;
              ">Întreabă</button>
            </div>
          </div>
        </div>
        
        <style>
          .question-btn:hover {
            transform: translateY(-2px) scale(1.02);
            border-color: #cbd5e1;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.06), inset 0 2px 0 rgba(255, 255, 255, 0.9);
          }
          
          .question-btn:active {
            transform: translateY(-1px) scale(1.01);
            border-color: #94a3b8;
            box-shadow: 0 1px 8px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.6);
          }
          
          .back-to-topics:hover {
            background: #e9ecef;
            color: #495057;
          }
          
          #customTopicInput:focus {
            border-color: ${this.config.primaryColor};
            outline: none;
            box-shadow: 0 0 0 3px rgba(25, 118, 210, 0.1);
          }
          
          #submitTopicQuestion:hover {
            transform: scale(1.05);
            box-shadow: 0 4px 12px rgba(25, 118, 210, 0.3);
          }
        </style>
      `;

      this.messagesArea.innerHTML = questionsHTML;
      
      // Add event listener for custom input
      const customInput = this.messagesArea.querySelector('#customTopicInput');
      const submitBtn = this.messagesArea.querySelector('#submitTopicQuestion');
      
      if (submitBtn) {
        submitBtn.addEventListener('click', () => {
          const inputValue = customInput ? customInput.value.trim() : '';
          if (inputValue) {
            this.askQuestion(inputValue);
          }
        });
      }
      
      if (customInput) {
        customInput.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') {
            const inputValue = customInput.value.trim();
            if (inputValue) {
              this.askQuestion(inputValue);
            }
          }
        });
      }
    }

    async askQuestion(question) {
      if (this.isLoading) return;
      
      this.addMessage('user', question);
      this.setLoading(true);
      
      // Timeout de 90 secunde pentru răspuns complet (modelul AI poate fi lent)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000);
      
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
        this.addMessage('assistant', result.response, result.sources || []);
        
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

    formatAssistantMessage(content, role, isError) {
      if (role !== 'assistant' || isError) {
        return content.replace(/\n/g, '<br>');
      }

      let formatted = content;
      
      // Clean line breaks
      formatted = formatted.replace(/\n/g, '<br>');
      
      // Breathing space between sentences
      formatted = formatted.replace(/\.\s+(?=[A-ZĂÎȘȚÂ])/g, '.<br><br>');
      
      // Bold text
      formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong style="color: #1976d2;">$1</strong>');
      
      // SUPER SIMPLE enumerated lists - each on its own line with a box
      formatted = formatted.replace(
        /([a-z]\)) /g,
        '<br><div style="margin: 8px 0; padding: 12px; background: #f8fafc; border-left: 4px solid #1976d2; border-radius: 6px;"><strong style="color: #1976d2;">$1</strong> '
      );
      
      // Close each list item before the next one or at the end
      formatted = formatted.replace(
        /(<div[^>]*><strong[^>]*>[a-z]\)<\/strong>[^<]*?)(?=<br><div|$)/g, 
        '$1</div>'
      );
      
      // Sources
      formatted = formatted.replace(
        /\*\*Sursa:\*\* ([^<\n]+)/g,
        '<div style="margin: 12px 0; padding: 8px; background: #e8f5e8; border-radius: 6px; font-size: 12px; color: #2e7d32;">📄 $1</div>'
      );
      
      // Notices  
      formatted = formatted.replace(
        /Pentru informații complete.*contactați primăria\./g,
        '<div style="margin: 12px 0; padding: 10px; background: #fff3e0; border-radius: 6px; font-size: 13px; color: #f57c00;">ℹ️ $&</div>'
      );
      
      return formatted;
    }

    addMessage(role, content, sources, isError = false) {
      const messageDiv = document.createElement('div');
      messageDiv.style.cssText = `
        margin-bottom: 16px !important;
        display: flex !important;
        align-items: flex-start !important;
        gap: 12px !important;
        width: 100% !important;
        box-sizing: border-box !important;
        flex-wrap: nowrap !important;
        ${role === 'user' ? 'flex-direction: row-reverse !important;' : ''}
      `;
      
      const avatar = document.createElement('div');
      avatar.style.cssText = `
        width: 40px !important;
        height: 40px !important;
        border-radius: 50% !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        font-size: 18px !important;
        flex-shrink: 0 !important;
        margin-top: 2px !important;
        ${role === 'user' 
          ? `background: linear-gradient(135deg, ${this.config.primaryColor}, #1565c0) !important; color: white !important; box-shadow: 0 4px 16px rgba(25, 118, 210, 0.3) !important;`
          : 'background: linear-gradient(135deg, #42a5f5, #1976d2) !important; color: white !important; box-shadow: 0 4px 16px rgba(66, 165, 245, 0.3) !important;'
        }
      `;
      if (role === 'user') {
        avatar.innerHTML = '<img src="/widget/icons/human.png" style="width:24px;height:24px;">';
      } else {
        avatar.innerHTML = '<img src="/widget/icons/robot.png" style="width:24px;height:24px;">';
      }
      
      const messageContent = document.createElement('div');
      messageContent.style.cssText = `
        ${role === 'user' 
          ? `background: linear-gradient(135deg, ${this.config.primaryColor}, #1565c0) !important; color: white !important; border-bottom-right-radius: 8px !important;` 
          : 'background: white !important; color: #1a1a1a !important; border: 1px solid #e1e5e9 !important; border-bottom-left-radius: 8px !important;'
        }
        padding: 14px 18px !important;
        border-radius: 16px !important;
        max-width: 80% !important;
        word-wrap: break-word !important;
        word-break: break-word !important;
        overflow-wrap: break-word !important;
        white-space: pre-wrap !important;
        box-sizing: border-box !important;
        display: block !important;
        box-shadow: ${role === 'user' ? '0 4px 16px rgba(25, 118, 210, 0.3)' : '0 4px 16px rgba(0, 0, 0, 0.08)'} !important;
        font-size: 14px !important;
        line-height: 1.4 !important;
        position: relative !important;
        ${isError ? 'background: #ffebee !important; color: #d32f2f !important; border-color: #ffcdd2 !important;' : ''}
      `;
      
      // Better formatting for content
      let formattedContent = this.formatAssistantMessage(content, role, isError);
      
      messageContent.innerHTML = formattedContent;
      
      messageDiv.appendChild(avatar);
      messageDiv.appendChild(messageContent);
      
      // Clear menu/questions on first user message - improved check
      if (role === 'user') {
        // Remove any existing topic menu or questions only if they exist
        const existingTopicCards = this.messagesArea.querySelectorAll('.topic-card');
        const existingQuestionBtns = this.messagesArea.querySelectorAll('.question-btn');
        const existingNavBtns = this.messagesArea.querySelectorAll('.navigation-buttons');
        const existingMainBtns = this.messagesArea.querySelectorAll('.main-action-btn');
        
        if (existingTopicCards.length > 0 || existingQuestionBtns.length > 0 || existingMainBtns.length > 0) {
          this.messagesArea.innerHTML = '';
        } else if (existingNavBtns.length > 0) {
          // If there are existing navigation buttons, remove them
          existingNavBtns.forEach(btn => btn.remove());
        }
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
      // Remove any existing navigation buttons first
      const existingNavBtns = this.messagesArea.querySelectorAll('.navigation-buttons');
      existingNavBtns.forEach(btn => btn.remove());
      
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
        this.resetToMainMenu();
      });
      
      navDiv.querySelector('.nav-new-question-btn').addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.resetToQuestions();
      });
      
      this.messagesArea.appendChild(navDiv);
    }

    resetToMainMenu() {
      this.conversationHistory = [];
      this.currentTopic = null;
      this.currentMode = 'main';
      this.messagesArea.innerHTML = this.createMainMenu();
      setTimeout(() => {
        this.updateScrollFade();
      }, 100);
    }

    resetToQuestions() {
      this.conversationHistory = [];
      if (this.currentTopic) {
        this.showQuestionsForTopic(this.currentTopic);
      } else {
        this.currentMode = 'main';
        this.messagesArea.innerHTML = this.createMainMenu();
      }
    }

    setLoading(loading) {
      this.isLoading = loading;
      if (loading) {
        // Create a simpler loading message
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'loading-message';
        loadingDiv.style.cssText = `
          margin-bottom: 16px !important;
          display: flex !important;
          align-items: flex-start !important;
          gap: 12px !important;
          width: 100% !important;
          box-sizing: border-box !important;
        `;
        
        const avatar = document.createElement('div');
        avatar.style.cssText = `
          width: 40px !important;
          height: 40px !important;
          border-radius: 50% !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          font-size: 18px !important;
          flex-shrink: 0 !important;
          margin-top: 2px !important;
          background: linear-gradient(135deg, #42a5f5, #1976d2) !important;
          color: white !important;
          box-shadow: 0 4px 16px rgba(66, 165, 245, 0.3) !important;
        `;
        avatar.innerHTML = '<img src="/widget/icons/robot.png" style="width:22px;height:22px;">';
        
        const messageContent = document.createElement('div');
        messageContent.style.cssText = `
          background: white !important;
          color: #666 !important;
          border: 1px solid #e1e5e9 !important;
          border-bottom-left-radius: 8px !important;
          padding: 16px 20px !important;
          border-radius: 20px !important;
          max-width: 75% !important;
          box-sizing: border-box !important;
          display: flex !important;
          align-items: center !important;
          gap: 8px !important;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08) !important;
          font-size: 14px !important;
          line-height: 1.5 !important;
        `;
        
        messageContent.innerHTML = `
          <div style="display: flex; gap: 4px;">
            <div style="width: 8px; height: 8px; background: ${this.config.primaryColor}; border-radius: 50%; animation: loading-bounce 1.4s infinite both;"></div>
            <div style="width: 8px; height: 8px; background: ${this.config.primaryColor}; border-radius: 50%; animation: loading-bounce 1.4s infinite both; animation-delay: 0.2s;"></div>
            <div style="width: 8px; height: 8px; background: ${this.config.primaryColor}; border-radius: 50%; animation: loading-bounce 1.4s infinite both; animation-delay: 0.4s;"></div>
          </div>
          <span>Generez răspunsul...</span>
        `;
        
        loadingDiv.appendChild(avatar);
        loadingDiv.appendChild(messageContent);
        this.messagesArea.appendChild(loadingDiv);
        this.messagesArea.scrollTop = this.messagesArea.scrollHeight;
        
      } else {
        // Remove loading message
        const loadingMessage = this.messagesArea.querySelector('.loading-message');
        if (loadingMessage) {
          loadingMessage.remove();
        }
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
      this.button.innerHTML = '<img src="/widget/icons/robot.png" style="width:38px;height:38px;pointer-events:none;">';
      this.button.style.background = this.config.primaryColor;
    }
  }

  // Add loading animation CSS
  const style = document.createElement('style');
  style.textContent = `
    @keyframes loading-bounce {
      0%, 80%, 100% { 
        transform: translateY(0); 
        opacity: 0.6;
      }
      40% { 
        transform: translateY(-8px); 
        opacity: 1;
      }
    }
    
    @keyframes scrollFloat {
      0%, 100% { 
        transform: translateY(0px) translateX(0px);
        box-shadow: 0 4px 16px rgba(25, 118, 210, 0.25), 0 2px 8px rgba(0, 0, 0, 0.1);
      }
      25% { 
        transform: translateY(-2px) translateX(1px);
        box-shadow: 0 5px 18px rgba(25, 118, 210, 0.3), 0 3px 10px rgba(0, 0, 0, 0.12);
      }
      50% { 
        transform: translateY(-4px) translateX(0px);
        box-shadow: 0 6px 20px rgba(25, 118, 210, 0.35), 0 4px 12px rgba(0, 0, 0, 0.15);
      }
      75% { 
        transform: translateY(-2px) translateX(-1px);
        box-shadow: 0 5px 18px rgba(25, 118, 210, 0.3), 0 3px 10px rgba(0, 0, 0, 0.12);
      }
    }
    
    @keyframes welcomeSlideIn {
      0% { 
        opacity: 0; 
        transform: translateY(20px) scale(0.9); 
      }
      100% { 
        opacity: 1; 
        transform: translateY(0) scale(1); 
      }
    }
    
    @keyframes welcomeSlideOut {
      0% { 
        opacity: 1; 
        transform: translateY(0) scale(1); 
      }
      100% { 
        opacity: 0; 
        transform: translateY(-20px) scale(0.9); 
      }
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
      if (scriptTag.dataset.sectorName) config.sectorName = scriptTag.dataset.sectorName;
      if (scriptTag.dataset.welcomeMessage) config.welcomeMessage = scriptTag.dataset.welcomeMessage;
    }
    
    widgetInstance = new ChatLegislativWidget(config);
    window.widgetInstance = widgetInstance; // Expose globally too
    console.log('✅ Modern chat widget v3 initialized');
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
