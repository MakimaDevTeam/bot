const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits, MessageFlags } = require('discord.js');

const database = require('../../../handlers/databaseManager');
const config = require('../../../config');
const embeds = require('../../../utils/embeds');
const logger = require('../../../utils/logger');
const { isModerator } = require('../../../utils/permissions');
const { slugify, formatDuration } = require('../../../utils/helpers');
const { generateTranscript } = require('../../../utils/transcript');

/** Envia um embed (com anexos opcionais) para o canal de logs configurado no servidor, se houver. */
async function sendToLogs(client, guild, { embed, files } = {}) {
  const guildConfig = database.getGuild(guild.id);
  if (!guildConfig.logsChannel) return;

  const channel = guild.channels.cache.get(guildConfig.logsChannel);
  if (!channel) return;

  try {
    await channel.send({ embeds: embed ? [embed] : [], files: files || [] });
  } catch (err) {
    logger.error(`Falha ao enviar log de ticket: ${err.message}`);
  }
}

/** Normaliza os cargos de suporte de um tipo de ticket em um array de IDs (compatível com tickets antigos, que tinham só 1 cargo). */
function getSupportRoleIds(type) {
  if (Array.isArray(type.supportRoleIds)) return type.supportRoleIds.filter(Boolean);
  return type.supportRoleId ? [type.supportRoleId] : [];
}

/** Botões dentro do canal do ticket já aberto: reivindicar e fechar. */
function buildTicketRow({ claimed }) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket_claim')
      .setLabel(claimed ? 'Reivindicado' : 'Reivindicar')
      .setEmoji('🙋')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(claimed),
    new ButtonBuilder().setCustomId('ticket_close').setLabel('Fechar Ticket').setEmoji('🔒').setStyle(ButtonStyle.Danger)
  );
}

function buildConfirmCloseRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket_close_confirm').setLabel('Confirmar').setEmoji('✅').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('ticket_close_cancel').setLabel('Cancelar').setEmoji('↩️').setStyle(ButtonStyle.Secondary)
  );
}

/**
 * Incrementa e persiste o contador de um tipo de ticket específico, e retorna
 * o número já usado por ESTE ticket (contador pós-incremento).
 */
function nextTicketNumber(guildId, typeId) {
  const guildConfig = database.getGuild(guildId);
  const type = guildConfig.ticketTypes.find((t) => t.id === typeId);
  type.counter = (type.counter || 0) + 1;
  database.updateGuild(guildId, { ticketTypes: guildConfig.ticketTypes });
  return type.counter;
}

async function openTicket(client, interaction) {
  const { guild, user } = interaction;
  const [, typeId] = interaction.customId.split(':');

  const guildConfig = database.getGuild(guild.id);
  const type = guildConfig.ticketTypes.find((t) => t.id === typeId);

  if (!type) {
    return interaction.reply({
      embeds: [embeds.error('Este tipo de ticket não existe mais. Peça a um administrador para republicar o painel com `/ticket-criar`.')],
      flags: MessageFlags.Ephemeral
    });
  }

  const existing = database.findOpenTicket(guild.id, user.id);
  if (existing) {
    return interaction.reply({
      embeds: [embeds.error(`Você já tem um ticket aberto: <#${existing.channelId}>`)],
      flags: MessageFlags.Ephemeral
    });
  }

  const category = guild.channels.cache.get(type.categoryId);
  if (!category) {
    return interaction.reply({
      embeds: [embeds.error('A categoria configurada para este tipo de ticket não existe mais. Peça a um administrador para reconfigurar.')],
      flags: MessageFlags.Ephemeral
    });
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const number = nextTicketNumber(guild.id, type.id);
  const channelName = `${slugify(type.label)}-${String(number).padStart(4, '0')}`;

  const overwrites = [
    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    {
      id: user.id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
    },
    {
      id: client.user.id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels]
    }
  ];

  const supportRoleIds = getSupportRoleIds(type);
  for (const roleId of supportRoleIds) {
    overwrites.push({
      id: roleId,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
    });
  }

  let channel;
  try {
    channel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: category.id,
      permissionOverwrites: overwrites
    });
  } catch (err) {
    logger.error(`Falha ao criar canal de ticket: ${err.message}`);
    return interaction.editReply({
      embeds: [embeds.error('Não foi possível criar o canal do ticket. Verifique minhas permissões na categoria configurada.')]
    });
  }

  database.createTicket(channel.id, { guildId: guild.id, userId: user.id, typeId: type.id, typeLabel: type.label, number });

  const welcomeText = (guildConfig.ticketWelcomeMessage || config.defaultGuildConfig.ticketWelcomeMessage)
    .replaceAll('{usuario}', `${user}`)
    .replaceAll('{tipo}', type.label);

  const welcomeEmbed = new EmbedBuilder()
    .setColor(config.colors.default)
    .setTitle(`${type.emoji || '🎫'} ${channelName}`)
    .setDescription(welcomeText);

  const mentionContent = supportRoleIds.length ? supportRoleIds.map((id) => `<@&${id}>`).join(' ') : undefined;

  await channel.send({
    content: mentionContent,
    embeds: [welcomeEmbed],
    components: [buildTicketRow({ claimed: false })]
  });

  logger.info(`Ticket "${channelName}" aberto por ${user.tag} em ${guild.name}.`);

  sendToLogs(client, guild, {
    embed: embeds
      .success(`**Canal:** ${channel}\n**Aberto por:** ${user} (${user.tag})\n**Tipo:** ${type.label}`, '🎫 Ticket aberto')
  });

  return interaction.editReply({ embeds: [embeds.success(`Seu ticket foi criado: ${channel}`)] });
}

