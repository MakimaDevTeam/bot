const { SlashCommandBuilder, ChannelType, PermissionFlagsBits, MessageFlags } = require('discord.js');
const database = require('../../handlers/databaseManager');
const { isAdmin } = require('../../utils/permissions');
const embeds = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('levels-config')
    .setDescription('Configura o sistema de níveis do servidor.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((sub) =>
      sub
        .setName('canal')
        .setDescription('Define o canal onde os avisos de level-up são enviados.')
        .addChannelOption((option) =>
          option
            .setName('canal')
            .setDescription('Canal de destino (deixe vazio para usar o canal onde a mensagem foi enviada)')
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
            .setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('avisos')
        .setDescription('Ativa ou desativa os avisos de level-up.')
        .addBooleanOption((option) => option.setName('ativado').setDescription('true para ativar, false para desativar').setRequired(true))
    ),
  category: 'levels',

  async execute(interaction) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ embeds: [embeds.error('Você não possui permissão para utilizar este comando.')], flags: MessageFlags.Ephemeral });
    }

    const sub = interaction.options.getSubcommand();

    if (sub === 'canal') {
      const channel = interaction.options.getChannel('canal');
      database.updateGuild(interaction.guild.id, { levelChannel: channel ? channel.id : null });

      const message = channel
        ? `Avisos de level-up agora serão enviados em ${channel}.`
        : 'Avisos de level-up agora serão enviados no canal onde a mensagem que subiu de nível foi escrita.';

      return interaction.reply({ embeds: [embeds.success(message)], flags: MessageFlags.Ephemeral });
    }

    if (sub === 'avisos') {
      const enabled = interaction.options.getBoolean('ativado');
      database.updateGuild(interaction.guild.id, { levelUpEnabled: enabled });

      return interaction.reply({
        embeds: [embeds.success(`Avisos de level-up ${enabled ? 'ativados' : 'desativados'}.`)],
        flags: MessageFlags.Ephemeral
      });
    }
  }
};
