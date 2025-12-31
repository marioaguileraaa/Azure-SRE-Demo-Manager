/**
 * Windows Event Viewer Logger
 * 
 * Logs parking operations to Windows Event Viewer
 * For non-Windows systems, falls back to console logging
 */

let EventLogger = null;
let isWindowsLoggingAvailable = false;

// Try to load node-windows module (only available on Windows)
try {
  EventLogger = require('node-windows').EventLogger;
  isWindowsLoggingAvailable = true;
  console.log('[Event Logger] Windows Event Viewer logging is available');
} catch (error) {
  console.log('[Event Logger] Windows Event Viewer not available (not running on Windows)');
  console.log('[Event Logger] Falling back to console logging');
}

class WindowsEventLogger {
  constructor(eventSource, eventLog) {
    this.eventSource = eventSource || 'MadridParkingAPI';
    this.eventLog = eventLog || 'Application';
    this.logger = null;

    if (isWindowsLoggingAvailable) {
      try {
        this.logger = new EventLogger(this.eventSource);
        console.log(`[Event Logger] Initialized with source: ${this.eventSource}`);
      } catch (error) {
        console.error('[Event Logger] Failed to initialize Windows Event Logger:', error.message);
        console.log('[Event Logger] Falling back to console logging');
        this.logger = null;
      }
    }
  }

  /**
   * Log an informational event
   */
  logInfo(message, details = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'INFO',
      message,
      details,
      source: this.eventSource
    };

    if (this.logger) {
      try {
        this.logger.info(JSON.stringify(logEntry, null, 2));
      } catch (error) {
        console.error('[Event Logger] Error writing to Event Viewer:', error.message);
        this._consoleLog(logEntry);
      }
    } else {
      this._consoleLog(logEntry);
    }
  }

  /**
   * Log a warning event
   */
  logWarning(message, details = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'WARNING',
      message,
      details,
      source: this.eventSource
    };

    if (this.logger) {
      try {
        this.logger.warn(JSON.stringify(logEntry, null, 2));
      } catch (error) {
        console.error('[Event Logger] Error writing to Event Viewer:', error.message);
        this._consoleLog(logEntry);
      }
    } else {
      this._consoleLog(logEntry);
    }
  }

  /**
   * Log an error event
   */
  logError(message, error, details = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      message,
      error: error.message || error,
      stack: error.stack,
      details,
      source: this.eventSource
    };

    if (this.logger) {
      try {
        this.logger.error(JSON.stringify(logEntry, null, 2));
      } catch (err) {
        console.error('[Event Logger] Error writing to Event Viewer:', err.message);
        this._consoleLog(logEntry);
      }
    } else {
      this._consoleLog(logEntry);
    }
  }

  /**
   * Log parking operation
   */
  logOperation(operation, parkId, details = {}) {
    const message = `Parking Operation: ${operation}`;
    this.logInfo(message, { operation, parkId, ...details });
  }

  /**
   * Fallback to console logging
   */
  _consoleLog(logEntry) {
    const prefix = `[Event Viewer ${logEntry.level}]`;
    
    switch (logEntry.level) {
      case 'ERROR':
        console.error(prefix, JSON.stringify(logEntry, null, 2));
        break;
      case 'WARNING':
        console.warn(prefix, JSON.stringify(logEntry, null, 2));
        break;
      default:
        console.log(prefix, JSON.stringify(logEntry, null, 2));
    }
  }

  /**
   * Check if Windows Event Viewer logging is available
   */
  isAvailable() {
    return this.logger !== null;
  }
}

module.exports = WindowsEventLogger;
