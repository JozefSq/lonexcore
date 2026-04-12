const cron = require('node-cron');
const { EmbedBuilder } = require('discord.js');

/**
 * Denný checklist - posiela sa každý deň o 21:00 do #announcements kanála v OWNER & CEO kategorii
 * @param {Client} client - Discord bot client
 */
function startDailyChecklist(client) {
  // Cron pattern: '0 21 * * *' = každý deň o 21:00
  // Formát: minúta hodina deň mesiac deň_týždňa
  cron.schedule('0 21 * * *', async () => {
    try {
      console.log('⏰ Spúšťam denný checklist o 21:00...');

      // Nájdi všetky guildy (servery) kde je bot
      const guilds = client.guilds.cache;

      for (const [guildId, guild] of guilds) {
        console.log(`📋 Hľadám #announcements kanál na serveri: ${guild.name}`);

        // Nájdi kategóriu "OWNER & CEO"
        const ownerCategory = guild.channels.cache.find(
          ch => ch.type === 4 && ch.name.toLowerCase().includes('owner')
        );

        if (!ownerCategory) {
          console.log(`⚠️  Kategória OWNER & CEO nebola nájdená na ${guild.name}`);
          continue;
        }

        // Nájdi #announcements kanál v tejto kategorii
        const announcementsChannel = guild.channels.cache.find(
          ch => ch.parentId === ownerCategory.id && 
                ch.name === 'announcements' && 
                ch.type === 0 // text channel
        );

        if (!announcementsChannel) {
          console.log(`⚠️  #announcements kanál nebol nájdený v OWNER & CEO kategorii na ${guild.name}`);
          continue;
        }

        // Vytvor embed správu s checklistom
        const embed = new EmbedBuilder()
          .setColor(0x0099FF)
          .setTitle('📋 Denný Checklist')
          .setDescription('Skontroluj dnešné úlohy a priprav sa na zajtrajší deň!')
          .addFields(
            { name: '✅ Daily Tasks', value: '\n• Skontroluj emaily\n• Prejdi GitHub notifikácie\n• Update projektové tasky\n• Skontroluj deadline projektu (Web App - 21.8.2026)', inline: false },
            { name: '📊 Progress Check', value: '\n• Aký je status aktuálnych projektov?\n• Čo sa podarilo dnes dokončiť?\n• Čo ostáva na zajtra?', inline: false },
            { name: '🎯 Tomorrow Plan', value: '\n• Priority na zajtrajší deň\n• Meetings/Calls\n• Deadliny', inline: false }
          )
          .setTimestamp()
          .setFooter({ text: 'LonexCore Bot • Denný Reminder' });

        // Pošli správu
        await announcementsChannel.send({ embeds: [embed] });
        console.log(`✅ Denný checklist odoslaný do #announcements na ${guild.name}`);
      }
    } catch (error) {
      console.error('❌ Chyba pri posielaní denného checklistu:', error);
    }
  }, {
    scheduled: true,
    timezone: "Europe/Bratislava" // Nastavenie časovej zóny na Slovensko
  });

  console.log('🚀 Denný checklist scheduler je aktívny (každý deň o 21:00 CEST)');
}

module.exports = { startDailyChecklist };
