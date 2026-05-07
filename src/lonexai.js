require('dotenv').config();
const { Client, GatewayIntentBits, Events } = require('discord.js');
const Anthropic = require('@anthropic-ai/sdk');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

// Firemny systemovy prompt - obmedzenie na firemne temy
const SYSTEM_PROMPT = `Si firemny AI asistent spolocnosti Lonex / LonexDigital. 
Tvoja uloha je pomocat zamestnancom VYLUCNE s firemnou tematikou:
- projektovy manazment, ulohy, deadliny
- vyvoj softveru, kod, debugging
- firemne procesy, dokumentacia
- sales, klienti, leads
- marketing, grafika, obsah
- administrativne otazky
- pouzivanie firemnych nastrojov (Discord, Google Drive, email)

Ak sa uzivatel pyta na nieco, co NESUVISI s firmou alebo prácou (napr. recepty, osobne veci, zábava, politika, sport, atd.), ODMIETNI odpovedät a vysvetli ze si firemny asistent. Odpoved vzdycky v jazyku, v ktorom sa uzivatel pyta.`;

client.once(Events.ClientReady, (c) => {
  console.log(`✅ LonexAI prihlaseny ako: ${c.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'ai') {
    const prompt = interaction.options.getString('prompt');
    const model = interaction.options.getString('model') || 'claude-haiku';
    await interaction.deferReply();

    try {
      let claudeModel = 'claude-haiku-4-5';
      if (model === 'claude-opus') claudeModel = 'claude-opus-4-5';

      const message = await anthropic.messages.create({
        model: claudeModel,
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: prompt }]
      });

      let odpoved = message.content[0].text;
      if (odpoved.length > 1900) odpoved = odpoved.substring(0, 1900) + '...\n_(odpoved skratena)_';

      const modelLabel = model === 'claude-opus' ? '🟣 Claude Opus' : '🟦 Claude Haiku';
      await interaction.editReply(`**Model:** ${modelLabel}\n\n${odpoved}`);
    } catch (err) {
      await interaction.editReply('❌ Chyba AI: ' + err.message);
    }
  }
});

client.login(process.env.LONEXAI_TOKEN);
