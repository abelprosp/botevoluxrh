const fs = require('fs');
const path = require('path');

console.log('🗑️ Resetando banco de dados...');

// Caminho do banco de dados
const dbPath = './database/evolux_agent.db';

try {
  // Remove o arquivo do banco se existir
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
    console.log('✅ Banco de dados removido');
  } else {
    console.log('ℹ️ Banco de dados não existia');
  }

  // Remove diretórios de sessão do WhatsApp se existirem
  const sessionDirs = ['.wwebjs_auth', '.wwebjs_cache'];
  sessionDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
      console.log(`✅ Diretório ${dir} removido`);
    }
  });

  console.log('\n✅ Reset concluído!');
  console.log('📝 Agora você pode:');
  console.log('1. Executar: npm run setup (para configurar novamente)');
  console.log('2. Executar: npm start (para iniciar o agente)');
  console.log('3. Executar: npm run test-flow (para testar o fluxo)');

} catch (error) {
  console.error('❌ Erro ao resetar banco:', error);
}
