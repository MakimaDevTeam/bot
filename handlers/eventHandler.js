const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

/**
 * Lê todos os arquivos .js dentro de /events e registra cada um no client.
 * Cada arquivo de evento deve exportar: { name, once, execute(client, ...args) }
 */
function loadEvents(client) {
  const eventsPath = path.join(__dirname, '..', 'events');
  const eventFiles = fs.readdirSync(eventsPath).filter((file) => file.endsWith('.js'));

  let loaded = 0;

  for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);

    // Arquivos auxiliares (ex: embedModalHandler.js) não têm "name" nem "execute"
    // no formato de evento e são ignorados aqui — são chamados diretamente por quem precisa deles.
    if (!event || !event.name || typeof event.execute !== 'function') continue;

    // Rede de segurança: mesmo que o próprio arquivo do evento não tenha um
    // try/catch interno (ex: messageCreate.js), um erro aqui é só logado —
    // nunca vira uma exceção não tratada que derruba o processo inteiro.
    const safeExecute = (...args) => {
      Promise.resolve(event.execute(client, ...args)).catch((error) => {
        logger.error(`Erro no evento "${event.name}": ${error?.stack || error}`);
      });
    };

    if (event.once) {
      client.once(event.name, safeExecute);
    } else {
      client.on(event.name, safeExecute);
    }

    loaded++;
  }

  logger.info(`${loaded} evento(s) carregado(s).`);
}

module.exports = { loadEvents };
