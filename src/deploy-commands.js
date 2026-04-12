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
        type: 1, // SUB_COMMAND
        name: 'browse',
        description: 'Prehliadaj priečinky',
        options: [
          { name: 'folder_id', description: 'ID priečinka (voliteľné)', type: 3, required: false }
        ]
      },
      {
        type: 1, // SUB_COMMAND
        name: 'search',
        description: 'Hľadaj súbory',
        options: [
          { name: 'nazov', description: 'Časť názvu súboru', type: 3, required: true }
        ]
      }
    ]
  },
  {
    name: 'mail',
    description: 'Odošli email cez SMTP',
    options: [
      { name: 'komu', description: 'Email príjemcu', type: 3, required: true },
      { name: 'predmet', description: 'Predmet emailu', type: 3, required: true },
      { name: 'sprava', description: 'Text správy', type: 3, required: true },
      { name: 'owner', description: 'Poslať z owner emailu?', type: 5, required: false }
    ]
  },
    {
    name: 'project',
    description: '📅 Správa projektov s AI research a deadline tracking',
    options: [
      {
        type: 1, // SUB_COMMAND
        name: 'create',
        description: 'Vytvor nový projekt s deadline',
        options: [
          { name: 'nazov', description: 'Názov projektu', type: 3, required: true },
          { name: 'deadline', description: 'Deadline (YYYY-MM-DD)', type: 3, required: true },
          { name: 'popis', description: 'Popis projektu', type: 3, required: false }
        ]
      },
      {
        type: 1, // SUB_COMMAND  
        name: 'list',
        description: 'Zoznam všetkých projektov'
      },
      {
        type: 1, // SUB_COMMAND
        name: 'status',
        description: 'Status projektu a AI research',
        options: [
          { name: 'nazov', description: 'Názov projektu', type: 3, required: true }
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
