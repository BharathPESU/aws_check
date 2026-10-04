/**
 * System Logger Service
 * Maintains an in-memory rolling buffer of recent server logs
 * and provides system event logging for monitoring in the dashboard.
 */

const MAX_LOGS = 500;
const systemLogs = [];

// Intercept or record server events
function addLog(level, message) {
  const entry = {
    id: Date.now() + Math.random().toString(36).substring(2, 7),
    timestamp: new Date().toISOString(),
    level: level.toLowerCase(),
    message: typeof message === 'object' ? JSON.stringify(message) : String(message),
  };

  systemLogs.unshift(entry);
  if (systemLogs.length > MAX_LOGS) {
    systemLogs.pop();
  }
}

// Hook console methods safely to also feed dashboard system logs
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

console.log = function (...args) {
  originalConsoleLog.apply(console, args);
  try {
    addLog('info', args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : a)).join(' '));
  } catch (_e) {}
};

console.warn = function (...args) {
  originalConsoleWarn.apply(console, args);
  try {
    addLog('warn', args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : a)).join(' '));
  } catch (_e) {}
};

console.error = function (...args) {
  originalConsoleError.apply(console, args);
  try {
    addLog('error', args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : a)).join(' '));
  } catch (_e) {}
};

function getSystemLogs(limit = 50) {
  const parsedLimit = Math.max(1, Math.min(parseInt(limit, 10) || 50, MAX_LOGS));
  return systemLogs.slice(0, parsedLimit);
}

module.exports = {
  addLog,
  getSystemLogs,
};
