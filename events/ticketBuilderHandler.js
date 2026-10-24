const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, MessageFlags } = require('discord.js');

const database = require('../handlers/databaseManager');
const config = require('../config');
const embeds = require('../utils/embeds');
const logger = require('../utils/logger');
const { shortId } = require('../utils/helpers');
const { getSession, startSession, deleteSession } = require('../commands/tickets/lib/ticketBuilderSession');
const view = require('../commands/tickets/lib/ticketBuilderView');

/** Reenvia (edita) a tela principal do construtor com o estado atual da sessão. */
async function showMainPanel(interaction, session) {
  await interaction.update({
    embeds: [view.buildMainEmbed(session)],
    components: view.buildMainRows(session)
  });
}

async function handleAddButton(interaction, session) {
  const modal = new ModalBuilder().setCustomId('modal_ticket_type').setTitle('Novo Tipo de Ticket');

  const labelInput = new TextInputBuilder()
    .setCustomId('ticket_type_label')
    .setLabel('Nome do tipo (ex: Revogação)')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(60);

  const emojiInput = new TextInputBuilder()
    .setCustomId('ticket_type_emoji')
    .setLabel('Emoji do botão (opcional)')
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setMaxLength(10);

  modal.addComponents(new ActionRowBuilder().addComponents(labelInput), new ActionRowBuilder().addComponents(emojiInput));

  await interaction.showModal(modal);
}

async function handleModalSubmit(interaction) {
  const session = getSession(interaction.user.id);

  const label = interaction.fields.getTextInputValue('ticket_type_label').trim();
  let emoji = null;
  try {
    emoji = interaction.fields.getTextInputValue('ticket_type_emoji').trim() || null;
  } catch (e) {
    // campo opcional, ignora se não existir
  }

  if (!label) {
    return interaction.reply({ embeds: [embeds.error('O nome do tipo de ticket não pode ficar vazio.')], flags: MessageFlags.Ephemeral });
  }

  session.pendingType = { label, emoji };

  const prompt = view.buildCategoryPrompt(session.pendingType);

  if (interaction.isFromMessage && interaction.isFromMessage()) {
    await interaction.update(prompt);
  } else {
    await interaction.reply({ ...prompt, flags: MessageFlags.Ephemeral });
  }
}

async function handleCategorySelect(interaction) {
  const session = getSession(interaction.user.id);
  if (!session.pendingType) {
    return interaction.update({ embeds: [embeds.error('Sessão expirada. Rode `/ticket-criar` novamente.')], components: [] });
  }

  const category = interaction.channels.first();
  session.pendingType.categoryId = category.id;
  session.pendingType.categoryName = category.name;

  const prompt = view.buildRolePrompt(session.pendingType);
  await interaction.update(prompt);
}

async function finalizePendingType(interaction, session, supportRoles) {
  const roles = supportRoles || [];
  const type = {
    id: shortId(),
    label: session.pendingType.label,
    emoji: session.pendingType.emoji,
    categoryId: session.pendingType.categoryId,
    categoryName: session.pendingType.categoryName,
    supportRoleIds: roles.map((r) => r.id),
    supportRoleNames: roles.map((r) => r.name),
    counter: 0
  };

  session.types.push(type);
  session.pendingType = null;

  await interaction.update({ embeds: [view.buildMainEmbed(session)], components: view.buildMainRows(session) });
}

async function handleRoleSelect(interaction) {
  const session = getSession(interaction.user.id);
  if (!session.pendingType) {
    return interaction.update({ embeds: [embeds.error('Sessão expirada. Rode `/ticket-criar` novamente.')], components: [] });
  }

  const roles = [...interaction.roles.values()];
  await finalizePendingType(interaction, session, roles);
}

async function handleRoleSkip(interaction) {
  const session = getSession(interaction.user.id);
  if (!session.pendingType) {
    return interaction.update({ embeds: [embeds.error('Sessão expirada. Rode `/ticket-criar` novamente.')], components: [] });
  }

  await finalizePendingType(interaction, session, []);
}

async function handleAddCancel(interaction) {
  const session = getSession(interaction.user.id);
  session.pendingType = null;
  await showMainPanel(interaction, session);
}

async function handleEditPanelButton(interaction, session) {
  const modal = new ModalBuilder().setCustomId('modal_ticket_panel_text').setTitle('Texto do Painel Público');

  const titleInput = new TextInputBuilder()
    .setCustomId('ticket_panel_title')
    .setLabel('Título')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(256)
    .setValue(session.panelTitle || config.defaultGuildConfig.ticketPanelTitle);

  const descriptionInput = new TextInputBuilder()
    .setCustomId('ticket_panel_description')
    .setLabel('Descrição')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(2000)
    .setValue(session.panelDescription || config.defaultGuildConfig.ticketPanelDescription);

  modal.addComponents(new ActionRowBuilder().addComponents(titleInput), new ActionRowBuilder().addComponents(descriptionInput));
  await interaction.showModal(modal);
}

async function handleEditPanelSubmit(interaction) {
  const session = getSession(interaction.user.id);

  session.panelTitle = interaction.fields.getTextInputValue('ticket_panel_title').trim() || null;
  session.panelDescription = interaction.fields.getTextInputValue('ticket_panel_description').trim() || null;

  await showMainPanel(interaction, session);
}

