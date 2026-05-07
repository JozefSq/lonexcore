const cron = require('node-cron');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');

// Singleton guard - zabrani viacnasobnemu spusteniu cronu
let schedulerStarted = false;

/**
 * Denny checklist - interaktivny formular o 21:00 pre CEO/Owner tracking
 * @param {Client} client - Discord bot client
 */
function startDailyChecklist(client) {
  if (schedulerStarted) {
    console.log('⚠️ Denny checklist scheduler uz bezi, preskakujem...');
    return;
  }
  schedulerStarted = true;

  // Cron pattern: '0 21 * * *' = kazdy den o 21:00 CEST
  cron.schedule('0 21 * * *', async () => {
    try {
      console.log('⏰ Spustam denny checklist o 21:00...');

      const guilds = client.guilds.cache;

      for (const [guildId, guild] of guilds) {
        console.log(`📋 Hladam #announcements kanal na: ${guild.name}`);

        // Najdi OWNER & CEO kategoriu
        const ownerCategory = guild.channels.cache.find(
          ch => ch.type === 4 && ch.name.toLowerCase().includes('owner')
        );

        if (!ownerCategory) {
          console.log(`⚠️ Kategoria OWNER & CEO neexistuje na ${guild.name}`);
          continue;
        }

        // Najdi #announcements kanal
        const announcementsChannel = guild.channels.cache.find(
          ch => ch.parentId === ownerCategory.id &&
                ch.name === 'announcements' &&
                ch.type === 0
        );

        if (!announcementsChannel) {
          console.log(`⚠️ #announcements neexistuje v OWNER & CEO na ${guild.name}`);
          continue;
        }

        // Vytvor embed s informaciami o checkliste
        const embed = new EmbedBuilder()
          .setColor(0xFF6B35)
          .setTitle('📋 DENNY CHECKLIST - Cas na reflexivu!')
          .setDescription('🔥 **30 minut na rast a sustredenost**\n\nOdpovede sa ulozi a pouziju na tyzdenné reporty + AI analyzu tvojho rastu.')
          .addFields(
            { name: '🎯 1. VYSLEDKY DNA (5 min)', value: 'Kolko ludi som oslovil? Aky content? Splnil som priority?', inline: false },
            { name: '⚡ 2. ENERGIA & TELO (3 min)', value: 'Co som zjedol (HBACL)? Pohyb? Kvalita spanku?', inline: false },
            { name: '🧠 3. MENTALNY STAV (5 min)', value: 'Kde som bol hlavou? Rozptylenvy, fokusovany, motivovany?', inline: false },
            { name: '💡 4. MOMENT RASTU (5 min)', value: 'Co som sa naucil - o LR, o ludoch, o sebe?', inline: false },
            { name: '✅ 5. CO FUNGUJE / NEFUNGUJE (5 min)', value: 'V recruitingu, content tvorbe, komunikacii?', inline: false },
            { name: '🎓 6. ZAJTRAJSI ZAMER (7 min)', value: '3 priority: LR, PM/praca, osobny rast', inline: false }
          )
          .setTimestamp()
          .setFooter({ text: 'LonexCore Bot • Denny Growth Tracker' });

        // Vytvor tlacidlo na vyplnenie checklistu
        const button = new ButtonBuilder()
          .setCustomId('daily_checklist_fill')
          .setLabel('📝 Vyplnit Checklist')
          .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder().addComponents(button);

        // Posli spravu s tlacidlom
        await announcementsChannel.send({ embeds: [embed], components: [row] });
        console.log(`✅ Denny checklist odoslany do #announcements na ${guild.name}`);
      }
    } catch (error) {
      console.error('❌ Chyba pri posielani checklistu:', error);
    }
  }, {
    scheduled: true,
    timezone: 'Europe/Bratislava'
  });

  console.log('🚀 Denny checklist scheduler aktivny (kazdy den o 21:00 CEST)');
}

/**
 * Uloz odpoved z checklistu do JSON suboru
 * Poznamka: subor je checklistResponses.json (zhodny s weeklyReports.js)
 */
async function saveChecklistResponse(userId, username, responses) {
  try {
    const dataDir = path.join(__dirname, '../data');
    // OPRAVA: nazov suboru zhodny s weeklyReports.js
    const filePath = path.join(dataDir, 'checklistResponses.json');

    // Vytvor data/ priecinok ak neexistuje
    await fs.mkdir(dataDir, { recursive: true });

    // Nacitaj existujuce data
    let data = [];
    try {
      const fileContent = await fs.readFile(filePath, 'utf8');
      data = JSON.parse(fileContent);
    } catch {
      // Subor este neexistuje
    }

    // Pridaj novu odpoved
    data.push({
      userId,
      username,
      timestamp: new Date().toISOString(),
      responses
    });

    // Uloz spat
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    console.log(`✅ Checklist odpoved ulozena pre ${username}`);
  } catch (error) {
    console.error('❌ Chyba pri ukladani checklistu:', error);
  }
}

module.exports = { startDailyChecklist, saveChecklistResponse };
