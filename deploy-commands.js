const { REST, Routes } = require('discord.js');
const config = require('./config');
const logger = require('./utils/logger');
const { getCommandsJSON } = require('./handlers/commandHandler');

if (!config.token || !config.clientId) {
  logger.error('DISCORD_TOKEN e/ou CLIENT_ID não encontrados. Configure o arquivo .env (veja .env.example).');
  process.exit(1);
}

const commands = getCommandsJSON();
const rest = new REST({ version: '10' }).setToken(config.token);

(async () => {
  try {
    logger.info(`Registrando ${commands.length} comando(s)...`);

    if (config.guildId) {
      await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), { body: commands });
      logger.info('Comandos registrados no servidor (guild) — disponíveis imediatamente.');
    } else {
      await rest.put(Routes.applicationCommands(config.clientId), { body: commands });
      logger.info('Comandos registrados globalmente — pode levar até 1h para propagar.');
    }
  } catch (error) {
    logger.error(`Erro ao registrar comandos: ${error.message}`);
  }
})();
