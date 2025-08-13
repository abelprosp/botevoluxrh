require('dotenv').config();

module.exports = {
  groq: {
    apiKey: process.env.GROQ_API_KEY || 'gsk_1234567890abcdef', // Chave padrão para desenvolvimento
    model: 'llama3-8b-8192'
  },
  
  company: {
    name: 'Evolux Soluções de RH',
    website: 'https://evoluxrh.com.br',
    email: 'contato@evoluxrh.com.br'
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
