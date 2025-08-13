const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();

// Middleware de segurança
app.use(helmet());
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
    service: 'Evolux Agent API',
    version: '2.0.0',
    environment: 'vercel'
  });
});

// Endpoint principal
app.get('/', (req, res) => {
  res.json({
    message: 'Evolux WhatsApp Agent API',
    version: '2.0.0',
    status: 'running',
    environment: 'vercel',
    note: 'WhatsApp não disponível em produção Vercel',
    endpoints: {
      health: '/health',
      chat: '/api/chat',
      company: '/api/company'
    }
  });
});

// Endpoint para testar IA
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Mensagem é obrigatória' });
    }

    // Resposta simulada da IA
    const response = {
      message: 'API funcionando! WhatsApp não disponível em produção Vercel.',
      received: message,
      timestamp: new Date().toISOString(),
      service: 'Evolux Agent API',
      environment: 'vercel'
    };

    res.json(response);
  } catch (error) {
    console.error('Erro no chat:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Endpoint para informações da empresa
app.get('/api/company', (req, res) => {
  res.json({
    name: 'Evolux Soluções de RH',
    website: 'https://evoluxrh.com.br',
    email: 'contato@evoluxrh.com.br',
    service: 'Recrutamento e Seleção'
  });
});

// Endpoint para status do sistema
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    service: 'Evolux Agent API'
  });
});

// Middleware de erro
app.use((err, req, res, next) => {
  console.error('Erro:', err);
  res.status(500).json({ 
    error: 'Erro interno do servidor',
    message: err.message 
  });
});

// Middleware para rotas não encontradas
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Endpoint não encontrado',
    availableEndpoints: ['/', '/health', '/api/chat', '/api/company', '/api/status']
  });
});

const PORT = process.env.PORT || 3000;

// Para Vercel, não precisamos do app.listen()
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`🚀 API rodando na porta ${PORT}`);
    console.log(` Health check: http://localhost:${PORT}/health`);
  });
}

module.exports = app;