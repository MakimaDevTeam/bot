const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelSelectMenuBuilder,
  RoleSelectMenuBuilder,
  StringSelectMenuBuilder,
  ChannelType
} = require('discord.js');

const config = require('../../../config');
const { slugify } = require('../../../utils/helpers');

/**
 * Tela principal do construtor: lista os tipos de ticket já configurados
 * e os botões de ação (adicionar, remover, publicar, cancelar).
 */
function buildMainEmbed(session) {
  const embed = new EmbedBuilder()
    .setColor('#2B2D31')
    .setTitle('🛠️ Construtor de Painel de Tickets')
    .setDescription(
      'Adicione quantos tipos de ticket quiser. Cada um vira um botão no painel público, ' +
        'com sua própria categoria e cargo de suporte.'
    );

  if (session.types.length === 0) {
    embed.addFields({ name: 'Tipos configurados', value: '*Nenhum tipo adicionado ainda.*' });
  } else {
    const lines = session.types.map((type, index) => {
      const category = type.categoryName ? `#${type.categoryName}` : '*sem categoria*';
      const roleNames = type.supportRoleNames || (type.supportRoleName ? [type.supportRoleName] : []);
      const role = roleNames.length ? roleNames.map((n) => `@${n}`).join(', ') : '*sem cargo de suporte*';
      const nextNumber = String((type.counter || 0) + 1).padStart(4, '0');
      return `**${index + 1}. ${type.emoji || '🎫'} ${type.label}** — ${category} • ${role}\nPróximo canal: \`${slugify(type.label)}-${nextNumber}\``;
    });
    embed.addFields({ name: `Tipos configurados (${session.types.length}/${config.limits.maxButtons})`, value: lines.join('\n\n') });
  }

  const panelTitle = session.panelTitle || config.defaultGuildConfig.ticketPanelTitle;
  const panelDescription = session.panelDescription || config.defaultGuildConfig.ticketPanelDescription;
  const welcomeMessage = session.welcomeMessage || config.defaultGuildConfig.ticketWelcomeMessage;

  embed.addFields(
    { name: '📋 Título do painel', value: panelTitle },
    { name: '📋 Descrição do painel', value: panelDescription },
    { name: '💬 Mensagem de boas-vindas', value: `${welcomeMessage}\n-# Placeholders: {usuario}, {tipo}` }
  );

  return embed;
}

function buildMainRows(session) {
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticketbuilder_add')
      .setLabel('Adicionar Tipo')
      .setEmoji('➕')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(session.types.length >= config.limits.maxButtons),
    new ButtonBuilder()
      .setCustomId('ticketbuilder_remove')
      .setLabel('Remover Tipo')
      .setEmoji('🗑️')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(session.types.length === 0)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticketbuilder_edit_panel').setLabel('Editar Painel').setEmoji('📋').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('ticketbuilder_edit_welcome')
      .setLabel('Editar Boas-vindas')
      .setEmoji('💬')
      .setStyle(ButtonStyle.Secondary)
  );

  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticketbuilder_publish')
      .setLabel('Publicar Painel')
      .setEmoji('📤')
      .setStyle(ButtonStyle.Success)
      .setDisabled(session.types.length === 0),
    new ButtonBuilder().setCustomId('ticketbuilder_cancel').setLabel('Cancelar').setEmoji('❌').setStyle(ButtonStyle.Danger)
  );

  return [row1, row2, row3];
}

/** Tela intermediária: escolher a categoria do tipo de ticket que está sendo adicionado. */
function buildCategoryPrompt(pendingType) {
  const embed = new EmbedBuilder()
    .setColor(config.colors.default)
    .setDescription(`📁 Selecione a categoria onde os tickets de **${pendingType.label}** serão criados:`);

  const row = new ActionRowBuilder().addComponents(
    new ChannelSelectMenuBuilder().setCustomId('ticketbuilder_category_select').setPlaceholder('Escolha uma categoria').addChannelTypes(ChannelType.GuildCategory)
  );

  const cancelRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticketbuilder_add_cancel').setLabel('Cancelar').setEmoji('❌').setStyle(ButtonStyle.Danger)
  );

  return { embeds: [embed], components: [row, cancelRow] };
}

