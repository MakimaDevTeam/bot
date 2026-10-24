const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const database = require('../../handlers/databaseManager');
const { isAdmin } = require('../../utils/permissions');
const embeds = require('../../utils/embeds');
const { startSession } = require('./lib/ticketBuilderSession');
const view = require('./lib/ticketBuilderView');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-criar')
    .setDescription('Abre o construtor do painel de tickets (adicionar/remover tipos e publicar).')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  category: 'tickets',

  async execute(interaction) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ embeds: [embeds.error('Você não possui permissão para utilizar este comando.')], flags: MessageFlags.Ephemeral });
    }

    // Pré-carrega os tipos, o texto do painel e a mensagem de boas-vindas já
    // configurados — o comando também funciona como tela de edição.
    const guildConfig = database.getGuild(interaction.guild.id);
    const session = startSession(interaction.user.id, guildConfig);

    await interaction.reply({
      embeds: [view.buildMainEmbed(session)],
      components: view.buildMainRows(session),
      flags: MessageFlags.Ephemeral
    });
  }
};
