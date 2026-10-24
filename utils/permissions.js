const { PermissionFlagsBits } = require('discord.js');
const config = require('../config');

/**
 * Verifica se o membro é dono do bot (definido em OWNER_IDS no .env).
 */
function isOwner(userId) {
  return config.ownerIds.includes(userId);
}

/**
 * Verifica se o membro possui permissão de Administrador no servidor,
 * ou é dono do bot.
 */
function isAdmin(member) {
  if (!member) return false;
  if (isOwner(member.id)) return true;
  return member.permissions?.has(PermissionFlagsBits.Administrator) ?? false;
}

/**
 * Verifica se o membro possui permissões básicas de moderação
 * (Expulsar/Banir/Gerenciar Mensagens), ou é admin/dono.
 */
function isModerator(member) {
  if (!member) return false;
  if (isAdmin(member)) return true;

  return (
    member.permissions?.has(PermissionFlagsBits.KickMembers) ||
    member.permissions?.has(PermissionFlagsBits.BanMembers) ||
    member.permissions?.has(PermissionFlagsBits.ManageMessages) ||
    false
  );
}

module.exports = { isOwner, isAdmin, isModerator };
