require('dotenv').config();
const { Client, GatewayIntentBits, Events } = require('discord.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

client.once(Events.ClientReady, (c) => {
  console.log(`✅ LonexAI prihlaséný ako: ${c.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'ai') {
    const prompt = interaction.options.getString('prompt');
    const model = interaction.options.getString('model') || 'gemini';
    await interaction.deferReply();

    try {
      let odpoved = '';

      if (model === 'gemini') {
        const genModel = gemini.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await genModel.generateContent(prompt);
        odpoved = result.response.text();
      } else if (model === 'openai') {
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: prompt }]
        });
        odpoved = completion.choices[0].message.content;
      }

      if (odpoved.length > 1900) odpoved = odpoved.substring(0, 1900) + '...\n_(odpoveď skrátená)_';

      await interaction.editReply(
        `**Model:** ${model === 'gemini' ? '🟢 Gemini' : '🟡 GPT-4o'}\n\n${odpoved}`
      );
    } catch (err) {
      await interaction.editReply('❌ Chyba AI: ' + err.message);
    }
  }
});

client.login(process.env.LONEXAI_TOKEN);
