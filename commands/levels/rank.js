const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const database = require('../../handlers/databaseManager');
const config = require('../../config');
const { xpForNextLevel, totalXp, progressBar } = require('./lib/levelUtils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Mostra o nível e o XP de um usuário.')
    .addUserOption((option) => option.setName('usuario').setDescription('Usuário a consultar (padrão: você)').setRequired(false)),

  async execute(interaction) {
    const target = interaction.options.getUser('usuario') || interaction.user;
    const member = database.getMember(interaction.guild.id, target.id);

    const allMembers = database.getGuildMembers(interaction.guild.id).sort((a, b) => totalXp(b) - totalXp(a));

    const position = allMembers.findIndex((m) => m.userId === target.id) + 1;
    const needed = xpForNextLevel(member.level);

    const embed = new EmbedBuilder()
      .setColor(config.colors.default)
      .setAuthor({ name: target.tag, iconURL: target.displayAvatarURL() })
      .addFields(
        { name: 'Nível', value: `${member.level}`, inline: true },
        { name: 'Posição', value: position ? `#${position}` : '—', inline: true },
        { name: 'Mensagens', value: `${member.messages}`, inline: true },
        { name: 'Progresso', value: `${progressBar(member.xp, needed)}\n${member.xp} / ${needed} XP` }
      );

    await interaction.reply({ embeds: [embed] });
  }
};
