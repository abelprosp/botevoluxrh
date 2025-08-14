const express = require('express');
const path = require('path');
const axios = require('axios');

class Dashboard {
  constructor(database = null, whatsappClient = null) {
    this.app = express();
    this.database = database;
    this.whatsappClient = whatsappClient;
    this.apiPort = 3000; // Porta da API principal
    this.dashboardPort = 3003; // Porta do dashboard
    
    // Token de autenticação
    this.authToken = 'Jornada2024@';
    
    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    // Middleware para servir arquivos estáticos
    this.app.use(express.static(path.join(__dirname, 'public')));
    this.app.use(express.json());
    
    // Middleware de autenticação
    this.app.use((req, res, next) => {
      // Rotas que não precisam de autenticação
      const publicRoutes = ['/login', '/auth', '/health'];
      
      if (publicRoutes.includes(req.path)) {
        return next();
      }
      
      // Verifica se o token está presente
      const token = req.headers['x-auth-token'] || req.query.token || req.body.token;
      
      if (token === this.authToken) {
        return next();
      }
      
      // Se não tem token, redireciona para login
      if (req.path === '/') {
        return res.redirect('/login');
      }
      
      // Para outras rotas, retorna erro de autenticação
      return res.status(401).json({ error: 'Token de autenticação inválido' });
    });
  }

