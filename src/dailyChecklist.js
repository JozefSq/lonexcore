const cron = require('node-cron');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');

/**
 * Denný checklist - interaktívny formulár o 21:00 pre CEO/Owner tracking
 * @param {Client} client - Discord bot client  
 */
function startDailyChecklist(client) {
  // Cron pattern: '0 21 * * *' = každý deň o 21:00 CEST
  cron.schedule('0 21 * * *', async () => {
    try {
      console.log('⏰ Spúšťam denný checklist o 21:00...');

      const guilds = client.guilds.cache;

      for (const [guildId, guild] of guilds) {
        console.log(`📋 Hľadám #announcements kanál na: ${guild.name}`);

        // Nájdi OWNER & CEO kategóriu
        const ownerCategory = guild.channels.cache.find(
          ch => ch.type === 4 && ch.name.toLowerCase().includes('owner')
        );

        if (!ownerCategory) {
          console.log(`⚠️  Kategória OWNER & CEO neexistuje na ${guild.name}`);
          continue;
        }

        // Nájdi #announcements kanál
        const announcementsChannel = guild.channels.cache.find(
          ch => ch.parentId === ownerCategory.id && 
                ch.name === 'announcements' && 
                ch.type === 0
        );

        if (!announcementsChannel) {
          console.log(`⚠️  #announcements neexistuje v OWNER & CEO na ${guild.name}`);
          continue;
        }

        // Vytvor embed s informáciami o checkliste
        const embed = new EmbedBuilder()
          .setColor(0xFF6B35)
          .setTitle('📋 DENNÝ CHECKLIST - Čas na reflexívu!')
          .setDescription('🔥 **30 minút na rast a sústredenosts**\n\nOdpovede sa uložia a použijú na týždenné reporty + AI analýzu tvojho rastu.')
          .addFields(
            { 
              name: '🎯 1. VÝSLEDKY DŇA (5 min)', 
              value: 'Koľko ľudí som oslovil? Aký content? Splnil som priority?',
              inline: false 
            },
            { 
              name: '⚡ 2. ENERGIA & TELO (3 min)', 
              value: 'Čo som zjedol (HBACL)? Pohyb? Kvalita spánku?',
              inline: false 
            },
            { 
              name: '🧠 3. MENTÁLNY STAV (5 min)', 
              value: 'Kde som bol hlavou? Rozptýlený, fokusovaný, motivovaný?',
              inline: false 
            },
            { 
              name: '💡 4. MOMENT RASTU (5 min)', 
              value: 'Čo som sa naučil - o LR, o ľuďoch, o sebe?',
              inline: false 
            },
            { 
              name: '✅ 5. ČO FUNGUJE / NEFUNGUJE (5 min)', 
              value: 'V recruitingu, content tvorbe, komunikácii?',
              inline: false 
            },
            { 
              name: '🎓 6. ZAJTRAJŠÍ ZÁMER (7 min)', 
              value: '3 priority: LR, PM/práca, osobný rast',
              inline: false 
            }
          )
          .setTimestamp()
          .setFooter({ text: 'LonexCore Bot • Denný Growth Tracker' });

        // Vytvor tlačidlo na vyplnenie checklistu
        const button = new ButtonBuilder()
          .setCustomId('daily_checklist_fill')
          .setLabel('📝 Vyplniť Checklist')
          .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder().addComponents(button);

        // Pošli správu s tlačidlom
        await announcementsChannel.send({ 
          embeds: [embed],
          components: [row]
        });
        
        console.log(`✅ Denný checklist odoslaný do #announcements na ${guild.name}`);
      }
    } catch (error) {
      console.error('❌ Chyba pri posielaní checklistu:', error);
    }
  }, {
    scheduled: true,
    timezone: "Europe/Bratislava"
  });

  console.log('🚀 Denný checklist scheduler aktívny (každý deň o 21:00 CEST)');
}

/**
 * Ulož odpoveď z checklistu do JSON súboru
 */
async function saveChecklistResponse(userId, username, responses) {
  try {
    const dataDir = path.join(__dirname, '../data');
    const filePath = path.join(dataDir, 'checklist-responses.json');

    // Vytvor data/ priečinok ak neexistuje
    try {
      await fs.access(dataDir);
    } catch {
      await fs.mkdir(dataDir, { recursive: true });
    }

    // Načítaj existujúce dáta
    let data = [];
    try {
      const fileContent = await fs.readFile(filePath, 'utf8');
      data = JSON.parse(fileContent);
    } catch {
      // Súbor ešte neexistuje
    }

    // Pridaj novú odpoveď
    data.push({
      userId,
      username,
      timestamp: new Date().toISOString(),
      responses
    });

    // Ulož späť
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    console.log(`✅ Checklist odpoveď uložená pre ${username}`);
  } catch (error) {
    console.error('❌ Chyba pri ukladaní checklistu:', error);
  }
}

module.exports = { startDailyChecklist, saveChecklistResponse };
