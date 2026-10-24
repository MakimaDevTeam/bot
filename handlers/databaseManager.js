const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const config = require('../config');

const DB_PATH = path.join(__dirname, '..', 'database');

const FILES = ['users', 'guilds', 'settings', 'boosts', 'tickets', 'warnings', 'logs'];

// Cache em memória: evita ler o disco a cada acesso. Cada arquivo é
// carregado uma vez e mantido sincronizado a cada escrita.
const cache = new Map();

function filePath(name) {
  return path.join(DB_PATH, `${name}.json`);
}

function assertKnownFile(name) {
  if (!FILES.includes(name)) {
    throw new Error(`Arquivo de banco de dados desconhecido: "${name}". Use um de: ${FILES.join(', ')}`);
  }
}

/**
 * Carrega um arquivo .json do disco para o cache (se ainda não estiver carregado).
 * Cria o arquivo com um objeto vazio caso não exista.
 */
function load(name) {
  assertKnownFile(name);

  if (cache.has(name)) return cache.get(name);

  const target = filePath(name);

  if (!fs.existsSync(target)) {
    fs.writeFileSync(target, '{}', 'utf8');
  }

  try {
    const raw = fs.readFileSync(target, 'utf8');
    const data = raw.trim() ? JSON.parse(raw) : {};
    cache.set(name, data);
    return data;
  } catch (error) {
    logger.error(`Falha ao ler database/${name}.json: ${error.message}`);
    const empty = {};
    cache.set(name, empty);
    return empty;
  }
}

/**
 * Persiste o conteúdo atual do cache de volta em disco.
 */
function save(name) {
  assertKnownFile(name);
  const data = cache.get(name) ?? {};

  try {
    fs.writeFileSync(filePath(name), JSON.stringify(data, null, 2), 'utf8');
    logger.database(`${name}.json atualizado.`);
  } catch (error) {
    logger.error(`Falha ao salvar database/${name}.json: ${error.message}`);
  }
}

/** Carrega todos os arquivos de banco de dados na inicialização do bot. */
function init() {
  for (const name of FILES) load(name);
  logger.database(`${FILES.length} arquivo(s) de banco de dados prontos.`);
}

/** Lê um valor por chave (ex: get('users', userId)). Sem chave, retorna o arquivo inteiro. */
function get(name, key) {
  const data = load(name);
  return key === undefined ? data : data[key];
}

/** Define um valor por chave e salva imediatamente em disco. */
function set(name, key, value) {
  const data = load(name);
  data[key] = value;
  save(name);
  return value;
}

/** Remove uma chave e salva em disco. */
function remove(name, key) {
  const data = load(name);
  delete data[key];
  save(name);
}

/** Retorna a config de um servidor, criando com os valores padrão se ainda não existir. */
function getGuild(guildId) {
  const guilds = load('guilds');
  const existing = guilds[guildId];

  if (!existing) {
    guilds[guildId] = { guildId, ...config.defaultGuildConfig };
    save('guilds');
    return guilds[guildId];
  }

  // Preenche campos novos do defaultGuildConfig que uma config salva antes
  // deles existirem ainda não tem — evita undefined quando o bot ganha
  // novas opções de configuração no futuro.
  let changed = false;
  for (const [key, value] of Object.entries(config.defaultGuildConfig)) {
    if (!(key in existing)) {
      existing[key] = value;
      changed = true;
    }
  }
  if (changed) save('guilds');

  return existing;
}

/** Atualiza um ou mais campos da config de um servidor. */
function updateGuild(guildId, patch) {
  const guild = getGuild(guildId);
  Object.assign(guild, patch);
  save('guilds');
  return guild;
}

/** Retorna os dados de um usuário (global, não por servidor), criando um registro vazio se necessário. */
function getUser(userId) {
  const users = load('users');
  if (!users[userId]) {
    users[userId] = { userId };
    save('users');
  }
  return users[userId];
}

/**
 * Dados de um usuário DENTRO de um servidor específico (XP, nível, etc).
 * Fica em users.json com chave composta "guildId:userId" — mesmo arquivo do
 * getUser(), só que escopado por servidor em vez de global.
 */
function memberKey(guildId, userId) {
  return `${guildId}:${userId}`;
}

/** Retorna os dados de um membro em um servidor, criando um registro padrão se ainda não existir. */
function getMember(guildId, userId) {
  const users = load('users');
  const key = memberKey(guildId, userId);
  if (!users[key]) {
    users[key] = { guildId, userId, xp: 0, level: 0, messages: 0 };
    save('users');
  }
  return users[key];
}

/** Atualiza (merge) os dados de um membro em um servidor e salva em disco. */
function updateMember(guildId, userId, patch) {
  const member = getMember(guildId, userId);
  Object.assign(member, patch);
  save('users');
  return member;
}

/** Retorna todos os membros de um servidor, ordenados por XP total (maior primeiro). */
function getGuildMembers(guildId) {
  const users = load('users');
  return Object.values(users).filter((entry) => entry.guildId === guildId && entry.userId);
}

/**
 * Tickets ficam em database/tickets.json, com o ID do canal do ticket como chave.
 */

/** Cria um registro de ticket e salva em disco. */
function createTicket(channelId, data) {
  const tickets = load('tickets');
  tickets[channelId] = { channelId, status: 'open', claimedBy: null, createdAt: Date.now(), ...data };
  save('tickets');
  return tickets[channelId];
}

/** Atualiza (merge) um ticket existente e salva em disco. */
function updateTicket(channelId, patch) {
  const tickets = load('tickets');
  if (!tickets[channelId]) return null;
  Object.assign(tickets[channelId], patch);
  save('tickets');
  return tickets[channelId];
}

function getTicket(channelId) {
  return load('tickets')[channelId] || null;
}

/** Retorna todos os tickets de um servidor (opcionalmente filtrando por status). */
function getGuildTickets(guildId, status) {
  const tickets = Object.values(load('tickets')).filter((t) => t.guildId === guildId);
  return status ? tickets.filter((t) => t.status === status) : tickets;
}

/** Retorna o ticket aberto de um usuário em um servidor, se existir. */
function findOpenTicket(guildId, userId) {
  return getGuildTickets(guildId, 'open').find((t) => t.userId === userId) || null;
}

module.exports = {
  init,
  get,
  set,
  remove,
  getGuild,
  updateGuild,
  getUser,
  getMember,
  updateMember,
  getGuildMembers,
  createTicket,
  updateTicket,
  getTicket,
  getGuildTickets,
  findOpenTicket
};
