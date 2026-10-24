const { getSession } = require('../utils/sessionManager');
const { isValidURL, isValidHexColor, normalizeHexColor } = require('../utils/validators');
const { buildPreviewEmbed, buildStatusEmbed, buildPanelRows } = require('../utils/embedBuilder');
const config = require('../config');

/**
 * Atualiza a mensagem ephemeral do painel com o estado atual da sessão.
 * Como o modal foi aberto a partir de um botão (interaction.showModal),
 * o ModalSubmitInteraction resultante permite usar .update() para editar
 * a própria mensagem original do painel.
 */
async function refreshPanel(interaction, session) {
  const preview = buildPreviewEmbed(session);
  const status = buildStatusEmbed(session);
  const rows = buildPanelRows(session);

  if (interaction.isFromMessage && interaction.isFromMessage()) {
    await interaction.update({ embeds: [preview, status], components: rows });
  } else {
    await interaction.reply({ embeds: [preview, status], components: rows, ephemeral: true });
  }
}

module.exports = async function handleModal(interaction) {
  const session = getSession(interaction.user.id);

  switch (interaction.customId) {
    case 'modal_title': {
      session.title = interaction.fields.getTextInputValue('title_input') || null;
      break;
    }

    case 'modal_description': {
      session.description = interaction.fields.getTextInputValue('description_input') || null;
      break;
    }

    case 'modal_author': {
      const name = interaction.fields.getTextInputValue('author_name_input') || null;
      const icon = interaction.fields.getTextInputValue('author_icon_input');

      if (icon && !isValidURL(icon)) {
        return interaction.reply({
          content: '❌ A URL do ícone do autor é inválida. Deve começar com http:// ou https://',
          ephemeral: true
        });
      }

      session.author.name = name;
      session.author.iconURL = icon || null;
      break;
    }

    case 'modal_image': {
      const url = interaction.fields.getTextInputValue('image_url_input');

      if (url && !isValidURL(url)) {
        return interaction.reply({
          content: '❌ URL de imagem inválida. Deve começar com http:// ou https://',
          ephemeral: true
        });
      }

      session.image = url || null;
      break;
    }

    case 'modal_color': {
      const color = interaction.fields.getTextInputValue('color_input');

      if (!isValidHexColor(color)) {
        return interaction.reply({
          content: '❌ Cor inválida. Use um formato hexadecimal, ex: #5865F2 ou 5865F2.',
          ephemeral: true
        });
      }

      session.color = normalizeHexColor(color);
      break;
    }

    case 'modal_footer': {
      const text = interaction.fields.getTextInputValue('footer_text_input') || null;
      const icon = interaction.fields.getTextInputValue('footer_icon_input');

      if (icon && !isValidURL(icon)) {
        return interaction.reply({
          content: '❌ A URL do ícone do rodapé é inválida. Deve começar com http:// ou https://',
          ephemeral: true
        });
      }

      session.footer.text = text;
      session.footer.iconURL = icon || null;
      break;
    }

    case 'modal_addbutton': {
      const text = interaction.fields.getTextInputValue('button_text_input');
      const link = interaction.fields.getTextInputValue('button_link_input');
      let emoji = null;
      try {
        emoji = interaction.fields.getTextInputValue('button_emoji_input');
      } catch (e) {
        // campo opcional, ignora se não existir
      }

      if (!isValidURL(link)) {
        return interaction.reply({
          content: '❌ O link do botão é inválido. Deve começar com http:// ou https://',
          ephemeral: true
        });
      }

      if (session.buttons.length >= config.limits.maxButtons) {
        return interaction.reply({
          content: `❌ Limite máximo de botões atingido (${config.limits.maxButtons}).`,
          ephemeral: true
        });
      }

      session.buttons.push({ text: text.slice(0, 80), link, emoji: emoji || null });
      break;
    }

    default:
      return;
  }

  await refreshPanel(interaction, session);
};
