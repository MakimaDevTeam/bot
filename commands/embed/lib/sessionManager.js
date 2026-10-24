/**
 * Cada usuário possui uma sessão isolada em memória enquanto monta a embed.
 * Isso permite que vários administradores usem /embed ao mesmo tempo
 * sem que os dados de um interfiram nos dados do outro.
 */

const sessions = new Map();

function getDefaultSession() {
  return {
    title: null,
    description: null,
    color: '#5865F2',
    author: { name: null, iconURL: null },
    footer: { text: null, iconURL: null },
    image: null,
    thumbnail: null,
    buttons: [] // { text, link, emoji }
  };
}

function getSession(userId) {
  if (!sessions.has(userId)) {
    sessions.set(userId, getDefaultSession());
  }
  return sessions.get(userId);
}

function resetSession(userId) {
  sessions.set(userId, getDefaultSession());
  return sessions.get(userId);
}

function deleteSession(userId) {
  sessions.delete(userId);
}

module.exports = { getSession, resetSession, deleteSession };
