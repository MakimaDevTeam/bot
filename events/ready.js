const logger = require('../utils/logger');

module.exports = {
  name: 'clientReady',
  once: true,
  execute(client) {
    logger.info(`Bot online como ${client.user.tag}`);
    logger.info(`Servidores conectados: ${client.guilds.cache.size}`);
  }
};
