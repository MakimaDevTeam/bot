const { EmbedBuilder } = require('discord.js');
const config = require('../config');

/**
 * Embeds padrão reutilizáveis por qualquer módulo do bot.
 * Para o construtor visual do comando /embed, veja commands/embed/embedBuilder.js.
 */

function success(description, title = null) {
  const embed = new EmbedBuilder().setColor(config.colors.success).setDescription(`✅ ${description}`);
  if (title) embed.setTitle(title);
  return embed;
}

function error(description, title = null) {
  const embed = new EmbedBuilder().setColor(config.colors.error).setDescription(`❌ ${description}`);
  if (title) embed.setTitle(title);
  return embed;
}

function warning(description, title = null) {
  const embed = new EmbedBuilder().setColor(config.colors.warning).setDescription(`⚠️ ${description}`);
  if (title) embed.setTitle(title);
  return embed;
}

function info(description, title = null) {
  const embed = new EmbedBuilder().setColor(config.colors.default).setDescription(description);
  if (title) embed.setTitle(title);
  return embed;
}

module.exports = { success, error, warning, info };
