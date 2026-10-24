const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { resetSession } = require('./lib/sessionManager');
const { buildPreviewEmbed, buildStatusEmbed, buildPanelRows } = require('./lib/embedBuilder');
const { isAdmin } = require('../../utils/permissions');
const embeds = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('embed')
    .setDescription('Abre o painel visual para criar uma embed personalizada.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  category: 'embed',

  async execute(interaction) {
    // Checagem explícita, além da restrição do próprio comando no Discord.
    if (!isAdmin(interaction.member)) {
      return interaction.reply({
        embeds: [embeds.error('Você não possui permissão para utilizar este comando.')],
        flags: MessageFlags.Ephemeral
      });
    }

    const session = resetSession(interaction.user.id);

    const preview = buildPreviewEmbed(session);
    const status = buildStatusEmbed(session);
    const rows = buildPanelRows(session);

    await interaction.reply({
      embeds: [preview, status],
      components: rows,
      flags: MessageFlags.Ephemeral
    });
  }
};
