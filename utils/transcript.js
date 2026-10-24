const { AttachmentBuilder } = require('discord.js');

/**
 * Gera um transcript em HTML de um canal de texto (usado para tickets fechados).
 * Busca até `limit` mensagens (paginando de 100 em 100, do mais antigo ao mais novo)
 * e retorna um AttachmentBuilder pronto para anexar em uma mensagem/embed.
 */

function escapeHtml(text = '') {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

/** Busca todas as mensagens do canal, da mais antiga para a mais nova. */
async function fetchAllMessages(channel, limit = 1000) {
  let messages = [];
  let lastId;

  while (messages.length < limit) {
    const batch = await channel.messages.fetch({ limit: 100, before: lastId });
    if (batch.size === 0) break;

    messages = messages.concat(Array.from(batch.values()));
    lastId = batch.last().id;

    if (batch.size < 100) break;
  }

  return messages.reverse();
}

/** Gera o HTML do transcript a partir de uma lista de mensagens (discord.js Message[]). */
function buildHtml(channel, messages) {
  const rows = messages
    .map((msg) => {
      const author = escapeHtml(msg.author?.tag || 'Desconhecido');
      const avatar = msg.author?.displayAvatarURL({ size: 64 }) || '';
      const time = new Date(msg.createdTimestamp).toLocaleString('pt-BR');
      const content = escapeHtml(msg.content || '').replace(/\n/g, '<br>');

      const attachments = [...msg.attachments.values()]
        .map((att) => `<div class="attachment"><a href="${att.url}" target="_blank">${escapeHtml(att.name)}</a></div>`)
        .join('');

      const embeds = msg.embeds
        .map((e) => `<div class="embed">${escapeHtml(e.title || '')}${e.title && e.description ? '<br>' : ''}${escapeHtml(e.description || '')}</div>`)
        .join('');

      return `
        <div class="message">
          <img class="avatar" src="${avatar}" alt="">
          <div class="body">
            <div class="meta"><span class="author">${author}</span> <span class="time">${time}</span></div>
            <div class="content">${content || '<em>(sem texto)</em>'}</div>
            ${attachments}
            ${embeds}
          </div>
        </div>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Transcript - ${escapeHtml(channel.name)}</title>
<style>
  body { background:#313338; color:#dbdee1; font-family: -apple-system, Arial, sans-serif; margin:0; padding:20px; }
  h1 { color:#fff; font-size:18px; }
  .message { display:flex; gap:12px; padding:8px 0; border-bottom:1px solid #3f4147; }
  .avatar { width:40px; height:40px; border-radius:50%; background:#5865F2; }
  .meta { font-size:13px; }
  .author { font-weight:600; color:#fff; }
  .time { color:#949ba4; margin-left:6px; }
  .content { margin-top:2px; white-space:pre-wrap; word-break:break-word; }
  .attachment, .embed { margin-top:6px; padding:8px; background:#2b2d31; border-left:4px solid #5865F2; border-radius:4px; }
  .attachment a { color:#00a8fc; }
</style>
</head>
<body>
  <h1>📄 Transcript de #${escapeHtml(channel.name)}</h1>
  <p>Gerado em ${new Date().toLocaleString('pt-BR')} • ${messages.length} mensagem(ns)</p>
  ${rows || '<p><em>Nenhuma mensagem neste canal.</em></p>'}
</body>
</html>`;
}

/** Gera o transcript de um canal e retorna um AttachmentBuilder pronto para envio. */
async function generateTranscript(channel) {
  const messages = await fetchAllMessages(channel);
  const html = buildHtml(channel, messages);
  const buffer = Buffer.from(html, 'utf8');

  return new AttachmentBuilder(buffer, { name: `transcript-${channel.name}.html` });
}

module.exports = { generateTranscript };
