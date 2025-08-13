const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const config = require('./config/config');

// Configurações específicas para Render
if (process.env.NODE_ENV === 'production') {
  process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD = 'true';
  process.env.PUPPETEER_EXECUTABLE_PATH = '/usr/bin/google-chrome-stable';
  process.env.PUPPETEER_ARGS = '--no-sandbox --disable-setuid-sandbox --disable-dev-shm-usage --disable-accelerated-2d-canvas --no-first-run --no-zygote --disable-gpu';
}

// Importa os serviços
const Database = require('./database/database');
const GroqClient = require('./ai/groqClient');
const WhatsAppClientSimple = require('./whatsapp/whatsappClientSimple');
const APIServer = require('./api/server');
const DashboardServer = require('./web/dashboard');

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

// Health check para Render
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'Evolux Agent',
    version: '2.0.0',
    environment: 'render',
    nodeVersion: process.version,
    puppeteerConfig: {
      skipDownload: process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH
    }
  });
});

// Inicialização dos serviços
async function initializeServices() {
  try {
    console.log('🚀 Iniciando Evolux WhatsApp Agent no Render...');
    console.log(`📦 Node.js version: ${process.version}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
    console.log(`🔧 Puppeteer config:`, {
      skipDownload: process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH
    });
    
    // Inicializa banco de dados
    const database = new Database();
    console.log('✅ Banco de dados inicializado');
    
    // Inicializa cliente Groq
    const groqClient = new GroqClient();
    console.log('✅ Cliente Groq inicializado');
    
    // Inicializa cliente WhatsApp
    const whatsappClient = new WhatsAppClientSimple();
    console.log('✅ Cliente WhatsApp inicializado');
    
    // Inicializa servidor da API
    const apiServer = new APIServer(database, whatsappClient);
    console.log('✅ Servidor API inicializado');
    
    // Inicializa servidor do dashboard
    const dashboardServer = new DashboardServer(database, whatsappClient);
    console.log('✅ Servidor Dashboard inicializado');
    
    // Inicializa WhatsApp com timeout
    console.log('🔄 Inicializando WhatsApp...');
    const whatsappPromise = whatsappClient.initialize();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('WhatsApp timeout')), 60000)
    );
    
    await Promise.race([whatsappPromise, timeoutPromise]);
    console.log('✅ WhatsApp inicializado');
    
    console.log('🎉 Todos os serviços inicializados com sucesso!');
    console.log(` Dashboard: http://localhost:${config.dashboard.port}`);
    console.log(`🔗 API: http://localhost:${config.server.port}`);
    console.log(` Health: http://localhost:${config.server.port}/health`);
    
  } catch (error) {
    console.error('❌ Erro ao inicializar serviços:', error);
    console.error('Stack trace:', error.stack);
    
    // Se for erro do WhatsApp, continua sem ele
    if (error.message.includes('WhatsApp')) {
      console.log('⚠️ Continuando sem WhatsApp...');
    } else {
      process.exit(1);
    }
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
});

module.exports = app;