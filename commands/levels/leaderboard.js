const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const database = require('../../handlers/databaseManager');
const config = require('../../config');
const embeds = require('../../utils/embeds');
const { totalXp } = require('./lib/levelUtils');

const MEDALS = ['🥇', '🥈', '🥉'];

module.exports = {
  data: new SlashCommandBuilder().setName('leaderboard').setDescription('Mostra os 10 membros com mais XP do servidor.'),

  async execute(interaction) {
    const members = database
      .getGuildMembers(interaction.guild.id)
      .sort((a, b) => totalXp(b) - totalXp(a))
      .slice(0, 10);

    if (members.length === 0) {
      return interaction.reply({ embeds: [embeds.info('Ainda não há dados de XP neste servidor.')] });
    }

    const lines = members.map((member, index) => {
      const rank = MEDALS[index] || `**#${index + 1}**`;
      return `${rank} <@${member.userId}> — Nível **${member.level}** (${totalXp(member)} XP total)`;
    });

    const embed = new EmbedBuilder()
      .setColor(config.colors.default)
      .setTitle(`🏆 Ranking — ${interaction.guild.name}`)
      .setDescription(lines.join('\n'));

    await interaction.reply({ embeds: [embed] });
  }
};
