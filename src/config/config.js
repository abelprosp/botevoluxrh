require('dotenv').config();

module.exports = {
  groq: {
    apiKey: process.env.GROQ_API_KEY || 'gsk_1234567890abcdef', // Chave padrão para desenvolvimento
    model: 'llama3-8b-8192'
  },
  
  supabase: {
    url: process.env.SUPABASE_URL || 'https://your-project.supabase.co',
    key: process.env.SUPABASE_ANON_KEY || 'your-anon-key'
  },
  
  company: {
    name: 'Evolux Soluções de RH',
    website: 'https://evoluxrh.com.br',
    email: 'contato@evoluxrh.com.br',
    registrationLink: 'https://app.pipefy.com/public/form/a19wdDh_'
  },
  
  server: {
    port: process.env.PORT || 3000
  },
  
  dashboard: {
    port: process.env.DASHBOARD_PORT || 3003,
    token: process.env.DASHBOARD_TOKEN || 'Jornada2024@'
  },
  
  conversation: {
    maxHistory: 10,
    responseTimeout: 30000,
    timeoutDuration: 120000 // 2 minutos
  },
  
  database: {
    path: './database/evolux_agent.db'
  },
  
  whatsapp: {
    number: process.env.WHATSAPP_NUMBER || '5511999999999'
  }
};
