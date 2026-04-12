require('dotenv').config();
const { Client, GatewayIntentBits, Events } = require('discord.js');
const { getDriveFiles, sendEmail, findFileByName, getDownloadLink } = require('./google/client');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

client.once(Events.ClientReady, (c) => {
  console.log(`✅ LonexCore prihlaséný ako: ${c.user.tag}`);
});

// Upload cez message attachment
client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;
  if (message.content === '!upload' && message.attachments.size > 0) {
    const attachment = message.attachments.first();
    const { uploadFileFromUrl } = require('./google/client');
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
      '`/gdrive akcia:list` — zoznam súborov\n' +
      '`/gdrive akcia:upload` — pošli súbor ako `!upload`\n' +
      '`/gdrive akcia:download nazov:xxx` — stiahni súbor\n' +
      '`/mail komu: predmet: sprava:` — pošli email\n\n' +
      '📋 **LonexAI príkazy:**\n' +
      '`/ai prompt:xxx` — opýtaj sa (Gemini)\n' +
      '`/ai prompt:xxx model:openai` — použij GPT-4o'
    );
  }

  if (interaction.commandName === 'gdrive') {
    const akcia = interaction.options.getString('akcia');
    await interaction.deferReply();

    if (akcia === 'list') {
      try {
        const files = await getDriveFiles();
        if (!files || files.length === 0) return interaction.editReply('📁 Drive je prázdny.');
        const list = files.map(f => `• **${f.name}**`).join('\n');
        await interaction.editReply(`📁 **Súbory na Google Drive:**\n${list}`);
      } catch (err) {
        await interaction.editReply('❌ Chyba: ' + err.message);
      }
    }

    if (akcia === 'upload') {
      await interaction.editReply('📎 Pošli súbor ako správu s textom `!upload` — bot ho automaticky nahrá na Drive.');
    }

    if (akcia === 'download') {
      const nazov = interaction.options.getString('nazov');
      if (!nazov) return interaction.editReply('❌ Zadaj parameter `nazov`.');
      try {
        const fileId = await findFileByName(nazov);
        if (!fileId) return interaction.editReply(`❌ Súbor "${nazov}" nebol nájdený.`);
        const link = await getDownloadLink(fileId);
        await interaction.editReply(`⬇️ **${nazov}**\n🔗 ${link}`);
      } catch (err) {
        await interaction.editReply('❌ Chyba: ' + err.message);
      }
    }
  }

  if (interaction.commandName === 'mail') {
    const komu = interaction.options.getString('komu');
    const predmet = interaction.options.getString('predmet');
    const sprava = interaction.options.getString('sprava');
    const od = interaction.options.getString('od') || process.env.MAIL_FROM;
    await interaction.deferReply();
    try {
      await sendEmail(od, komu, predmet, sprava);
      await interaction.editReply(`✅ Email odoslaný!\n**Od:** ${od}\n**Komu:** ${komu}\n**Predmet:** ${predmet}`);
    } catch (err) {
      await interaction.editReply('❌ Chyba odosielania: ' + err.message);
    }
  }
});

client.login(process.env.LONEXCORE_TOKEN);
