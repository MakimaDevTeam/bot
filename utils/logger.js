/**
 * Logger simples e colorido para o console.
 * Uso: logger.info('Bot iniciado.'), logger.command('Luck', '/embed'), etc.
 */

const COLORS = {
  reset: '\x1b[0m',
  gray: '\x1b[90m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m'
};

const TAGS = {
  INFO: COLORS.cyan,
  COMMAND: COLORS.magenta,
  DATABASE: COLORS.green,
  WARN: COLORS.yellow,
  ERROR: COLORS.red
};

function timestamp() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

function print(tag, message) {
  const color = TAGS[tag] || COLORS.reset;
  console.log(`${COLORS.gray}[${timestamp()}]${COLORS.reset} ${color}[${tag}]${COLORS.reset} ${message}`);
}

module.exports = {
  info: (message) => print('INFO', message),
  warn: (message) => print('WARN', message),
  error: (message) => print('ERROR', message),
  database: (message) => print('DATABASE', message),
  command: (user, commandName) => print('COMMAND', `${user} executou ${commandName}`)
};
