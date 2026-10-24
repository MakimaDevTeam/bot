const { SlashCommandBuilder } = require('discord.js');
const embeds = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder().setName('ping').setDescription('Mostra a latência atual do bot.'),

  async execute(interaction) {
    const sent = await interaction.reply({ content: '🏓 Calculando...', fetchReply: true });
    const latency = sent.createdTimestamp - interaction.createdTimestamp;

    await interaction.editReply({
      content: null,
      embeds: [embeds.info(`🏓 Pong! Latência: **${latency}ms** • WebSocket: **${interaction.client.ws.ping}ms**`)]
    });
  }
};
