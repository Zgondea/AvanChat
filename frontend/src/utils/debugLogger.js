// Debug logger that persists logs to localStorage
class DebugLogger {
  constructor() {
    this.maxLogs = 100;
    this.storageKey = 'auth-debug-logs';
  }

  log(type, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      type, // 'info', 'error', 'warning', 'success'
      message,
      data: data ? JSON.stringify(data) : null,
      id: Date.now() + Math.random()
    };

    // Console log as well
    const emoji = {
      'info': 'ℹ️',
      'error': '❌',
      'warning': '⚠️', 
      'success': '✅'
    };
    
    console.log(`${emoji[type]} [${timestamp}] ${message}`, data || '');

    // Save to localStorage
    this.saveToStorage(logEntry);
  }

  saveToStorage(logEntry) {
    try {
      const existing = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
      existing.push(logEntry);
      
      // Keep only last maxLogs entries
      const trimmed = existing.slice(-this.maxLogs);
      
      localStorage.setItem(this.storageKey, JSON.stringify(trimmed));
    } catch (error) {
      console.error('Failed to save debug log:', error);
    }
  }

  getLogs() {
    try {
      return JSON.parse(localStorage.getItem(this.storageKey) || '[]');
    } catch {
      return [];
    }
  }

  clearLogs() {
    localStorage.removeItem(this.storageKey);
  }

  // Convenience methods
  info(message, data) { this.log('info', message, data); }
  error(message, data) { this.log('error', message, data); }
  warning(message, data) { this.log('warning', message, data); }
  success(message, data) { this.log('success', message, data); }
}

export const debugLogger = new DebugLogger();