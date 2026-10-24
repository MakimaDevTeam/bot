/**
 * Funções auxiliares pequenas, usadas por múltiplos módulos.
 */

function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000) % 60;
  const minutes = Math.floor(ms / (1000 * 60)) % 60;
  const hours = Math.floor(ms / (1000 * 60 * 60)) % 24;
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));

  const parts = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  if (seconds || parts.length === 0) parts.push(`${seconds}s`);

  return parts.join(' ');
}

function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Converte um texto livre em um nome válido de canal do Discord
 * (minúsculo, espaços viram hífen, remove caracteres que o Discord não aceita).
 * Ex: "Revogação" -> "revogação", "Suporte Geral!" -> "suporte-geral"
 */
function slugify(text) {
  const slug = String(text)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}-]/gu, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);

  return slug || 'ticket';
}

/** Gera um ID curto e aleatório (base36), usado para identificar tipos de ticket. */
function shortId() {
  return Math.random().toString(36).slice(2, 8);
}

module.exports = { formatDuration, chunkArray, randomInt, slugify, shortId };
