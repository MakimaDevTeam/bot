require('dotenv').config();

module.exports = {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID || null,
  ownerIds: (process.env.OWNER_IDS || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean),

  colors: {
    default: '#5865F2',
    success: '#57F287',
    error: '#ED4245',
    warning: '#FEE75C'
  },

  limits: {
    maxButtons: 25, // máximo de botões-link por embed
    maxButtonsPerRow: 5 // máximo de botões por linha (ActionRow)
  },

  // Estrutura padrão de configuração por servidor.
  // Usada pelo databaseManager para criar a entrada de um guildId novo em database/guilds.json.
  defaultGuildConfig: {
    levelChannel: null,
    levelUpEnabled: true,
    welcomeChannel: null,
    logsChannel: null,
    // Cada botão do painel de tickets é um "tipo", com sua própria categoria,
    // cargo de suporte e contador de numeração — configurados via /ticket-criar.
    // Formato de cada item: { id, label, emoji, categoryId, supportRoleId, counter }
    ticketTypes: [],
    // Textos editáveis do sistema de tickets (também via /ticket-criar).
    ticketPanelTitle: '🎫 Central de Atendimento',
    ticketPanelDescription: 'Precisa de ajuda? Clique em um dos botões abaixo para abrir um ticket privado com a equipe.',
    // Suporta os placeholders {usuario} e {tipo} — substituídos ao abrir o ticket.
    ticketWelcomeMessage: 'Olá {usuario}, a equipe foi notificada e vai te atender em breve.\nDescreva o motivo do seu contato abaixo.'
  }
};
