const fs = require('fs');
const path = require('path');

console.log('🔍 Diagnóstico do Ambiente - Evolux WhatsApp Agent');
console.log('==================================================\n');

// Verifica Node.js
console.log('📋 Informações do Sistema:');
console.log(`Node.js: ${process.version}`);
console.log(`Plataforma: ${process.platform}`);
console.log(`Arquitetura: ${process.arch}`);
console.log(`Diretório atual: ${process.cwd()}\n`);

// Verifica dependências
console.log('📦 Verificando dependências:');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  console.log(`Nome do projeto: ${packageJson.name}`);
  console.log(`Versão: ${packageJson.version}`);
  console.log(`Dependências principais:`);
  
  Object.entries(packageJson.dependencies).forEach(([name, version]) => {
    console.log(`  - ${name}: ${version}`);
  });
} catch (error) {
  console.log('❌ Erro ao ler package.json:', error.message);
}

console.log('\n🔧 Verificando arquivos do projeto:');

// Verifica arquivos essenciais
const essentialFiles = [
  'src/index.js',
  'src/config/config.js',
  'src/database/database.js',
  'src/ai/groqClient.js',
  'src/whatsapp/whatsappClientSimple.js',
  'src/data/jobs.csv',
  '.env'
];

essentialFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - NÃO ENCONTRADO`);
  }
});

console.log('\n🌐 Verificando conectividade:');

// Testa conectividade básica
const https = require('https');

function testConnection(url, name) {
  return new Promise((resolve) => {
    const req = https.get(url, (res) => {
      console.log(`✅ ${name}: ${res.statusCode}`);
      resolve(true);
    });
    
    req.on('error', (err) => {
      console.log(`❌ ${name}: ${err.message}`);
      resolve(false);
    });
    
    req.setTimeout(5000, () => {
      console.log(`⏰ ${name}: Timeout`);
      req.destroy();
      resolve(false);
    });
  });
}

async function runTests() {
  await testConnection('https://www.google.com', 'Conectividade Internet');
  await testConnection('https://api.groq.com', 'API Groq');
  await testConnection('https://web.whatsapp.com', 'WhatsApp Web');
  
  console.log('\n💡 Recomendações:');
  console.log('1. Certifique-se de que o Chrome/Chromium está instalado');
  console.log('2. Verifique se o arquivo .env está configurado corretamente');
  console.log('3. Execute: npm install para instalar dependências');
  console.log('4. Execute: npm run test-whatsapp para testar WhatsApp');
  console.log('5. Execute: npm start para iniciar o agente');
  
  console.log('\n🔧 Se o problema persistir:');
  console.log('- Tente executar com: npm run test-whatsapp');
  console.log('- Verifique se há firewall bloqueando conexões');
  console.log('- Tente executar como administrador (Windows)');
  console.log('- Verifique se o antivírus não está bloqueando o Puppeteer');
}

runTests();
