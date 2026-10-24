const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const database = require('../../handlers/databaseManager');
const { isAdmin } = require('../../utils/permissions');
const embeds = require('../../utils/embeds');
const { applyXp } = require('./lib/levelUtils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('xp')
    .setDescription('Gerencia o XP de um membro.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((sub) =>
      sub
        .setName('adicionar')
        .setDescription('Adiciona XP a um membro.')
        .addUserOption((option) => option.setName('usuario').setDescription('Membro alvo').setRequired(true))
        .addIntegerOption((option) => option.setName('quantidade').setDescription('Quantidade de XP').setRequired(true).setMinValue(1))
    )
    .addSubcommand((sub) =>
      sub
        .setName('remover')
        .setDescription('Remove XP de um membro.')
        .addUserOption((option) => option.setName('usuario').setDescription('Membro alvo').setRequired(true))
        .addIntegerOption((option) => option.setName('quantidade').setDescription('Quantidade de XP').setRequired(true).setMinValue(1))
    )
    .addSubcommand((sub) =>
      sub
        .setName('resetar')
        .setDescription('Zera o XP e o nível de um membro.')
        .addUserOption((option) => option.setName('usuario').setDescription('Membro alvo').setRequired(true))
    ),
  category: 'levels',

  async execute(interaction) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ embeds: [embeds.error('Você não possui permissão para utilizar este comando.')], flags: MessageFlags.Ephemeral });
    }

    const sub = interaction.options.getSubcommand();
    const target = interaction.options.getUser('usuario');
    const member = database.getMember(interaction.guild.id, target.id);

    if (sub === 'resetar') {
      database.updateMember(interaction.guild.id, target.id, { xp: 0, level: 0 });
      return interaction.reply({ embeds: [embeds.success(`XP e nível de ${target} foram resetados.`)], flags: MessageFlags.Ephemeral });
    }

    const amount = interaction.options.getInteger('quantidade');
    const delta = sub === 'remover' ? -amount : amount;

    const result = applyXp(member, delta);
    database.updateMember(interaction.guild.id, target.id, member);

    const action = sub === 'remover' ? 'removido de' : 'adicionado a';
    let message = `${amount} XP ${action} ${target}. Nível atual: **${member.level}**.`;
    if (result.leveledUp) message += ' 🎉 Ele(a) subiu de nível!';
    if (result.leveledDown) message += ' Ele(a) desceu de nível.';

    return interaction.reply({ embeds: [embeds.success(message)], flags: MessageFlags.Ephemeral });
  }
};
