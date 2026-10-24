# Yuri v1.2 — Sistema de tickets

Sprint 1 (fundação) + Sprint 2 (níveis) + Sprint 3 (**sistema de tickets**):
membros abrem tickets privados clicando em um painel, a equipe reivindica e
fecha com botões, e tudo fica registrado em `database/tickets.json`.

## Instalação

```bash
npm install
cp .env.example .env   # preencha DISCORD_TOKEN, CLIENT_ID, GUILD_ID (opcional) e OWNER_IDS (opcional)
npm run deploy          # registra os slash commands
npm start                # inicia o bot
```

## Estrutura

```
YuriBot/
├── assets/                 # imagens/arquivos estáticos (vazio por enquanto)
├── commands/                # 1 subpasta por categoria — auto-carregadas
│   ├── admin/
│   ├── config/
│   ├── embed/               # /embed (painel visual de criação de embeds)
│   │   ├── embed.js
│   │   └── lib/              # helpers do módulo, NÃO são comandos
│   │       ├── embedBuilder.js
│   │       └── sessionManager.js
│   ├── levels/                # /rank, /leaderboard, /levels-config, /xp
│   │   ├── rank.js
│   │   ├── leaderboard.js
│   │   ├── levels-config.js
│   │   ├── xp.js
│   │   └── lib/
│   │       └── levelUtils.js  # fórmula de XP/nível, barra de progresso
│   ├── moderation/
│   ├── tickets/                # comando único /ticket-criar
│   │   ├── ticket-criar.js
│   │   └── lib/
│   │       ├── ticketManager.js         # abrir/reivindicar/fechar (botões já publicados)
│   │       ├── ticketBuilderSession.js  # sessão em memória do construtor
│   │       └── ticketBuilderView.js     # embeds/componentes de cada etapa
│   ├── utility/              # /ping (exemplo)
│   └── welcome/
├── database/                 # "tabelas" em JSON
│   ├── users.json
│   ├── guilds.json           # config por servidor (ver config.js > defaultGuildConfig)
│   ├── settings.json
│   ├── boosts.json
│   ├── tickets.json
│   ├── warnings.json
│   └── logs.json
├── events/                   # auto-carregados por handlers/eventHandler.js
│   ├── ready.js
│   ├── messageCreate.js      # concede XP por mensagem, dispara level-up
│   ├── interactionCreate.js
│   ├── embedModalHandler.js  # helper interno, chamado pelo interactionCreate
│   └── ticketBuilderHandler.js  # helper interno do construtor de /ticket-criar
├── handlers/
│   ├── commandHandler.js     # carrega commands/<categoria>/*.js
│   ├── eventHandler.js       # carrega events/*.js
│   └── databaseManager.js    # get/set/getGuild/getUser sobre os .json
├── utils/
│   ├── logger.js             # console colorido [HH:MM:SS] [TAG] mensagem
│   ├── permissions.js        # isAdmin() / isModerator() / isOwner()
│   ├── embeds.js             # embeds padrão (success/error/warning/info)
│   └── helpers.js
├── index.js
├── deploy-commands.js
├── config.js
└── .env
```

## Como criar um novo comando

1. Escolha a categoria (pasta) certa em `commands/`.
2. Crie um arquivo `.js` exportando `{ data, execute(interaction) }`.
3. Use `isAdmin(interaction.member)` / `isModerator(...)` / `isOwner(userId)` de
   `utils/permissions.js` para checagem de permissão.
4. Use `utils/embeds.js` para respostas padronizadas (sucesso/erro/aviso).
5. Rode `npm run deploy` para registrar o novo comando na API do Discord.

O `commandHandler` varre apenas os arquivos `.js` no nível raiz de cada
categoria — subpastas (como `commands/embed/lib/`) são ignoradas e podem ser
usadas livremente para código auxiliar do módulo.

## Como criar um novo evento

Crie um arquivo em `events/` exportando:

```js
module.exports = {
  name: 'nomeDoEvento', // ex: 'guildMemberAdd'
  once: false,           // true para eventos que disparam uma única vez (ex: 'ready')
  execute(client, ...args) { /* ... */ }
};
```