async function claimTicket(interaction) {
  if (!isModerator(interaction.member)) {
    return interaction.reply({ embeds: [embeds.error('Apenas a equipe de suporte pode reivindicar tickets.')], flags: MessageFlags.Ephemeral });
  }

  const ticket = database.getTicket(interaction.channel.id);
  if (!ticket) {
    return interaction.reply({ embeds: [embeds.error('Este canal não é um ticket ativo.')], flags: MessageFlags.Ephemeral });
  }

  if (ticket.claimedBy) {
    return interaction.reply({ embeds: [embeds.error(`Este ticket já foi reivindicado por <@${ticket.claimedBy}>.`)], flags: MessageFlags.Ephemeral });
  }

  database.updateTicket(interaction.channel.id, { claimedBy: interaction.user.id });

  await interaction.update({ components: [buildTicketRow({ claimed: true })] });

  sendToLogs(interaction.client, interaction.guild, {
    embed: embeds.info(`**Canal:** ${interaction.channel}\n**Reivindicado por:** ${interaction.user} (${interaction.user.tag})`, '🙋 Ticket reivindicado')
  });

  return interaction.followUp({ embeds: [embeds.success(`Ticket reivindicado por ${interaction.user}.`)] });
}

async function promptClose(interaction) {
  if (!isModerator(interaction.member)) {
    return interaction.reply({ embeds: [embeds.error('Apenas a equipe de suporte pode fechar tickets.')], flags: MessageFlags.Ephemeral });
  }

  const ticket = database.getTicket(interaction.channel.id);
  if (!ticket) {
    return interaction.reply({ embeds: [embeds.error('Este canal não é um ticket ativo.')], flags: MessageFlags.Ephemeral });
  }

  return interaction.reply({
    embeds: [embeds.warning('Tem certeza que deseja fechar este ticket? O canal será excluído em seguida.')],
    components: [buildConfirmCloseRow()],
    flags: MessageFlags.Ephemeral
  });
}

async function confirmClose(client, interaction) {
  const { channel, guild } = interaction;

  const ticket = database.getTicket(channel.id);
  if (!ticket) {
    return interaction.update({ embeds: [embeds.error('Este ticket já não existe mais.')], components: [] });
  }

  const closedAt = Date.now();
  database.updateTicket(channel.id, { status: 'closed', closedBy: interaction.user.id, closedAt });

  await interaction.update({ embeds: [embeds.success('Gerando transcript e fechando o ticket...')], components: [] });
  logger.info(`Ticket "${channel.name}" fechado por ${interaction.user.tag}.`);

  // Gera o transcript ANTES de excluir o canal (senão as mensagens somem).
  try {
    const transcriptFile = await generateTranscript(channel);
    const opener = await client.users.fetch(ticket.userId).catch(() => null);
    const claimer = ticket.claimedBy ? await client.users.fetch(ticket.claimedBy).catch(() => null) : null;
    const duration = formatDuration(closedAt - ticket.createdAt);

    const summary = [
      `**Ticket:** ${ticket.typeLabel} #${String(ticket.number).padStart(4, '0')}`,
      `**Aberto por:** ${opener ? `${opener} (${opener.tag})` : ticket.userId}`,
      `**Reivindicado por:** ${claimer ? `${claimer} (${claimer.tag})` : 'Ninguém'}`,
      `**Fechado por:** ${interaction.user} (${interaction.user.tag})`,
      `**Duração:** ${duration}`
    ].join('\n');

    await sendToLogs(client, guild, {
      embed: embeds.info(summary, '🔒 Ticket fechado — transcript'),
      files: [transcriptFile]
    });

    // Tenta também mandar uma cópia do transcript por DM para quem abriu o ticket.
    if (opener) {
      const dmFile = await generateTranscript(channel);
      await opener
        .send({
          embeds: [embeds.info(`Seu ticket **${ticket.typeLabel}** em **${guild.name}** foi fechado. Segue o transcript da conversa.`)],
          files: [dmFile]
        })
        .catch(() => null); // usuário pode ter DMs fechadas — ignora silenciosamente
    }
  } catch (err) {
    logger.error(`Falha ao gerar/enviar transcript do ticket "${channel.name}": ${err.message}`);
  }

  setTimeout(() => {
    channel.delete().catch((err) => logger.error(`Falha ao excluir canal de ticket: ${err.message}`));
  }, 5000);
}

async function cancelClose(interaction) {
  return interaction.update({ embeds: [embeds.info('Fechamento cancelado.')], components: [] });
}

/** Ponto de entrada único para qualquer botão cujo customId comece com "ticket_" (mas não "ticketbuilder_"). */
async function handleTicketButton(client, interaction) {
  const [action] = interaction.customId.split(':');

  switch (action) {
    case 'ticket_open':
      return openTicket(client, interaction);
    case 'ticket_claim':
      return claimTicket(interaction);
    case 'ticket_close':
      return promptClose(interaction);
    case 'ticket_close_confirm':
      return confirmClose(client, interaction);
    case 'ticket_close_cancel':
      return cancelClose(interaction);
    default:
      return;
  }
}

module.exports = { handleTicketButton };
