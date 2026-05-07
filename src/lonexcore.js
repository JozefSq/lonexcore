require('dotenv').config();
const path = require('path');
const fs = require('fs').promises;
const { Client, GatewayIntentBits, Events, ChannelType, PermissionFlagsBits } = require('discord.js');
const { getDriveFiles, findFileByName, getDownloadLink, listFolder, searchFiles, uploadFileFromUrl } = require('./google/client');
const { sendMail } = require('./email/smtp');
const { startDailyChecklist } = require('./dailyChecklist');
const { startWeeklyReports } = require('./weeklyReports');
const { ProjectManager } = require('./projectManager');
const { startWeeklyCalendarReminder } = require('./weeklyCalendarReminder');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

client.once(Events.ClientReady, (c) => {
  console.log(`✅ LonexCore prihlaseny ako: ${c.user.tag}`);

  // Spusti denny checklist scheduler
  startDailyChecklist(client);
    startWeeklyReports(client);
      startWeeklyCalendarReminder(client);

  // Initialize ProjectManager
const projectManager = new ProjectManager();
projectManager.init();
});

// Upload cez message attachment
client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;

  if (message.content === '!upload' && message.attachments.size > 0) {
    const attachment = message.attachments.first();
    await message.reply('⏳ Nahravem na Google Drive...');
    try {
      const file = await uploadFileFromUrl(attachment.url, attachment.name);
      await message.reply(`✅ Subor **${file.name}** nahrany!\n🔗 ${file.webViewLink}`);
    } catch (err) {
      await message.reply('❌ Chyba uploadu: ' + err.message);
    }
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'ping') {
    await interaction.reply('🏓 Pong! LonexCore bezi.');
  }

  if (interaction.commandName === 'help') {
    await interaction.reply(
      '📋 **LonexCore prikazy:**\n' +
      '`/ping` — test bota\n' +
      '`/setup` — vytvor celu strukturu servera (kategorie, kanaly, role)\n' +
      '`/gdrive browse [folder_id]` — prehliadaj priecinky\n' +
      '`/gdrive search nazov:xxx` — hladaj subory\n' +
      '`/mail komu: predmet: sprava: [owner:true/false]` — posli email\n\n' +
      '📋 **LonexAI prikazy:**\n' +
      '`/ai prompt:xxx` — opytaj sa (Claude Haiku)\n' +
      '`/ai prompt:xxx model:claude-opus` — pouzi Claude Opus'
    );
  }

  // /SETUP prikaz - vytvoricelu strukturu servera
  if (interaction.commandName === 'setup') {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: '❌ Muses byt admin na pouzitie /setup!', ephemeral: true });
    }

    await interaction.deferReply();
    const guild = interaction.guild;
    const setupLog = [];

    try {
      // Vytvor ROLE
      setupLog.push('🔧 Vytvoram role...');
      const ownerRole = await guild.roles.create({ name: 'Owner', color: 0xFF0000, hoist: true });
      const ceoRole = await guild.roles.create({ name: 'CEO', color: 0xFFA500, hoist: true });
      const salesRole = await guild.roles.create({ name: 'Sales', color: 0x00FF00, hoist: true });
      const devRole = await guild.roles.create({ name: 'Developer', color: 0x0000FF, hoist: true });
      const editorRole = await guild.roles.create({ name: 'Editor', color: 0xFF00FF, hoist: true });
      const helpdeskRole = await guild.roles.create({ name: 'Helpdesk', color: 0x00FFFF, hoist: true });
      setupLog.push('✅ Role vytvorene!');

      // OWNER & CEO kategoria
      setupLog.push('🔧 Vytvoram OWNER & CEO kategoriu...');
      const ceoCategory = await guild.channels.create({
        name: '🏛️ OWNER & CEO',
        type: ChannelType.GuildCategory,
        permissionOverwrites: [
          { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
          { id: ownerRole.id, allow: [PermissionFlagsBits.ViewChannel] },
          { id: ceoRole.id, allow: [PermissionFlagsBits.ViewChannel] }
        ]
      });
      await guild.channels.create({ name: 'announcements', type: ChannelType.GuildText, parent: ceoCategory.id });
      await guild.channels.create({ name: 'strategy', type: ChannelType.GuildText, parent: ceoCategory.id });
      await guild.channels.create({ name: 'ceo-docs', type: ChannelType.GuildText, parent: ceoCategory.id });
      await guild.channels.create({ name: 'bot-notifications', type: ChannelType.GuildText, parent: ceoCategory.id });

      // SALES kategoria
      setupLog.push('🔧 Vytvoram SALES kategoriu...');
      const salesCategory = await guild.channels.create({
        name: '💼 SALES',
        type: ChannelType.GuildCategory,
        permissionOverwrites: [
          { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
          { id: salesRole.id, allow: [PermissionFlagsBits.ViewChannel] }
        ]
      });
      await guild.channels.create({ name: 'general-discussion-sales', type: ChannelType.GuildText, parent: salesCategory.id });
      await guild.channels.create({ name: 'leads', type: ChannelType.GuildText, parent: salesCategory.id });
      await guild.channels.create({ name: 'sales-docs', type: ChannelType.GuildText, parent: salesCategory.id });
      await guild.channels.create({ name: 'bot-notifications-sales', type: ChannelType.GuildText, parent: salesCategory.id });

      // DEVELOPMENT kategoria
      setupLog.push('🔧 Vytvoram DEVELOPMENT kategoriu...');
      const devCategory = await guild.channels.create({
        name: '💻 DEVELOPMENT',
        type: ChannelType.GuildCategory,
        permissionOverwrites: [
          { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
          { id: devRole.id, allow: [PermissionFlagsBits.ViewChannel] }
        ]
      });
      await guild.channels.create({ name: 'general-discussion-dev', type: ChannelType.GuildText, parent: devCategory.id });
      await guild.channels.create({ name: 'git-updates', type: ChannelType.GuildText, parent: devCategory.id });
      await guild.channels.create({ name: 'dev-docs', type: ChannelType.GuildText, parent: devCategory.id });
      await guild.channels.create({ name: 'bot-notifications-dev', type: ChannelType.GuildText, parent: devCategory.id });

      // EDITOR/GRAPHICS kategoria
      setupLog.push('🔧 Vytvoram EDITOR/GRAPHICS kategoriu...');
      const designCategory = await guild.channels.create({
        name: '🎨 EDITOR / GRAPHICS',
        type: ChannelType.GuildCategory,
        permissionOverwrites: [
          { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
          { id: editorRole.id, allow: [PermissionFlagsBits.ViewChannel] }
        ]
      });
      await guild.channels.create({ name: 'general-discussion-design', type: ChannelType.GuildText, parent: designCategory.id });
      await guild.channels.create({ name: 'assets', type: ChannelType.GuildText, parent: designCategory.id });
      await guild.channels.create({ name: 'design-docs', type: ChannelType.GuildText, parent: designCategory.id });
      await guild.channels.create({ name: 'bot-notifications-design', type: ChannelType.GuildText, parent: designCategory.id });

      // HELPDESK kategoria
      setupLog.push('🔧 Vytvoram HELPDESK kategoriu...');
      const helpdeskCategory = await guild.channels.create({
        name: '🎧 HELPDESK',
        type: ChannelType.GuildCategory,
        permissionOverwrites: [
          { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
          { id: helpdeskRole.id, allow: [PermissionFlagsBits.ViewChannel] }
        ]
      });
      await guild.channels.create({ name: 'general-discussion-help', type: ChannelType.GuildText, parent: helpdeskCategory.id });
      await guild.channels.create({ name: 'tickets', type: ChannelType.GuildText, parent: helpdeskCategory.id });
      await guild.channels.create({ name: 'helpdesk-docs', type: ChannelType.GuildText, parent: helpdeskCategory.id });
      await guild.channels.create({ name: 'bot-notifications-help', type: ChannelType.GuildText, parent: helpdeskCategory.id });

      // VOICE kanaly
      setupLog.push('🔧 Vytvoram voice kanaly...');
      const voiceCategory = await guild.channels.create({ name: '🔊 VOICE', type: ChannelType.GuildCategory });
      await guild.channels.create({ name: 'CEO Meeting', type: ChannelType.GuildVoice, parent: voiceCategory.id });
      await guild.channels.create({ name: 'Sales Room', type: ChannelType.GuildVoice, parent: voiceCategory.id });
      await guild.channels.create({ name: 'Dev Room', type: ChannelType.GuildVoice, parent: voiceCategory.id });
      await guild.channels.create({ name: 'Design Room', type: ChannelType.GuildVoice, parent: voiceCategory.id });
      await guild.channels.create({ name: 'All Hands', type: ChannelType.GuildVoice, parent: voiceCategory.id });
      await guild.channels.create({ name: 'AFK', type: ChannelType.GuildVoice, parent: voiceCategory.id });

      setupLog.push('✅ Setup dokonceny!');
      await interaction.editReply(setupLog.join('\n'));
    } catch (err) {
      await interaction.editReply('❌ Chyba pri setup: ' + err.message);
    }
  }

  // /GDRIVE prikaz s subcommandmi: browse a search
  if (interaction.commandName === 'gdrive') {
    const sub = interaction.options.getSubcommand();
    await interaction.deferReply({ ephemeral: true });

    if (sub === 'browse') {
      const folderId = interaction.options.getString('folder_id') || 'root';
      try {
        const items = await listFolder(folderId);
        const folders = items.filter(f => f.mimeType === 'application/vnd.google-apps.folder');
        const files = items.filter(f => f.mimeType !== 'application/vnd.google-apps.folder');
        let msg = `📁 **Priecinky:**\n${folders.map(f => `\`${f.id}\` — ${f.name}`).join('\n') || 'Ziadne'}\n\n`;
        msg += `📄 **Subory:**\n${files.map(f => f.name).join('\n') || 'Ziadne'}`;
        await interaction.editReply(msg);
      } catch (err) {
        await interaction.editReply('❌ Chyba: ' + err.message);
      }
    }

    if (sub === 'search') {
      const query = interaction.options.getString('nazov');
      try {
        const results = await searchFiles(query);
        if (results.length === 0) {
          return interaction.editReply(`🔍 Ziadne vysledky pre "${query}".`);
        }
        const list = results.map(f => `[${f.name}](${f.webViewLink})`).join('\n');
        await interaction.editReply(`🔍 **Vysledky pre "${query}":**\n${list}`);
      } catch (err) {
        await interaction.editReply('❌ Chyba: ' + err.message);
      }
    }
  }

  // /MAIL prikaz cez SMTP
  if (interaction.commandName === 'mail') {
    const komu = interaction.options.getString('komu');
    const predmet = interaction.options.getString('predmet');
    const sprava = interaction.options.getString('sprava');
    const useOwner = interaction.options.getBoolean('owner') || false;
    await interaction.deferReply({ ephemeral: true });
    try {
      await sendMail({ to: komu, subject: predmet, text: sprava, useOwner });
      const from = useOwner ? process.env.SMTP_USER_OWNER : process.env.SMTP_USER_INFO;
      await interaction.editReply(`✅ Email odoslany!\n**Od:** ${from}\n**Komu:** ${komu}\n**Predmet:** ${predmet}`);
    } catch (err) {
      await interaction.editReply('❌ Chyba: ' + err.message);
    }
  }
});

// Handle checklist button interactions
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isButton()) return;
  if (!interaction.customId.startsWith('checklist_')) return;

  const section = interaction.customId.split('_')[1];
  const userId = interaction.user.id;
  const timestamp = new Date().toISOString();

  const dataDir = path.join(__dirname, '../data');
  const responsesFile = path.join(dataDir, 'checklistResponses.json');

  // Okamzite potvrdi interakciu Discordu (do 3s) - predchadza "This interaction failed"
  await interaction.deferReply({ ephemeral: true });

  try {
    await fs.mkdir(dataDir, { recursive: true });

    let responses = [];
    try {
      const fileContent = await fs.readFile(responsesFile, 'utf8');
      responses = JSON.parse(fileContent);
    } catch {
      // Subor este neexistuje
    }

    // Ochrana proti duplicite - rovnaky user + sekcia + sprava
    const alreadyDone = responses.some(
      r => r.userId === userId && r.section === section && r.messageId === interaction.message.id
    );

    if (alreadyDone) {
      return await interaction.editReply({
        content: `⚠️ Sekciu **${section}** si uz oznacilas ako dokoncenu.`
      });
    }

    responses.push({
      userId,
      username: interaction.user.tag,
      section,
      timestamp,
      messageId: interaction.message.id
    });

    await fs.writeFile(responsesFile, JSON.stringify(responses, null, 2));

    await interaction.editReply({
      content: `✅ Sekcia **${section}** oznacena ako dokoncena!`
    });

    console.log(`✅ ${interaction.user.tag} dokoncil sekciu: ${section}`);
  } catch (err) {
    console.error('❌ Chyba pri ukladani odpovede:', err);
    await interaction.editReply({
      content: '❌ Chyba pri ukladani odpovede'
    });
  }
});

client.login(process.env.LONEXCORE_TOKEN);