Arquivos que não seguem esse formato (como `embedModalHandler.js`, que é uma
função auxiliar chamada manualmente pelo `interactionCreate`) são ignorados
pelo `eventHandler` automaticamente.

## Banco de dados

`handlers/databaseManager.js` mantém um cache em memória de cada arquivo
`.json` e sincroniza com o disco a cada escrita.

```js
const database = require('../../handlers/databaseManager');

database.getGuild(guildId);           // cria com defaultGuildConfig se não existir
database.updateGuild(guildId, { levelChannel: '123' });

database.getUser(userId);             // cria { userId } se não existir
database.get('warnings', userId);
database.set('warnings', userId, [...]);
```

## Sistema de níveis (Goku v1.1)

- **Ganho de XP:** entre 15 e 25 XP por mensagem, com cooldown de 60s por
  usuário/servidor (`commands/levels/lib/levelUtils.js`).
- **Fórmula de nível** (estilo MEE6): `xpForNextLevel(level) = 5*level² + 50*level + 100`
  — cada nível pede progressivamente mais XP.
- **Dados por servidor:** `database/users.json`, chave `"guildId:userId"` —
  acessados via `database.getMember(guildId, userId)` / `database.updateMember(...)`
  / `database.getGuildMembers(guildId)`.
- **Comandos:**
  - `/rank [usuario]` — nível, XP, posição no ranking e barra de progresso.
  - `/leaderboard` — top 10 do servidor.
  - `/levels-config canal [canal]` — define onde os avisos de level-up são
    enviados (admin). Sem canal definido, o aviso vai no canal da mensagem
    que subiu de nível.
  - `/levels-config avisos <true|false>` — liga/desliga os avisos (admin).
  - `/xp adicionar|remover|resetar` — gerencia XP manualmente (admin).
- **Evento `messageCreate`** (`events/messageCreate.js`) aplica o XP e, ao
  detectar level-up, envia o embed de comemoração no `levelChannel` do
  servidor (`database.getGuild(guildId).levelChannel`).

## Sistema de tickets (Goku v1.2)

Tudo centralizado em um único comando: **`/ticket-criar`** (admin). Ele abre um
construtor interativo — igual em espírito ao painel do `/embed` — que também
serve para editar a configuração depois de publicada (pré-carrega os tipos já
existentes).

- **Construtor (`/ticket-criar`):**
  - **➕ Adicionar Tipo** — abre um modal (nome + emoji opcional), depois pede
    a **categoria** (`ChannelSelectMenu`, só categorias) e o **cargo de
    suporte** (`RoleSelectMenu`, opcional — pode pular).
  - **🗑️ Remover Tipo** — menu com os tipos já configurados na sessão.
  - **📋 Editar Painel** — modal para editar o **título e a descrição** da
    embed pública (a mensagem fixa com os botões).
  - **💬 Editar Boas-vindas** — modal para editar o **texto enviado dentro do
    canal** quando um ticket é aberto. Suporta os placeholders `{usuario}`
    (menciona quem abriu) e `{tipo}` (nome do tipo escolhido).
  - **📤 Publicar Painel** — escolhe o canal e envia a embed pública com **um
    botão por tipo** (até 25 no total, 5 por linha). Salva tipos + textos em
    `guildConfig` (`database.updateGuild`).
  - **❌ Cancelar** — descarta a sessão sem publicar nada.
  - Cada admin tem sua própria sessão em memória
    (`commands/tickets/lib/ticketBuilderSession.js`), então dois admins podem
    montar painéis ao mesmo tempo sem conflito.

- **Nomenclatura automática:** o nome do canal usa o rótulo do tipo +
  contador **próprio daquele tipo**, com 4 dígitos:
  `revogação-0001`, `revogação-0002`, `suporte-geral-0001`... Cada tipo guarda
  seu próprio `counter` dentro de `guildConfig.ticketTypes` — tipos
  diferentes nunca compartilham a mesma sequência.

- **Abertura:** ao clicar em um botão do painel público
  (`customId: ticket_open:<typeId>`), cria um canal privado na categoria
  daquele tipo, visível só para o autor, o cargo de suporte daquele tipo (se
  definido) e o bot. Envia a mensagem de boas-vindas configurada (com
  `{usuario}`/`{tipo}` já substituídos). Bloqueia um segundo ticket aberto
  pelo mesmo usuário (em qualquer tipo).
