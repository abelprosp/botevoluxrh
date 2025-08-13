#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🚀 Configuração do Agente WhatsApp - Evolux Soluções de RH');
console.log('========================================================\n');

async function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function setup() {
  try {
    // Verifica se o .env já existe
    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const overwrite = await question('Arquivo .env já existe. Deseja sobrescrever? (y/N): ');
      if (overwrite.toLowerCase() !== 'y' && overwrite.toLowerCase() !== 'yes') {
        console.log('Configuração cancelada.');
        rl.close();
        return;
      }
    }

    console.log('\n📋 Configuração das variáveis de ambiente:\n');

    // Groq API Key
    const groqApiKey = await question('Chave da API Groq (obrigatório): ');
    if (!groqApiKey.trim()) {
      console.log('❌ Chave da API Groq é obrigatória!');
      rl.close();
      return;
    }

    // WhatsApp Phone Number
    const whatsappPhone = await question('Número do WhatsApp (ex: 5511999999999): ');
    
    // Server Port
    const port = await question('Porta do servidor (padrão: 3000): ') || '3000';
    
    // Company Information
    console.log('\n🏢 Informações da empresa:');
    const companyName = await question('Nome da empresa (padrão: Evolux Soluções de RH): ') || 'Evolux Soluções de RH';
    const companyDescription = await question('Descrição da empresa: ') || 'Especialistas em recrutamento e seleção de talentos';
    const companyWebsite = await question('Website da empresa: ') || 'https://evolux.com.br';
    const companyEmail = await question('Email da empresa: ') || 'contato@evolux.com.br';

    // Cria o conteúdo do arquivo .env
    const envContent = `# Groq API Configuration
GROQ_API_KEY=${groqApiKey}

# WhatsApp Configuration
WHATSAPP_PHONE_NUMBER=${whatsappPhone}

# Database Configuration
DATABASE_PATH=./database/evolux_agent.db

# Company Information
COMPANY_NAME=${companyName}
COMPANY_DESCRIPTION=${companyDescription}
COMPANY_WEBSITE=${companyWebsite}
COMPANY_EMAIL=${companyEmail}

# Server Configuration
PORT=${port}
NODE_ENV=development

# AI Model Configuration
GROQ_MODEL=llama3-8b-8192
`;

    // Escreve o arquivo .env
    fs.writeFileSync(envPath, envContent);

    // Cria diretório database se não existir
    const databaseDir = path.join(process.cwd(), 'database');
    if (!fs.existsSync(databaseDir)) {
      fs.mkdirSync(databaseDir, { recursive: true });
    }

    console.log('\n✅ Configuração concluída com sucesso!');
    console.log('\n📁 Arquivos criados:');
    console.log('   - .env (configurações)');
    console.log('   - database/ (diretório do banco)');
    
    console.log('\n🚀 Para iniciar o agente:');
    console.log('   npm install');
    console.log('   npm start');
    
    console.log('\n📱 Após iniciar, escaneie o QR Code que aparecerá no terminal.');
    console.log('\n📊 Acesse http://localhost:' + port + '/health para verificar o status.');

  } catch (error) {
    console.error('❌ Erro durante a configuração:', error);
  } finally {
    rl.close();
  }
}

// Executa a configuração
setup();