async function handleEditWelcomeButton(interaction, session) {
  const modal = new ModalBuilder().setCustomId('modal_ticket_welcome_text').setTitle('Mensagem de Boas-vindas do Ticket');

  const messageInput = new TextInputBuilder()
    .setCustomId('ticket_welcome_message')
    .setLabel('Mensagem (use {usuario} e {tipo})')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(2000)
    .setValue(session.welcomeMessage || config.defaultGuildConfig.ticketWelcomeMessage);

  modal.addComponents(new ActionRowBuilder().addComponents(messageInput));
  await interaction.showModal(modal);
}

async function handleEditWelcomeSubmit(interaction) {
  const session = getSession(interaction.user.id);

  session.welcomeMessage = interaction.fields.getTextInputValue('ticket_welcome_message').trim() || null;

  await showMainPanel(interaction, session);
}

async function handleRemoveButton(interaction, session) {
  await interaction.update(view.buildRemovePrompt(session));
}

async function handleRemoveSelect(interaction) {
  const session = getSession(interaction.user.id);
  const [removedId] = interaction.values;
  session.types = session.types.filter((type) => type.id !== removedId);
  await showMainPanel(interaction, session);
}

async function handleBack(interaction) {
  const session = getSession(interaction.user.id);
  await showMainPanel(interaction, session);
}

async function handlePublishButton(interaction, session) {
  if (session.types.length === 0) {
    return interaction.reply({ embeds: [embeds.error('Adicione ao menos um tipo de ticket antes de publicar.')], flags: MessageFlags.Ephemeral });
  }
  await interaction.update(view.buildPublishPrompt());
}

async function handlePublishChannelSelect(interaction) {
  const session = getSession(interaction.user.id);
  const channel = interaction.channels.first();

  // Blindagem: se a sessão foi perdida por qualquer motivo (ex: o bot
  // reiniciou entre você clicar em "Publicar" e escolher o canal), aborta em
  // vez de publicar um painel vazio sem nenhum botão.
  if (session.types.length === 0) {
    return interaction.update({
      embeds: [
        embeds.error(
          'A configuração desta sessão foi perdida (provavelmente o bot reiniciou no meio do processo). Rode `/ticket-criar` novamente.'
        )
      ],
      components: []
    });
  }

  try {
    await channel.send({
      embeds: [view.buildPublicPanelEmbed(session)],
      components: view.buildPublicPanelRows(session.types)
    });
  } catch (err) {
    logger.error(`Falha ao publicar painel de tickets: ${err.message}`);
    return await interaction.update({
      embeds: [embeds.error('Não foi possível publicar o painel. Verifique minhas permissões no canal selecionado.')],
      components: []
    });
  }

  database.updateGuild(interaction.guild.id, {
    ticketTypes: session.types,
    ticketPanelTitle: session.panelTitle || config.defaultGuildConfig.ticketPanelTitle,
    ticketPanelDescription: session.panelDescription || config.defaultGuildConfig.ticketPanelDescription,
    ticketWelcomeMessage: session.welcomeMessage || config.defaultGuildConfig.ticketWelcomeMessage
  });
  deleteSession(interaction.user.id);

  logger.info(`Painel de tickets publicado por ${interaction.user.tag} em ${interaction.guild.name} (${session.types.length} tipo(s)).`);

  await interaction.update({ embeds: [embeds.success(`Painel publicado em ${channel} com ${session.types.length} tipo(s) de ticket.`)], components: [] });
}

async function handleCancel(interaction) {
  deleteSession(interaction.user.id);
  await interaction.update({ embeds: [embeds.info('Configuração cancelada. Nenhuma alteração foi salva.')], components: [] });
}

/** Ponto de entrada único, chamado pelo interactionCreate para qualquer interação do construtor. */
async function handleTicketBuilderInteraction(interaction) {
  if (interaction.isModalSubmit() && interaction.customId === 'modal_ticket_type') {
    return handleModalSubmit(interaction);
  }

  if (interaction.isModalSubmit() && interaction.customId === 'modal_ticket_panel_text') {
    return handleEditPanelSubmit(interaction);
  }

  if (interaction.isModalSubmit() && interaction.customId === 'modal_ticket_welcome_text') {
    return handleEditWelcomeSubmit(interaction);
  }

  if (interaction.isChannelSelectMenu() && interaction.customId === 'ticketbuilder_category_select') {
    return handleCategorySelect(interaction);
  }

  if (interaction.isChannelSelectMenu() && interaction.customId === 'ticketbuilder_publish_channel_select') {
    return handlePublishChannelSelect(interaction);
  }

  if (interaction.isRoleSelectMenu() && interaction.customId === 'ticketbuilder_role_select') {
    return handleRoleSelect(interaction);
  }

  if (interaction.isStringSelectMenu() && interaction.customId === 'ticketbuilder_remove_select') {
    return handleRemoveSelect(interaction);
  }

  if (interaction.isButton()) {
    const session = getSession(interaction.user.id);

    switch (interaction.customId) {
      case 'ticketbuilder_add':
        return handleAddButton(interaction, session);
      case 'ticketbuilder_remove':
        return handleRemoveButton(interaction, session);
      case 'ticketbuilder_edit_panel':
        return handleEditPanelButton(interaction, session);
      case 'ticketbuilder_edit_welcome':
        return handleEditWelcomeButton(interaction, session);
      case 'ticketbuilder_publish':
        return handlePublishButton(interaction, session);
      case 'ticketbuilder_cancel':
        return handleCancel(interaction);
      case 'ticketbuilder_role_skip':
        return handleRoleSkip(interaction);
      case 'ticketbuilder_add_cancel':
        return handleAddCancel(interaction);
      case 'ticketbuilder_back':
        return handleBack(interaction);
      default:
        return;
    }
  }
}

module.exports = { handleTicketBuilderInteraction, showMainPanel };
