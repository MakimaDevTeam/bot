const fs = require('fs');
const path = require('path');
const { Collection } = require('discord.js');
const logger = require('../utils/logger');

/**
 * Percorre /commands recursivamente (uma subpasta por categoria: embed, levels,
 * moderation, tickets, etc.) e registra cada comando em client.commands.
 * Cada arquivo de comando deve exportar: { data, execute(interaction) }.
 */
function loadCommands(client) {
  client.commands = new Collection();

  const commandsPath = path.join(__dirname, '..', 'commands');
  const categories = fs.readdirSync(commandsPath).filter((entry) => {
    return fs.statSync(path.join(commandsPath, entry)).isDirectory();
  });

  let loaded = 0;

  for (const category of categories) {
    const categoryPath = path.join(commandsPath, category);
    const commandFiles = fs.readdirSync(categoryPath).filter((file) => file.endsWith('.js'));

    for (const file of commandFiles) {
      const command = require(path.join(categoryPath, file));

      if (!command?.data || typeof command.execute !== 'function') {
        logger.warn(`Comando ignorado (formato inválido): ${category}/${file}`);
        continue;
      }

      command.category = command.category || category;
      client.commands.set(command.data.name, command);
      loaded++;
    }
  }

  logger.info(`${loaded} comando(s) carregado(s) em ${categories.length} categoria(s).`);
  return client.commands;
}

/**
 * Retorna o array de comandos em formato JSON (usado pelo deploy-commands.js
 * para registrar os slash commands na API do Discord).
 */
function getCommandsJSON() {
  const commandsPath = path.join(__dirname, '..', 'commands');
  const categories = fs.readdirSync(commandsPath).filter((entry) => {
    return fs.statSync(path.join(commandsPath, entry)).isDirectory();
  });

  const commandsJSON = [];

  for (const category of categories) {
    const categoryPath = path.join(commandsPath, category);
    const commandFiles = fs.readdirSync(categoryPath).filter((file) => file.endsWith('.js'));

    for (const file of commandFiles) {
      const command = require(path.join(categoryPath, file));
      if (!command?.data) continue;
      commandsJSON.push(command.data.toJSON());
    }
  }

  return commandsJSON;
}

module.exports = { loadCommands, getCommandsJSON };
