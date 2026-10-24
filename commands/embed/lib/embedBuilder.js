const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../../../config');

/**
 * Monta a embed que representa exatamente como a embed final vai ficar.
 */
function buildPreviewEmbed(session) {
  const embed = new EmbedBuilder();
  const hasContent =
    session.title || session.description || session.author?.name || session.footer?.text || session.image || session.thumbnail;

  embed.setColor(session.color || config.colors.default);

  if (session.title) embed.setTitle(session.title);

  if (session.description) {
    embed.setDescription(session.description);
  } else if (!hasContent) {
    embed.setDescription('*Use os botões abaixo para configurar sua embed.*');
  }

  if (session.author?.name) {
    embed.setAuthor({ name: session.author.name, iconURL: session.author.iconURL || undefined });
  }

  if (session.footer?.text) {
    embed.setFooter({ text: session.footer.text, iconURL: session.footer.iconURL || undefined });
  }

  if (session.image) embed.setImage(session.image);
  if (session.thumbnail) embed.setThumbnail(session.thumbnail);

  return embed;
}

/**
 * Pequena embed de status mostrando o que já foi preenchido.
 */
function buildStatusEmbed(session) {
  return new EmbedBuilder()
    .setColor('#2B2D31')
    .setTitle('🛠️ Painel de Criação de Embed')
    .setDescription('Configure sua embed usando os botões abaixo. A pré-visualização aparece acima.')
    .addFields(
      { name: '📝 Título', value: session.title ? '✅' : '➖', inline: true },
      { name: '📄 Descrição', value: session.description ? '✅' : '➖', inline: true },
      { name: '👤 Autor', value: session.author?.name ? '✅' : '➖', inline: true },
      { name: '🖼️ Imagem', value: session.image ? '✅' : '➖', inline: true },
      { name: '🎨 Cor', value: session.color || '➖', inline: true },
      { name: '📌 Rodapé', value: session.footer?.text ? '✅' : '➖', inline: true },
      { name: '🔘 Botões', value: `${session.buttons.length}/${config.limits.maxButtons}`, inline: true }
    );
}

/**
 * Linhas de botões fixas do painel (Título, Descrição, Autor, etc).
 */
function buildPanelRows(session) {
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('embed_title').setLabel('Título').setEmoji('📝').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('embed_description').setLabel('Descrição').setEmoji('📄').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('embed_author').setLabel('Autor').setEmoji('👤').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('embed_image').setLabel('Imagem').setEmoji('🖼️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('embed_color').setLabel('Cor').setEmoji('🎨').setStyle(ButtonStyle.Secondary)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('embed_footer').setLabel('Rodapé').setEmoji('📌').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('embed_buttons')
      .setLabel('Botões')
      .setEmoji('🔘')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(session.buttons.length >= config.limits.maxButtons),
    new ButtonBuilder().setCustomId('embed_preview').setLabel('Pré-visualizar').setEmoji('👀').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('embed_send').setLabel('Enviar Embed').setEmoji('✅').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('embed_cancel').setLabel('Cancelar').setEmoji('❌').setStyle(ButtonStyle.Danger)
  );

  return [row1, row2];
}

/**
 * Converte os botões-link da sessão em ActionRows reais (até 5 por linha,
 * até 5 linhas = 25 botões no total).
 */
function buildCustomButtonRows(session) {
  const rows = [];
  const perRow = config.limits.maxButtonsPerRow;

  for (let i = 0; i < session.buttons.length; i += perRow) {
    const slice = session.buttons.slice(i, i + perRow);
    const row = new ActionRowBuilder().addComponents(
      slice.map((btn) => {
        const b = new ButtonBuilder().setLabel(btn.text).setStyle(ButtonStyle.Link).setURL(btn.link);
        if (btn.emoji) b.setEmoji(btn.emoji);
        return b;
      })
    );
    rows.push(row);
  }

  return rows;
}

module.exports = { buildPreviewEmbed, buildStatusEmbed, buildPanelRows, buildCustomButtonRows };
