/**
 * Regras do sistema de níveis.
 *
 * Fórmula de XP necessário para SUBIR do nível `level` para o `level + 1`
 * (estilo MEE6): 5 * level² + 50 * level + 100.
 * Isso faz cada nível pedir progressivamente mais XP.
 */

const XP_PER_MESSAGE_MIN = 15;
const XP_PER_MESSAGE_MAX = 25;
const MESSAGE_COOLDOWN_MS = 60_000; // 1 minuto entre ganhos de XP, por usuário/servidor

function xpForNextLevel(level) {
  return 5 * level ** 2 + 50 * level + 100;
}

function randomXpAmount() {
  return Math.floor(Math.random() * (XP_PER_MESSAGE_MAX - XP_PER_MESSAGE_MIN + 1)) + XP_PER_MESSAGE_MIN;
}

/**
 * Aplica um ganho (ou perda) de XP a um membro e resolve subidas/descidas de nível.
 * Recebe o objeto do membro (com { xp, level }) e MUTA ele diretamente —
 * quem chama essa função é responsável por persistir o resultado.
 *
 * Retorna { leveledUp, leveledDown, previousLevel, newLevel }.
 */
function applyXp(member, amount) {
  const previousLevel = member.level;
  member.xp += amount;

  // Sobe de nível enquanto o XP acumulado no nível atual ultrapassar o necessário.
  while (member.xp >= xpForNextLevel(member.level)) {
    member.xp -= xpForNextLevel(member.level);
    member.level += 1;
  }

  // Desce de nível se uma remoção de XP deixou o total negativo dentro do nível atual.
  while (member.level > 0 && member.xp < 0) {
    member.level -= 1;
    member.xp += xpForNextLevel(member.level);
  }

  // Já no nível 0, não deixa o XP ficar negativo.
  if (member.level === 0 && member.xp < 0) member.xp = 0;

  return {
    leveledUp: member.level > previousLevel,
    leveledDown: member.level < previousLevel,
    previousLevel,
    newLevel: member.level
  };
}

/** Soma o XP total já acumulado (de todos os níveis anteriores + XP do nível atual). Usado para ranquear. */
function totalXp(member) {
  let total = member.xp;
  for (let lvl = 0; lvl < member.level; lvl++) {
    total += xpForNextLevel(lvl);
  }
  return total;
}

/** Gera uma barra de progresso textual, ex: [██████░░░░] 62%. */
function progressBar(current, max, size = 20) {
  const ratio = max > 0 ? Math.min(current / max, 1) : 0;
  const filled = Math.round(ratio * size);
  const empty = size - filled;
  return `[${'█'.repeat(filled)}${'░'.repeat(empty)}] ${Math.floor(ratio * 100)}%`;
}

module.exports = {
  XP_PER_MESSAGE_MIN,
  XP_PER_MESSAGE_MAX,
  MESSAGE_COOLDOWN_MS,
  xpForNextLevel,
  randomXpAmount,
  applyXp,
  totalXp,
  progressBar
};
