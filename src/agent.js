const WhatsAppClient = require('./whatsapp/whatsappClientSimple');
const APIServer = require('./api/server');
const config = require('./config/config');

class EvoluxAgent {
  constructor() {
    this.whatsappClient = new WhatsAppClient();
    this.apiServer = new APIServer();
    this.isRunning = false;
  }

  async start() {
    try {
      console.log('🚀 Iniciando Agente Evolux Soluções de RH...');
      console.log(`📋 Empresa: ${config.company.name}`);
      console.log(`🌐 Website: ${config.company.website}`);
      console.log(`📧 Email: ${config.company.email}`);
      console.log('');

      // Inicia o servidor API
      this.apiServer.setWhatsAppClient(this.whatsappClient);
      this.apiServer.start();

      // Aguarda um pouco para o servidor inicializar
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Inicia o cliente WhatsApp
      console.log('📱 Conectando ao WhatsApp...');
      await this.whatsappClient.initialize();

      this.isRunning = true;
      console.log('');
      console.log('✅ Agente iniciado com sucesso!');
      console.log('');

      // Configura handlers para encerramento gracioso
      this.setupGracefulShutdown();

    } catch (error) {
      console.error('❌ Erro ao iniciar o agente:', error);
      throw error;
    }
  }

  setupGracefulShutdown() {
    const shutdown = async (signal) => {
      console.log(`\n🛑 Recebido sinal ${signal}. Encerrando agente...`);
      
      this.isRunning = false;
      
      try {
        if (this.whatsappClient) {
          await this.whatsappClient.destroy();
        }
        console.log('✅ Agente encerrado com sucesso.');
        process.exit(0);
      } catch (error) {
        console.error('❌ Erro ao encerrar agente:', error);
        process.exit(1);
      }
    };

    // Handlers para diferentes sinais de encerramento
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGQUIT', () => shutdown('SIGQUIT'));

    // Handler para erros não tratados
    process.on('uncaughtException', (error) => {
      console.error('❌ Erro não tratado:', error);
      shutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Promise rejeitada não tratada:', reason);
      shutdown('unhandledRejection');
    });
  }

  async stop() {
    if (this.isRunning) {
      console.log('🛑 Encerrando agente...');
      this.isRunning = false;
      
      try {
        if (this.whatsappClient) {
          await this.whatsappClient.destroy();
        }
        console.log('✅ Agente encerrado com sucesso.');
      } catch (error) {
        console.error('❌ Erro ao encerrar agente:', error);
      }
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      whatsappConnected: this.whatsappClient ? this.whatsappClient.isConnected() : false,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = EvoluxAgent;
