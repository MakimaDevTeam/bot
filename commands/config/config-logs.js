const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const database = require('../../handlers/databaseManager');
const embeds = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('config-logs')
    .setDescription('Define o canal onde logs de tickets (abertura, reivindicação, fechamento + transcript) serão enviados.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName('definir')
        .setDescription('Define o canal de logs.')
        .addChannelOption((opt) =>
          opt.setName('canal').setDescription('Canal de texto para receber os logs.').addChannelTypes(ChannelType.GuildText).setRequired(true)
        )
    )
    .addSubcommand((sub) => sub.setName('remover').setDescription('Desativa o envio de logs.'))
    .addSubcommand((sub) => sub.setName('ver').setDescription('Mostra o canal de logs configurado atualmente.')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildConfig = database.getGuild(interaction.guild.id);

    if (sub === 'definir') {
      const channel = interaction.options.getChannel('canal');
      database.updateGuild(interaction.guild.id, { logsChannel: channel.id });
      return interaction.reply({ embeds: [embeds.success(`Canal de logs definido como ${channel}.`)] });
    }

    if (sub === 'remover') {
      database.updateGuild(interaction.guild.id, { logsChannel: null });
      return interaction.reply({ embeds: [embeds.success('Canal de logs removido. Nenhum log será enviado até que um novo seja definido.')] });
    }

    // sub === 'ver'
    if (!guildConfig.logsChannel) {
      return interaction.reply({ embeds: [embeds.info('Nenhum canal de logs configurado. Use `/config-logs definir` para configurar um.')] });
    }
    return interaction.reply({ embeds: [embeds.info(`Canal de logs atual: <#${guildConfig.logsChannel}>`)] });
  }
};
