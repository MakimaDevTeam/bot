const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ChannelSelectMenuBuilder,
  ChannelType,
  MessageFlags
} = require('discord.js');

const handleModal = require('./embedModalHandler');
const { getSession, deleteSession } = require('../commands/embed/lib/sessionManager');
const { buildPreviewEmbed, buildStatusEmbed, buildPanelRows, buildCustomButtonRows } = require('../commands/embed/lib/embedBuilder');
const { handleTicketButton } = require('../commands/tickets/lib/ticketManager');
const { handleTicketBuilderInteraction } = require('./ticketBuilderHandler');
const { isAdmin } = require('../utils/permissions');
const logger = require('../utils/logger');

function textInput(customId, label, style, options = {}) {
  const input = new TextInputBuilder()
    .setCustomId(customId)
    .setLabel(label)
    .setStyle(style)
    .setRequired(options.required ?? false);

  if (options.placeholder) input.setPlaceholder(options.placeholder);
  if (options.value) input.setValue(options.value);
  if (options.maxLength) input.setMaxLength(options.maxLength);

  return new ActionRowBuilder().addComponents(input);
}

/**
 * Abre o modal correspondente ao botão do painel clicado.
 * Retorna true se um modal foi aberto, false caso o customId não corresponda.
 */
async function openModal(interaction, session) {
  let modal;

  switch (interaction.customId) {
    case 'embed_title': {
      modal = new ModalBuilder().setCustomId('modal_title').setTitle('Título da Embed');
      modal.addComponents(
        textInput('title_input', 'Título', TextInputStyle.Short, { required: true, maxLength: 256, value: session.title || '' })
      );
      break;
    }

    case 'embed_description': {
      modal = new ModalBuilder().setCustomId('modal_description').setTitle('Descrição da Embed');
      modal.addComponents(
        textInput('description_input', 'Descrição', TextInputStyle.Paragraph, {
          required: true,
          maxLength: 4000,
          value: session.description || ''
        })
      );
      break;
    }

    case 'embed_author': {
      modal = new ModalBuilder().setCustomId('modal_author').setTitle('Autor da Embed');
      modal.addComponents(
        textInput('author_name_input', 'Nome do Autor', TextInputStyle.Short, {
          required: true,
          maxLength: 256,
          value: session.author.name || ''
        }),
        textInput('author_icon_input', 'Ícone (URL) - opcional', TextInputStyle.Short, {
          required: false,
          value: session.author.iconURL || ''
        })
      );
      break;
    }

    case 'embed_image': {
      modal = new ModalBuilder().setCustomId('modal_image').setTitle('Imagem da Embed');
      modal.addComponents(
        textInput('image_url_input', 'URL da imagem (http:// ou https://)', TextInputStyle.Short, {
          required: true,
          value: session.image || ''
        })
      );
      break;
    }

    case 'embed_color': {
      modal = new ModalBuilder().setCustomId('modal_color').setTitle('Cor da Embed');
      modal.addComponents(
        textInput('color_input', 'Cor (hex) ex: #5865F2', TextInputStyle.Short, {
          required: true,
          value: session.color || '#5865F2'
        })
      );
      break;
    }

    case 'embed_footer': {
      modal = new ModalBuilder().setCustomId('modal_footer').setTitle('Rodapé da Embed');
      modal.addComponents(
        textInput('footer_text_input', 'Texto do Rodapé', TextInputStyle.Short, {
          required: true,
          maxLength: 2048,
          value: session.footer.text || ''
        }),
        textInput('footer_icon_input', 'Ícone (URL) - opcional', TextInputStyle.Short, {
          required: false,
          value: session.footer.iconURL || ''
        })
      );
      break;
    }

    case 'embed_buttons': {
      modal = new ModalBuilder().setCustomId('modal_addbutton').setTitle('Adicionar Botão (Link)');
      modal.addComponents(
        textInput('button_text_input', 'Texto do Botão', TextInputStyle.Short, { required: true, maxLength: 80 }),
        textInput('button_link_input', 'Link (http:// ou https://)', TextInputStyle.Short, { required: true }),
        textInput('button_emoji_input', 'Emoji (opcional)', TextInputStyle.Short, { required: false })
      );
      break;
    }

    default:
      return false;
  }

  await interaction.showModal(modal);
  return true;
}

