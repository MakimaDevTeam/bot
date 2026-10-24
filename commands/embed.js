const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { resetSession } = require('../utils/sessionManager');
const { buildPreviewEmbed, buildStatusEmbed, buildPanelRows } = require('../utils/embedBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('embed')
    .setDescription('Abre o painel visual para criar uma embed personalizada.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    // Checagem explícita, além da restrição do próprio comando no Discord.
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({
        content: '❌ Você não possui permissão para utilizar este comando.',
        ephemeral: true
      });
    }

    const session = resetSession(interaction.user.id);

    const preview = buildPreviewEmbed(session);
    const status = buildStatusEmbed(session);
    const rows = buildPanelRows(session);

    await interaction.reply({
      embeds: [preview, status],
      components: rows,
      ephemeral: true
    });
  }
};
