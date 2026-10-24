const { Client, GatewayIntentBits } = require('discord.js');
const config = require('./config');
const logger = require('./utils/logger');
const database = require('./handlers/databaseManager');
const { loadCommands } = require('./handlers/commandHandler');
const { loadEvents } = require('./handlers/eventHandler');

if (!config.token) {
  logger.error('DISCORD_TOKEN não encontrado. Configure o arquivo .env (veja .env.example).');
  process.exit(1);
}

// Rede de segurança: registra qualquer erro não tratado (ex: uma Promise
// rejeitada sem `await`/`.catch()`) em vez de deixar o processo morrer e o
// PM2 entrar em loop de reinício. Isso não corrige o bug em si, mas garante
// que um erro pontual em um handler não derrube o bot inteiro.
process.on('unhandledRejection', (reason) => {
  logger.error(`Promise rejeitada sem tratamento: ${reason?.stack || reason}`);
});

process.on('uncaughtException', (error) => {
  logger.error(`Exceção não capturada: ${error?.stack || error}`);
});

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages]
});

database.init();
loadCommands(client);
loadEvents(client);

client.login(config.token);
