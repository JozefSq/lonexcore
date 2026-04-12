require('dotenv').config();
const { Client, GatewayIntentBits, Events, ChannelType, PermissionFlagsBits } = require('discord.js');
const { getDriveFiles, findFileByName, getDownloadLink, listFolder, searchFiles, uploadFileFromUrl } = require('./google/client');
const { sendMail } = require('./email/smtp');
const { startDailyChecklist } = require('./dailyChecklist');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

client.once(Events.ClientReady, (c) => {
  console.log(`✅ LonexCore prihlasený ako: ${c.user.tag}`);
    
  // Spusti denný checklist scheduler
  startDailyChecklist(client);
});

// Upload cez message attachment
client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;
  
  if (message.content === '!upload' && message.attachments.size > 0) {
    const attachment = message.attachments.first();
    await message.reply('⏳ Nahrávam na Google Drive...');
    try {
      const file = await uploadFileFromUrl(attachment.url, attachment.name);
      await message.reply(`✅ Súbor **${file.name}** nahraný!\n🔗 ${file.webViewLink}`);
    } catch (err) {
      await message.reply('❌ Chyba uploadu: ' + err.message);
    }
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'ping') {
    await interaction.reply('🏓 Pong! LonexCore beží.');
  }

  if (interaction.commandName === 'help') {
    await interaction.reply(
      '📋 **LonexCore príkazy:**\n' +
      '`/ping` — test bota\n' +
      '`/setup` — vytvor celú štruktúru servera (kategórie, kanály, role)\n' +
      '`/gdrive browse [folder_id]` — prehliadaj priečinky\n' +
      '`/gdrive search nazov:xxx` — hľadaj súbory\n' +
      '`/mail komu: predmet: sprava: [owner:true/false]` — pošli email\n\n' +
      '📋 **LonexAI príkazy:**\n' +
      '`/ai prompt:xxx` — opýtaj sa (Gemini)\n' +
      '`/ai prompt:xxx model:openai` — použij GPT-4o'
    );
  }


  // /SETUP príkaz - vytvorí celú štruktúru servera
  if (interaction.commandName === 'setup') {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: '❌ Musíš byť admin na použitie /setup!', ephemeral: true });
    }
    await interaction.deferReply();
    const guild = interaction.guild;
    const setupLog = [];

    try {
      // Vytvor ROLE
      setupLog.push('🔧 Vytváram role...');
      const ownerRole = await guild.roles.create({ name: 'Owner', color: 0xFF0000, hoist: true });
      const ceoRole = await guild.roles.create({ name: 'CEO', color: 0xFFA500, hoist: true });
      const salesRole = await guild.roles.create({ name: 'Sales', color: 0x00FF00, hoist: true });
      const devRole = await guild.roles.create({ name: 'Developer', color: 0x0000FF, hoist: true });
      const editorRole = await guild.roles.create({ name: 'Editor', color: 0xFF00FF, hoist: true });
      const helpdeskRole = await guild.roles.create({ name: 'Helpdesk', color: 0x00FFFF, hoist: true });
      setupLog.push('✅ Role vytvorené!');

      // OWNER & CEO kategória
      setupLog.push('🔧 Vytváram OWNER & CEO kategóriu...');
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

      // SALES kategória
      setupLog.push('🔧 Vytváram SALES kategóriu...');
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

      // DEVELOPMENT kategória
      setupLog.push('🔧 Vytváram DEVELOPMENT kategóriu...');
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

      // EDITOR/GRAPHICS kategória
      setupLog.push('🔧 Vytváram EDITOR/GRAPHICS kategóriu...');
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

      // HELPDESK kategória
      setupLog.push('🔧 Vytváram HELPDESK kategóriu...');
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

      // VOICE kanály
      setupLog.push('🔧 Vytváram voice kanály...');
      const voiceCategory = await guild.channels.create({ name: '🔊 VOICE', type: ChannelType.GuildCategory });
      await guild.channels.create({ name: 'CEO Meeting', type: ChannelType.GuildVoice, parent: voiceCategory.id });
      await guild.channels.create({ name: 'Sales Room', type: ChannelType.GuildVoice, parent: voiceCategory.id });
      await guild.channels.create({ name: 'Dev Room', type: ChannelType.GuildVoice, parent: voiceCategory.id });
      await guild.channels.create({ name: 'Design Room', type: ChannelType.GuildVoice, parent: voiceCategory.id });
      await guild.channels.create({ name: 'All Hands', type: ChannelType.GuildVoice, parent: voiceCategory.id });
      await guild.channels.create({ name: 'AFK', type: ChannelType.GuildVoice, parent: voiceCategory.id });

      setupLog.push('✅ Setup dokončený!');
      await interaction.editReply(setupLog.join('\n'));
    } catch (err) {
      await interaction.editReply('❌ Chyba pri setup: ' + err.message);
    }
  }


  // /GDRIVE príkaz s subcommandmi: browse a search
  if (interaction.commandName === 'gdrive') {
    const sub = interaction.options.getSubcommand();
    await interaction.deferReply({ ephemeral: true });

    if (sub === 'browse') {
      const folderId = interaction.options.getString('folder_id') || 'root';
      try {
        const items = await listFolder(folderId);
        const folders = items.filter(f => f.mimeType === 'application/vnd.google-apps.folder');
        const files = items.filter(f => f.mimeType !== 'application/vnd.google-apps.folder');
        
        let msg = `📁 **Priečinky:**\n${folders.map(f => `\`${f.id}\` — ${f.name}`).join('\n') || 'Žiadne'}\n\n`;
        msg += `📄 **Súbory:**\n${files.map(f => f.name).join('\n') || 'Žiadne'}`;
        
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
          return interaction.editReply(`🔍 Žiadne výsledky pre "${query}".`);
        }
        const list = results.map(f => `[${f.name}](${f.webViewLink})`).join('\n');
        await interaction.editReply(`🔍 **Výsledky pre "${query}":**\n${list}`);
      } catch (err) {
        await interaction.editReply('❌ Chyba: ' + err.message);
      }
    }
  }

  // /MAIL príkaz cez SMTP
  if (interaction.commandName === 'mail') {
    const komu = interaction.options.getString('komu');
    const predmet = interaction.options.getString('predmet');
    const sprava = interaction.options.getString('sprava');
    const useOwner = interaction.options.getBoolean('owner') || false;
    
    await interaction.deferReply({ ephemeral: true });
    try {
      await sendMail({ to: komu, subject: predmet, text: sprava, useOwner });
      const from = useOwner ? process.env.SMTP_USER_OWNER : process.env.SMTP_USER_INFO;
      await interaction.editReply(`✅ Email odoslaný!\n**Od:** ${from}\n**Komu:** ${komu}\n**Predmet:** ${predmet}`);
    } catch (err) {
      await interaction.editReply('❌ Chyba: ' + err.message);
    }
  }
});

client.login(process.env.LONEXCORE_TOKEN);