- **Reivindicar / Fechar:** botões dentro do canal do ticket
  (`ticket_claim`, `ticket_close`) — exigem `isModerator()`. Fechar pede
  confirmação (`ticket_close_confirm` / `ticket_close_cancel`) antes de
  excluir o canal.
- **Dados:**
  - `guildConfig.ticketTypes` — lista de tipos:
    `{ id, label, emoji, categoryId, supportRoleId, counter }`.
  - `guildConfig.ticketPanelTitle` / `ticketPanelDescription` — texto da
    embed pública.
  - `guildConfig.ticketWelcomeMessage` — template da mensagem enviada ao
    abrir um ticket (placeholders `{usuario}`, `{tipo}`).
  - `database/tickets.json`, chave = ID do canal — histórico de cada ticket
    aberto (`typeId`, `typeLabel`, `number`, `claimedBy`, `status`...), via
    `createTicket()`, `updateTicket()`, `getTicket()`,
    `getGuildTickets(guildId, status?)`, `findOpenTicket(guildId, userId)`.
- **Arquitetura:** `commands/tickets/lib/ticketManager.js` cuida só dos
  tickets já publicados (abrir/reivindicar/fechar); todo o fluxo do
  construtor (botões, modais, seletores) fica em
  `events/ticketBuilderHandler.js` + `commands/tickets/lib/ticketBuilderView.js`.
  O `interactionCreate.js` roteia por prefixo de `customId`:
  `ticketbuilder_*` → construtor, `ticket_*` → ticket já aberto, `embed_*` →
  painel de embeds (nessa ordem, pra `ticketbuilder_` não cair sem querer no
  branch de `ticket_`).
- **Retrocompatibilidade:** `database.getGuild()` preenche automaticamente
  qualquer campo novo de `defaultGuildConfig` que ainda não exista em
  servidores configurados antes dessa mudança — nenhum dado antigo se perde
  e nada fica `undefined`.

## Confiabilidade — proteção contra crashes (v1.2.3)

Um bug real foi corrigido: `interactionCreate.js` chamava os handlers
assíncronos sem `await` (`return handler(interaction)` em vez de
`return await handler(interaction)`). Em JavaScript, isso significa que se o
handler falhar *depois* que a função já retornou a Promise, o `try/catch` ao
redor **não pega o erro** — vira uma "unhandled promise rejection", e o
Node.js mata o processo inteiro. Com PM2 configurado para reiniciar
automaticamente, isso gerava um loop de crash, e como as sessões dos
construtores (`/embed`, `/ticket-criar`) vivem em memória, cada reinício
apagava qualquer configuração em andamento — por isso publicações apareciam
com "0 tipos" e usuários viam mensagens de "sessão expirada" sem motivo
aparente.

Agora existem três camadas de proteção, cada uma independente das outras:

1. **`events/interactionCreate.js`** usa `await` em todo handler chamado
   dentro do `try` — erros são pegos e, quando possível, o usuário recebe uma
   resposta ephemeral de erro em vez de nada.
2. **`handlers/eventHandler.js`** envolve TODO evento registrado (não só o
   `interactionCreate`) em um `Promise.resolve(...).catch(...)` — mesmo um
   evento sem tratamento de erro próprio (como `messageCreate.js`) não
   derruba o bot.
3. **`index.js`** registra `process.on('unhandledRejection', ...)` e
   `process.on('uncaughtException', ...)` como rede de segurança final —
   qualquer coisa que escape das camadas acima é logada, nunca mata o
   processo.

Além disso, `/ticket-criar` agora se recusa a publicar um painel vazio caso a
sessão tenha sido perdida por qualquer motivo (ex: reinício do bot no meio da
configuração) — mostra um erro claro pedindo para rodar o comando de novo, em
vez de publicar um painel sem nenhum botão.

Também resolvidos os avisos de depreciação do discord.js: o evento `ready`
virou `clientReady`, e toda resposta `ephemeral: true` virou
`flags: MessageFlags.Ephemeral`.
