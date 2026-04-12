const cron = require('node-cron');
const fs = require('fs').promises;
const path = require('path');
const { ChannelType } = require('discord.js');

/**
 * Týždenný report - generuje súhrn za týždeň každú nedeľu o 20:00
 * @param {Client} client - Discord bot client
 */
function startWeeklyReports(client) {
  // Každú nedeľu o 20:00 CEST
  cron.schedule('0 20 * * 0', async () => {
    try {
      console.log('📊 Generujem týždenný report...');

      const guilds = client.guilds.cache;
      
      for (const [guildId, guild] of guilds) {
        // Nájdi OWNER & CEO kategóriu
        const ownerCategory = guild.channels.cache.find(
          ch => ch.type === 4 && ch.name.toLowerCase().includes('owner')
        );

        if (!ownerCategory) {
          console.log(`⚠️ Hľadám #announcements kanál na: ${guild.name}`);
          continue;
        }

        // Nájdi #announcements kanál
        const announcementsChannel = guild.channels.cache.find(
          ch => ch.type === ChannelType.GuildText && 
               ch.name === 'announcements' && 
               ch.parentId === ownerCategory.id
        );

        if (!announcementsChannel) {
          console.log(`⚠️ Nepodarilo sa nájsť #announcements v OWNER & CEO kategorii`);
          continue;
        }

        // Načítaj dáta z checklistov
        const dataDir = path.join(__dirname, '../data');
        const responsesFile = path.join(dataDir, 'checklistResponses.json');

        let responses = [];
        try {
          const fileContent = await fs.readFile(responsesFile, 'utf8');
          responses = JSON.parse(fileContent);
        } catch {
          console.log('⚠️ Žiadne dáta z checklistov');
          continue;
        }

        // Filtrovanie dát za posledných 7 dní
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        const weeklyData = responses.filter(r => {
          const responseDate = new Date(r.timestamp);
          return responseDate >= oneWeekAgo;
        });

        if (weeklyData.length === 0) {
          await announcementsChannel.send('📊 **TÝŽDENNÝ REPORT**\n\nŽiadne dáta za tento týždeň.');
          continue;
        }

        // Štatistiky
        const userStats = {};
        const sectionStats = {};

        weeklyData.forEach(r => {
          // Počet odpovedí na usera
          if (!userStats[r.username]) {
            userStats[r.username] = 0;
          }
          userStats[r.username]++;

          // Počet odpovedí na sekciu
          if (!sectionStats[r.section]) {
            sectionStats[r.section] = 0;
          }
          sectionStats[r.section]++;
        });

        // Vytvor report message
        let reportMessage = `📊 **TÝŽDENNÝ REPORT** (${oneWeekAgo.toLocaleDateString('sk-SK')} - ${new Date().toLocaleDateString('sk-SK')})\n\n`;
        
        reportMessage += `**📈 Celkovo odpovedí:** ${weeklyData.length}\n\n`;

        reportMessage += `**👥 Štatistiky používateľov:**\n`;
        Object.entries(userStats)
          .sort((a, b) => b[1] - a[1])
          .forEach(([user, count]) => {
            reportMessage += `• ${user}: **${count}** odpovedí\n`;
          });

        reportMessage += `\n**📋 Najčastejšie sekcie:**\n`;
        Object.entries(sectionStats)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .forEach(([section, count]) => {
            reportMessage += `• ${section}: **${count}x**\n`;
          });

        // Odošli report
        await announcementsChannel.send(reportMessage);

        // Ulož report do súboru
        const reportsDir = path.join(__dirname, '../data/reports');
        await fs.mkdir(reportsDir, { recursive: true });
        
        const reportFileName = `weekly_${new Date().toISOString().split('T')[0]}.json`;
        const reportFilePath = path.join(reportsDir, reportFileName);
        
        await fs.writeFile(reportFilePath, JSON.stringify({
          period: {
            from: oneWeekAgo.toISOString(),
            to: new Date().toISOString()
          },
          totalResponses: weeklyData.length,
          userStats,
          sectionStats,
          rawData: weeklyData
        }, null, 2));

        console.log(`✅ Týždenný report odoslaný na ${guild.name}`);
      }
    } catch (error) {
      console.error('❌ Chyba pri generovaní týždenného reportu:', error);
    }
  }, {
    timezone: 'Europe/Bratislava'
  });

  console.log('✅ Týždenný report scheduler nastavený (Nedeľa 20:00 CEST)');
}

module.exports = { startWeeklyReports };