/** Tela intermediária: escolher o(s) cargo(s) de suporte (opcional) do tipo de ticket. */
function buildRolePrompt(pendingType) {
  const embed = new EmbedBuilder()
    .setColor(config.colors.default)
    .setDescription(`👥 Selecione o(s) cargo(s) de suporte para **${pendingType.label}** (opcional, até 10):`);

  const row = new ActionRowBuilder().addComponents(
    new RoleSelectMenuBuilder()
      .setCustomId('ticketbuilder_role_select')
      .setPlaceholder('Escolha um ou mais cargos')
      .setMinValues(1)
      .setMaxValues(10)
  );

  const buttonsRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticketbuilder_role_skip').setLabel('Pular (sem cargo)').setEmoji('⏭️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('ticketbuilder_add_cancel').setLabel('Cancelar').setEmoji('❌').setStyle(ButtonStyle.Danger)
  );

  return { embeds: [embed], components: [row, buttonsRow] };
}

/** Tela de remoção: menu com todos os tipos configurados. */
function buildRemovePrompt(session) {
  const embed = new EmbedBuilder().setColor(config.colors.default).setDescription('🗑️ Selecione o tipo de ticket que deseja remover:');

  const menu = new StringSelectMenuBuilder()
    .setCustomId('ticketbuilder_remove_select')
    .setPlaceholder('Escolha um tipo para remover')
    .addOptions(
      session.types.map((type) => ({
        label: type.label.slice(0, 100),
        value: type.id,
        emoji: type.emoji || undefined
      }))
    );

  const row = new ActionRowBuilder().addComponents(menu);
  const backRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticketbuilder_back').setLabel('Voltar').setEmoji('↩️').setStyle(ButtonStyle.Secondary)
  );

  return { embeds: [embed], components: [row, backRow] };
}

/** Tela final: escolher o canal onde o painel público será publicado. */
function buildPublishPrompt() {
  const embed = new EmbedBuilder().setColor(config.colors.default).setDescription('📤 Selecione o canal onde o painel será publicado:');

  const row = new ActionRowBuilder().addComponents(
    new ChannelSelectMenuBuilder()
      .setCustomId('ticketbuilder_publish_channel_select')
      .setPlaceholder('Escolha um canal')
      .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
  );

  const backRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticketbuilder_back').setLabel('Voltar').setEmoji('↩️').setStyle(ButtonStyle.Secondary)
  );

  return { embeds: [embed], components: [row, backRow] };
}

/** Embed pública final do painel (mensagem fixa com um botão por tipo de ticket). */
function buildPublicPanelEmbed(session) {
  return new EmbedBuilder()
    .setColor(config.colors.default)
    .setTitle(session.panelTitle || config.defaultGuildConfig.ticketPanelTitle)
    .setDescription(session.panelDescription || config.defaultGuildConfig.ticketPanelDescription);
}

/** Converte os tipos configurados em ActionRows de botões (até 5 por linha, até 25 no total). */
function buildPublicPanelRows(types) {
  const rows = [];
  const perRow = config.limits.maxButtonsPerRow;

  for (let i = 0; i < types.length; i += perRow) {
    const slice = types.slice(i, i + perRow);
    const row = new ActionRowBuilder().addComponents(
      slice.map((type) =>
        new ButtonBuilder()
          .setCustomId(`ticket_open:${type.id}`)
          .setLabel(type.label.slice(0, 80))
          .setEmoji(type.emoji || '🎫')
          .setStyle(ButtonStyle.Primary)
      )
    );
    rows.push(row);
  }

  return rows;
}

module.exports = {
  buildMainEmbed,
  buildMainRows,
  buildCategoryPrompt,
  buildRolePrompt,
  buildRemovePrompt,
  buildPublishPrompt,
  buildPublicPanelEmbed,
  buildPublicPanelRows
};
