/**
 * Sessão em memória de quem está montando o painel de tickets via /ticket-criar.
 * Mesmo padrão do sessionManager do módulo /embed: uma sessão isolada por usuário.
 */

const sessions = new Map();

function getDefaultSession() {
  return {
    types: [], // [{ id, label, emoji, categoryId, categoryName, supportRoleId, supportRoleName, counter }]
    pendingType: null, // { label, emoji, categoryId, categoryName } enquanto aguarda categoria/cargo
    panelTitle: null, // null = usa o padrão de config.defaultGuildConfig.ticketPanelTitle
    panelDescription: null,
    welcomeMessage: null
  };
}

function getSession(userId) {
  if (!sessions.has(userId)) {
    sessions.set(userId, getDefaultSession());
  }
  return sessions.get(userId);
}

/**
 * Inicia (ou reinicia) a sessão, pré-carregando o que já está configurado no
 * servidor: tipos de ticket, texto do painel e mensagem de boas-vindas.
 */
function startSession(userId, guildConfig) {
  sessions.set(userId, {
    types: (guildConfig.ticketTypes || []).map((type) => ({ ...type })),
    pendingType: null,
    panelTitle: guildConfig.ticketPanelTitle || null,
    panelDescription: guildConfig.ticketPanelDescription || null,
    welcomeMessage: guildConfig.ticketWelcomeMessage || null
  });
  return sessions.get(userId);
}

function deleteSession(userId) {
  sessions.delete(userId);
}

module.exports = { getSession, startSession, deleteSession };
