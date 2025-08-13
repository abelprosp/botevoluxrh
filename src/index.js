const EvoluxAgent = require('./agent');
const Dashboard = require('./web/dashboard');

async function main() {
  try {
    console.log('🚀 Iniciando Agente Evolux Soluções de RH...');
    
    // Inicia o agente principal
    const agent = new EvoluxAgent();
    await agent.start();
    
    // Inicia o dashboard web
    const dashboard = new Dashboard();
    dashboard.start();
    
    console.log('✅ Sistema iniciado com sucesso!');
    console.log('📊 Endpoints disponíveis:');
    console.log('   - Status: http://localhost:3000/health');
    console.log('   - WhatsApp Status: http://localhost:3000/whatsapp/status');
    console.log('   - Vagas: http://localhost:3000/jobs');
    console.log('   - Estatísticas: http://localhost:3000/stats');
    console.log('   - Dashboard Web: http://localhost:3003');
    
  } catch (error) {
    console.error('❌ Erro ao iniciar o sistema:', error);
    process.exit(1);
  }
}

// Tratamento de sinais para encerramento gracioso
process.on('SIGINT', async () => {
  console.log('\n🛑 Encerrando sistema...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Encerrando sistema...');
  process.exit(0);
});

main().catch(console.error);
