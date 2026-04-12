require('dotenv').config();
const { REST, Routes } = require('discord.js');

const lonexcoreCommands = [
  { name: 'ping', description: '🏓 Test bota' },
  { name: 'help', description: '📋 Zoznam príkazov' },
  {
    name: 'gdrive',
    description: '📁 Google Drive operácie',
    options: [
      {
        name: 'akcia',
        description: 'list / upload / download',
        type: 3,
        required: true,
        choices: [
          { name: 'Zoznam súborov', value: 'list' },
          { name: 'Upload súboru', value: 'upload' },
          { name: 'Download súboru', value: 'download' }
        ]
      },
      {
        name: 'nazov',
        description: 'Názov súboru (pre download)',
        type: 3,
        required: false
      }
    ]
  },
  {
    name: 'mail',
    description: '📧 Pošli email',
    options: [
      { name: 'komu', description: 'Email adresa príjemcu', type: 3, required: true },
      { name: 'predmet', description: 'Predmet emailu', type: 3, required: true },
      { name: 'sprava', description: 'Text správy', type: 3, required: true },
      {
        name: 'od',
        description: 'Odosielateľ',
        type: 3,
        required: false,
        choices: [
          { name: 'info@lonexdigital.com', value: 'info@lonexdigital.com' },
          { name: 'support@lonexdigital.com', value: 'support@lonexdigital.com' },
          { name: 'jozef@lonexdigital.com', value: 'jozef@lonexdigital.com' }
        ]
      }
    ]
  },
  { name: 'setup', description: '🔧 Vytvor celú štruktúru servera (kategórie, kanály, role)' }
];

const lonexaiCommands = [
  {
    name: 'ai',
    description: '🤖 Pýtaj sa AI',
    options: [
      { name: 'prompt', description: 'Tvoja otázka', type: 3, required: true },
      {
        name: 'model',
        description: 'Vyber AI model (default: gemini)',
        type: 3,
        required: false,
        choices: [
          { name: '🟢 Gemini (Google)', value: 'gemini' },
          { name: '🟡 GPT-4o (OpenAI)', value: 'openai' }
        ]
      }
    ]
  }
];

const rest = new REST({ version: '10' });

(async () => {
  try {
    rest.setToken(process.env.LONEXCORE_TOKEN);
    await rest.put(Routes.applicationCommands(process.env.LONEXCORE_CLIENT_ID), { body: lonexcoreCommands });
    console.log('✅ LonexCore slash príkazy zaregistrované');

    rest.setToken(process.env.LONEXAI_TOKEN);
    await rest.put(Routes.applicationCommands(process.env.LONEXAI_CLIENT_ID), { body: lonexaiCommands });
    console.log('✅ LonexAI slash príkazy zaregistrované');
  } catch (err) {
    console.error('❌ Chyba:', err);
  }
})();