module.exports = {
  name: 'interactionCreate',
  once: false,
  async execute(client, interaction) {
    try {
      // ─── Comandos slash ───────────────────────────────
      if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;
        logger.command(interaction.user.tag, `/${interaction.commandName}`);
        return await command.execute(interaction);
      }

      // ─── Envio de modal ───────────────────────────────
      if (interaction.isModalSubmit()) {
        if (interaction.customId.startsWith('modal_ticket_')) {
          return await handleTicketBuilderInteraction(interaction);
        }
        return await handleModal(interaction);
      }

      // ─── Seletores do construtor de tickets (categoria, cargo, remoção, canal de publicação) ──
      if (interaction.isChannelSelectMenu() && interaction.customId.startsWith('ticketbuilder_')) {
        return await handleTicketBuilderInteraction(interaction);
      }
      if (interaction.isRoleSelectMenu() && interaction.customId.startsWith('ticketbuilder_')) {
        return await handleTicketBuilderInteraction(interaction);
      }
      if (interaction.isStringSelectMenu() && interaction.customId.startsWith('ticketbuilder_')) {
        return await handleTicketBuilderInteraction(interaction);
      }

      // ─── Seleção do canal de destino ──────────────────
      if (interaction.isChannelSelectMenu() && interaction.customId === 'embed_channel_select') {
        const session = getSession(interaction.user.id);
        const channel = interaction.channels?.first() || (await client.channels.fetch(interaction.values[0]));

        const preview = buildPreviewEmbed(session);
        const buttonRows = buildCustomButtonRows(session);

        try {
          await channel.send({ embeds: [preview], components: buttonRows });
          deleteSession(interaction.user.id);
          return await interaction.update({ content: '✅ Embed enviada com sucesso.', embeds: [], components: [] });
        } catch (err) {
          logger.error(`Erro ao enviar embed: ${err.message}`);
          return await interaction.update({
            content: '❌ Não foi possível enviar a embed. Verifique minhas permissões no canal selecionado.',
            embeds: [],
            components: []
          });
        }
      }

      // ─── Botões do painel ──────────────────────────────
      if (interaction.isButton()) {
        // Botões do construtor de painel de tickets (/ticket-criar) — o próprio
        // comando já exige admin, então nenhuma checagem extra é necessária aqui.
        if (interaction.customId.startsWith('ticketbuilder_')) {
          return await handleTicketBuilderInteraction(interaction);
        }

        // Botões de ticket já publicado têm suas próprias regras de permissão
        // (abrir é livre, reivindicar/fechar exige isModerator) — tratados à
        // parte, antes da checagem de admin usada pelo painel de embeds.
        if (interaction.customId.startsWith('ticket_')) {
          return await handleTicketButton(client, interaction);
        }

        if (!isAdmin(interaction.member)) {
          return await interaction.reply({
            content: '❌ Você não possui permissão para utilizar este comando.',
            flags: MessageFlags.Ephemeral
          });
        }

        const session = getSession(interaction.user.id);

        if (interaction.customId === 'embed_preview') {
          return await interaction.update({
            embeds: [buildPreviewEmbed(session), buildStatusEmbed(session)],
            components: buildPanelRows(session)
          });
        }

        if (interaction.customId === 'embed_cancel') {
          deleteSession(interaction.user.id);
          return await interaction.update({
            content: '❌ Operação cancelada. Todos os dados da sessão foram apagados.',
            embeds: [],
            components: []
          });
        }

        if (interaction.customId === 'embed_send') {
          const hasMinContent = session.title || session.description || session.author.name || session.image;
          if (!hasMinContent) {
            return await interaction.reply({
              content: '❌ Adicione ao menos um título, descrição, autor ou imagem antes de enviar.',
              flags: MessageFlags.Ephemeral
            });
          }

          const selectRow = new ActionRowBuilder().addComponents(
            new ChannelSelectMenuBuilder()
              .setCustomId('embed_channel_select')
              .setPlaceholder('Escolha um canal')
              .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
          );

          return await interaction.reply({
            content: '📤 Escolha o canal para enviar a embed:',
            components: [selectRow],
            flags: MessageFlags.Ephemeral
          });
        }

        // Demais botões abrem um modal (Título, Descrição, Autor, Imagem, Cor, Rodapé, Botões)
        const opened = await openModal(interaction, session);
        if (!opened) return;
      }
    } catch (error) {
      logger.error(`Erro ao processar interação: ${error.message}`);
      if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: '❌ Ocorreu um erro ao processar sua ação.', flags: MessageFlags.Ephemeral }).catch(() => {});
      }
    }
  }
};
