const cron = require('node-cron');
const { ChannelType } = require('discord.js');

/**
 * Týždenný reminder na prípravu kalendára - každú nedeľu o 20:30
 * Event: 20:30 - 21:30 pre OWNER & CEO
 * @param {Client} client - Discord bot client
 */
function startWeeklyCalendarReminder(client) {
  // Každú nedeľu o 20:30 CEST
  cron.schedule('30 20 * * 0', async () => {
    try {
      console.log('📅 Posielam týždenný reminder na prípravu kalendára...');

      const guilds = client.guilds.cache;
      
      for (const [guildId, guild] of guilds) {
        // Nájdi OWNER & CEO kategóriu
        const ownerCategory = guild.channels.cache.find(
          ch => ch.type === 4 && ch.name.toLowerCase().includes('owner')
        );

        if (!ownerCategory) {
          console.log(`⚠️ Hľadám OWNER & CEO kategóriu na: ${guild.name}`);
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

        // Vytvor reminder message
        const reminderMessage = `📅 **PRÍPRAVA KALENDÁRA NA NASLEDUJÚCI TÝŽDEŇ**\n\n` +
          `🕘 **Čas:** 20:30 - 21:30\n` +
          `👥 **Pre:** OWNER & CEO\n\n` +
          `**Program:**\n` +
          `✅ Preskúmať minulý týždeň\n` +
          `✅ Naplánovať kľúčové úlohy\n` +
          `✅ Nastaviť priority\n` +
          `✅ Blokovať čas v kalendári\n` +
          `✅ Pripraviť meetings\n\n` +
          `⏰ **Event trvá 1 hodinu (do 21:30)**`;

        // Odošli reminder
        await announcementsChannel.send(reminderMessage);

        console.log(`✅ Týždenný calendar reminder odoslaný na ${guild.name}`);
      }
    } catch (error) {
      console.error('❌ Chyba pri posielaní týždenného calendar reminderu:', error);
    }
  }, {
    timezone: 'Europe/Bratislava'
  });

  console.log('✅ Týždenný calendar reminder scheduler nastavený (Nedeľa 20:30 CEST)');
}

module.exports = { startWeeklyCalendarReminder };
