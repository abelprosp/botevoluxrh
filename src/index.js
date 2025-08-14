const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const config = require('./config/config');

// Importa os serviços
const Database = require('./database/database');
const GroqClient = require('./ai/groqClient');
const APIServer = require('./api/server');
const DashboardServer = require('./web/dashboard');

// Detecta se está em ambiente Render
const isRender = process.env.RENDER || process.env.NODE_ENV === 'production';

// Desabilita WhatsApp temporariamente para focar no dashboard
const enableWhatsApp = true; // true para habilitar WhatsApp

// Importa WhatsApp apenas se estiver habilitado
let WhatsAppClientSimple = null;
if (!isRender && enableWhatsApp) {
  try {
    WhatsAppClientSimple = require('./whatsapp/whatsappClientSimple');
  } catch (error) {
    console.log('⚠️ WhatsApp não disponível:', error.message);
  }
}

const app = express();

// Middleware de segurança
app.use(helmet({
  contentSecurityPolicy: false // Necessário para o dashboard
}));
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100 // limite por IP
});
app.use(limiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'Evolux Agent',
    version: '2.0.0',
    environment: isRender ? 'render' : 'local',
    nodeVersion: process.version,
    features: {
      api: true,
      dashboard: true,
      whatsapp: enableWhatsApp && !isRender && WhatsAppClientSimple !== null,
      reason: enableWhatsApp ? 'WhatsApp disponível localmente' : 'WhatsApp desabilitado temporariamente'
    }
  });
});

// Inicialização dos serviços
async function initializeServices() {
  try {
    console.log(`🚀 Iniciando Evolux Agent (${isRender ? 'Render' : 'Local'})...`);
    console.log(`📦 Node.js version: ${process.version}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📱 WhatsApp: ${enableWhatsApp ? 'Habilitado' : 'Desabilitado'}`);
    
    // Inicializa banco de dados
    const database = new Database();
    console.log('✅ Banco de dados inicializado');
    
    // Inicializa cliente Groq
    const groqClient = new GroqClient();
    console.log('✅ Cliente Groq inicializado');
    
    // Cria instância do WhatsApp (mesmo antes de inicializar) para já disponibilizar rotas
    let whatsappClient = null;
    if (enableWhatsApp && !isRender && WhatsAppClientSimple) {
      try {
        whatsappClient = new WhatsAppClientSimple();
        console.log('🧩 Instância WhatsApp criada (pré-inicialização)');
      } catch (error) {
        console.log('⚠️ Falha ao criar instância WhatsApp:', error.message);
        whatsappClient = null;
      }
    }

    // Inicializa servidor da API já com a instância (pode estar não pronta ainda)
    const apiServer = new APIServer(database, whatsappClient);
    console.log('✅ Servidor API inicializado');
    
    // Monta as rotas da API no servidor principal
    app.use('/', apiServer.getApp());
    
    // Inicializa servidor do dashboard já com a mesma instância
    const dashboardServer = new DashboardServer(database, whatsappClient);
    console.log('✅ Servidor Dashboard inicializado');
    
    // Inicia o dashboard imediatamente
    dashboardServer.start();
    
    // Inicializa WhatsApp se habilitado (de forma assíncrona)
    if (whatsappClient) {
      console.log('🔄 Inicializando WhatsApp em background...');
      
      // Inicializa WhatsApp de forma assíncrona
      (async () => {
        try {
          // Timeout estendido para 240 segundos para inicialização do WhatsApp
          const whatsappPromise = whatsappClient.initialize();
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('WhatsApp timeout - 240 segundos')), 240000)
          );
          
          await Promise.race([whatsappPromise, timeoutPromise]);
          console.log('✅ Cliente WhatsApp inicializado com sucesso!');
          
          // Garante que os servidores possuem a referência da instância
          apiServer.setWhatsAppClient(whatsappClient);
          dashboardServer.setWhatsAppClient(whatsappClient);
          
        } catch (error) {
          console.error('❌ Erro ao inicializar WhatsApp:', error.message);
          if ((error.message || '').includes('WhatsApp timeout')) {
            console.log('⏳ Inicialização do WhatsApp continua em background; tente gerar o QR novamente.');
          } else {
            console.log('⚠️ Sistema continuará funcionando sem WhatsApp');
          }
        }
      })();
    } else {
      console.log('⚠️ WhatsApp não disponível neste ambiente');
    }
    
    console.log('🎉 Serviços inicializados com sucesso!');
    console.log(`📊 Dashboard: http://localhost:${config.dashboard.port}`);
    console.log(`🔗 API: http://localhost:${config.server.port}`);
    console.log(`✅ Health: http://localhost:${config.server.port}/health`);
    
    if (whatsappClient) {
      console.log('📱 WhatsApp conectado e funcionando');
    } else {
      console.log('⚠️ Sistema funcionando sem WhatsApp');
    }
    
  } catch (error) {
    console.error('❌ Erro ao inicializar serviços:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Inicializa serviços
initializeServices();

// Middleware de erro
app.use((err, req, res, next) => {
  console.error('Erro:', err);
  res.status(500).json({ 
    error: 'Erro interno do servidor',
    message: err.message 
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Servidor principal rodando na porta ${PORT}`);
  console.log(`✅ Health check: http://localhost:${PORT}/health`);
  console.log(`🌍 Ambiente: ${isRender ? 'Render (API + Dashboard)' : 'Local (API + Dashboard)'}`);
  console.log(`📱 WhatsApp: ${enableWhatsApp ? 'Habilitado' : 'Desabilitado'}`);
});

module.exports = app;