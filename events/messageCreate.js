const { EmbedBuilder } = require('discord.js');
const database = require('../handlers/databaseManager');
const config = require('../config');
const logger = require('../utils/logger');
const { randomXpAmount, applyXp, MESSAGE_COOLDOWN_MS } = require('../commands/levels/lib/levelUtils');

// Cooldown em memória: não precisa persistir, se o bot reiniciar o pior caso
// é um usuário ganhar XP de novo alguns segundos antes do previsto.
const cooldowns = new Map(); // key: "guildId:userId" -> timestamp da última vez que ganhou XP

module.exports = {
  name: 'messageCreate',
  once: false,
  async execute(client, message) {
    if (message.author.bot) return;
    if (!message.guild) return; // ignora DMs

    const cooldownKey = `${message.guild.id}:${message.author.id}`;
    const now = Date.now();
    const lastGain = cooldowns.get(cooldownKey) || 0;

    if (now - lastGain < MESSAGE_COOLDOWN_MS) return;
    cooldowns.set(cooldownKey, now);

    const member = database.getMember(message.guild.id, message.author.id);
    member.messages += 1;

    const xpGained = randomXpAmount();
    const result = applyXp(member, xpGained);
    database.updateMember(message.guild.id, message.author.id, member);

    if (!result.leveledUp) return;

    logger.info(`${message.author.tag} subiu para o nível ${result.newLevel} em ${message.guild.name}.`);

    const guildConfig = database.getGuild(message.guild.id);
    if (!guildConfig.levelUpEnabled) return;

    const embed = new EmbedBuilder()
      .setColor(config.colors.success)
      .setDescription(`🎉 ${message.author} subiu para o **nível ${result.newLevel}**!`);

    const targetChannelId = guildConfig.levelChannel;
    const targetChannel = targetChannelId
      ? message.guild.channels.cache.get(targetChannelId) || (await message.guild.channels.fetch(targetChannelId).catch(() => null))
      : message.channel;

    const channel = targetChannel || message.channel;

    channel.send({ embeds: [embed] }).catch((err) => {
      logger.error(`Falha ao enviar aviso de level-up: ${err.message}`);
    });
  }
};