  setupRoutes() {
    // Rota de login
    this.app.get('/login', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'login.html'));
    });

    // Rota de autenticação
    this.app.post('/auth', (req, res) => {
      const { token } = req.body;
      
      if (token === this.authToken) {
        res.json({ 
          success: true, 
          message: 'Autenticação realizada com sucesso',
          token: this.authToken
        });
      } else {
        res.status(401).json({ 
          success: false, 
          error: 'Token inválido' 
        });
      }
    });

    // Rota de health check
    this.app.get('/health', (req, res) => {
      res.json({ 
        status: 'ok', 
        service: 'dashboard',
        timestamp: new Date().toISOString()
      });
    });

    // Rota principal do dashboard (protegida)
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });

    // Rota para obter estatísticas
    this.app.get('/api/stats', async (req, res) => {
      try {
        const response = await axios.get(`http://localhost:${this.apiPort}/stats`);
        res.json(response.data);
      } catch (error) {
        console.error('Erro ao obter estatísticas:', error);
        res.status(500).json({ error: 'Erro ao obter estatísticas' });
      }
    });

    // Rota para obter vagas
    this.app.get('/api/jobs', async (req, res) => {
      try {
        const response = await axios.get(`http://localhost:${this.apiPort}/jobs`);
        res.json(response.data);
      } catch (error) {
        console.error('Erro ao obter vagas:', error);
        res.status(500).json({ error: 'Erro ao obter vagas' });
      }
    });

    // Rota para obter notificações
    this.app.get('/api/notifications/:type', async (req, res) => {
      try {
        const { type } = req.params;
        const response = await axios.get(`http://localhost:${this.apiPort}/notifications/${type}`);
        res.json(response.data);
      } catch (error) {
        console.error('Erro ao obter notificações:', error);
        res.status(500).json({ error: 'Erro ao obter notificações' });
      }
    });

    // Rota para obter conversas ativas
    this.app.get('/api/conversations', async (req, res) => {
      try {
        const response = await axios.get(`http://localhost:${this.apiPort}/conversations`);
        res.json(response.data);
      } catch (error) {
        console.error('Erro ao obter conversas:', error);
        res.status(500).json({ error: 'Erro ao obter conversas' });
      }
    });

    // Rota para assumir controle
    this.app.post('/api/take-control', async (req, res) => {
      try {
        const { phoneNumber, agentId } = req.body;
        const response = await axios.post(`http://localhost:${this.apiPort}/whatsapp/take-control`, {
          phoneNumber,
          agentId
        });
        res.json(response.data);
      } catch (error) {
        console.error('Erro ao assumir controle:', error);
        res.status(500).json({ error: 'Erro ao assumir controle' });
      }
    });

    // Rota para liberar controle
    this.app.post('/api/release-control', async (req, res) => {
      try {
        const { phoneNumber } = req.body;
        const response = await axios.post(`http://localhost:${this.apiPort}/whatsapp/release-control`, {
          phoneNumber
        });
        res.json(response.data);
      } catch (error) {
        console.error('Erro ao liberar controle:', error);
        res.status(500).json({ error: 'Erro ao liberar controle' });
      }
    });

    // Rota para gerar QR Code do WhatsApp
    this.app.get('/api/whatsapp/qrcode', async (req, res) => {
      try {
        const response = await axios.get(`http://localhost:${this.apiPort}/whatsapp/qrcode`);
        res.json(response.data);
      } catch (error) {
        console.error('Erro ao gerar QR Code:', error);
        res.status(500).json({ error: 'Erro ao gerar QR Code' });
      }
    });

    // Rota para verificar status do WhatsApp
    this.app.get('/api/whatsapp/status', async (req, res) => {
      try {
        const response = await axios.get(`http://localhost:${this.apiPort}/whatsapp/status`);
        res.json(response.data);
      } catch (error) {
        console.error('Erro ao verificar status do WhatsApp:', error);
        res.status(500).json({ error: 'Erro ao verificar status do WhatsApp' });
      }
    });

    // Rota para forçar desconexão do WhatsApp
    this.app.post('/api/whatsapp/disconnect', async (req, res) => {
      try {
        const response = await axios.post(`http://localhost:${this.apiPort}/whatsapp/disconnect`);
        res.json(response.data);
      } catch (error) {
        console.error('Erro ao desconectar WhatsApp:', error);
        res.status(500).json({ error: 'Erro ao desconectar WhatsApp' });
      }
    });

    // Rota para verificar status de controle
    this.app.get('/api/control-status/:phoneNumber', async (req, res) => {
      try {
        const { phoneNumber } = req.params;
        const response = await axios.get(`http://localhost:${this.apiPort}/whatsapp/control-status/${phoneNumber}`);
        res.json(response.data);
      } catch (error) {
        console.error('Erro ao verificar status de controle:', error);
        res.status(500).json({ error: 'Erro ao verificar status de controle' });
      }
    });

    // Rota para marcar notificação como lida
    this.app.post('/api/notifications/read', async (req, res) => {
      try {
        const { notificationId } = req.body;
        const response = await axios.post(`http://localhost:${this.apiPort}/notifications/read`, {
          notificationId
        });
        res.json(response.data);
      } catch (error) {
        console.error('Erro ao marcar notificação como lida:', error);
        res.status(500).json({ error: 'Erro ao marcar notificação como lida' });
      }
    });
  }

  start() {
    const port = this.dashboardPort;
    
    try {
      const server = this.app.listen(port, () => {
        console.log(`🌐 Dashboard web rodando em: http://localhost:${port}`);
        console.log(`🔐 Token de autenticação: ${this.authToken}`);
        console.log(`📊 API disponível em: http://localhost:${this.apiPort}`);
      });

      // Tratamento de erro para porta em uso
      server.on('error', (error) => {
        if (error.code === 'EADDRINUSE') {
          console.error(`❌ Porta ${port} já está em uso. Tentando porta ${port + 1}...`);
          server.close();
          this.app.listen(port + 1, () => {
            console.log(`🌐 Dashboard web rodando em: http://localhost:${port + 1}`);
            console.log(`🔐 Token de autenticação: ${this.authToken}`);
            console.log(`📊 API disponível em: http://localhost:${this.apiPort}`);
          });
        } else {
          console.error('❌ Erro ao iniciar dashboard:', error);
        }
      });
    } catch (error) {
      console.error('❌ Erro crítico ao iniciar dashboard:', error);
    }
  }

  // Método para definir o cliente WhatsApp
  setWhatsAppClient(whatsappClient) {
    this.whatsappClient = whatsappClient;
  }
}

module.exports = Dashboard;
