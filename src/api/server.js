const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const Database = require('../database/database');
const WhatsAppClient = require('../whatsapp/whatsappClient');
const config = require('../config/config');

class APIServer {
  constructor() {
    this.app = express();
    this.database = new Database();
    this.whatsappClient = null;
    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    // Segurança
    this.app.use(helmet());
    
    // CORS
    this.app.use(cors({
      origin: process.env.NODE_ENV === 'production' ? config.company.website : '*'
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutos
      max: 100 // limite de 100 requests por IP
    });
    this.app.use(limiter);

    // Parsing JSON
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Logging
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
      next();
    });
  }

  setupRoutes() {
    // Rota de saúde
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'Evolux WhatsApp Agent',
        version: '1.0.0'
      });
    });

    // Rota de status do WhatsApp
    this.app.get('/whatsapp/status', (req, res) => {
      const isConnected = this.whatsappClient ? this.whatsappClient.isConnected() : false;
      res.json({
        connected: isConnected,
        timestamp: new Date().toISOString()
      });
    });

    // Rotas para vagas
    this.app.get('/jobs', async (req, res) => {
      try {
        const jobs = await this.database.getActiveJobs();
        res.json({
          success: true,
          data: jobs,
          count: jobs.length
        });
      } catch (error) {
        console.error('Erro ao buscar vagas:', error);
        res.status(500).json({
          success: false,
          error: 'Erro interno do servidor'
        });
      }
    });

    this.app.post('/jobs', async (req, res) => {
      try {
        const jobData = req.body;
        const jobId = await this.database.createJob(jobData);
        res.json({
          success: true,
          data: { id: jobId, ...jobData }
        });
      } catch (error) {
        console.error('Erro ao criar vaga:', error);
        res.status(500).json({
          success: false,
          error: 'Erro interno do servidor'
        });
      }
    });

    // Rotas para candidatos
    this.app.get('/candidates', async (req, res) => {
      try {
        // Implementar busca de candidatos
        res.json({
          success: true,
          data: [],
          message: 'Funcionalidade em desenvolvimento'
        });
      } catch (error) {
        console.error('Erro ao buscar candidatos:', error);
        res.status(500).json({
          success: false,
          error: 'Erro interno do servidor'
        });
      }
    });

    this.app.get('/candidates/:phoneNumber', async (req, res) => {
      try {
        const { phoneNumber } = req.params;
        const candidate = await this.database.getCandidate(phoneNumber);
        
        if (candidate) {
          res.json({
            success: true,
            data: candidate
          });
        } else {
          res.status(404).json({
            success: false,
            error: 'Candidato não encontrado'
          });
        }
      } catch (error) {
        console.error('Erro ao buscar candidato:', error);
        res.status(500).json({
          success: false,
          error: 'Erro interno do servidor'
        });
      }
    });

    // Rotas para empresas
    this.app.get('/companies/:phoneNumber', async (req, res) => {
      try {
        const { phoneNumber } = req.params;
        const company = await this.database.getCompany(phoneNumber);
        
        if (company) {
          res.json({
            success: true,
            data: company
          });
        } else {
          res.status(404).json({
            success: false,
            error: 'Empresa não encontrada'
          });
        }
      } catch (error) {
        console.error('Erro ao buscar empresa:', error);
        res.status(500).json({
          success: false,
          error: 'Erro interno do servidor'
        });
      }
    });

    // Rota para enviar mensagem manual
    this.app.post('/whatsapp/send', async (req, res) => {
      try {
        const { phoneNumber, message } = req.body;
        
        if (!phoneNumber || !message) {
          return res.status(400).json({
            success: false,
            error: 'Número de telefone e mensagem são obrigatórios'
          });
        }

        if (!this.whatsappClient || !this.whatsappClient.isConnected()) {
          return res.status(503).json({
            success: false,
            error: 'Cliente WhatsApp não está conectado'
          });
        }

        await this.whatsappClient.sendMessage(phoneNumber, message);
        
        res.json({
          success: true,
          message: 'Mensagem enviada com sucesso'
        });
      } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        res.status(500).json({
          success: false,
          error: 'Erro interno do servidor'
        });
      }
    });

    // Rota para assumir controle manual
    this.app.post('/whatsapp/take-control', async (req, res) => {
      try {
        const { phoneNumber, agentId = 'human' } = req.body;
        
        if (!phoneNumber) {
          return res.status(400).json({
            success: false,
            error: 'Número de telefone é obrigatório'
          });
        }

        if (!this.whatsappClient || !this.whatsappClient.isConnected()) {
          return res.status(503).json({
            success: false,
            error: 'Cliente WhatsApp não está conectado'
          });
        }

        const result = await this.whatsappClient.takeManualControl(phoneNumber, agentId);
        
        if (result.success) {
          res.json({
            success: true,
            message: result.message,
            data: {
              phoneNumber,
              agentId: result.agentId,
              takenAt: result.takenAt
            }
          });
        } else {
          res.status(500).json({
            success: false,
            error: result.error
          });
        }
      } catch (error) {
        console.error('Erro ao assumir controle:', error);
        res.status(500).json({
          success: false,
          error: 'Erro interno do servidor'
        });
      }
    });

    // Rota para liberar controle manual
    this.app.post('/whatsapp/release-control', async (req, res) => {
      try {
        const { phoneNumber } = req.body;
        
        if (!phoneNumber) {
          return res.status(400).json({
            success: false,
            error: 'Número de telefone é obrigatório'
          });
        }

        if (!this.whatsappClient || !this.whatsappClient.isConnected()) {
          return res.status(503).json({
            success: false,
            error: 'Cliente WhatsApp não está conectado'
          });
        }

        const result = await this.whatsappClient.releaseManualControl(phoneNumber);
        
        if (result.success) {
          res.json({
            success: true,
            message: result.message,
            data: {
              phoneNumber,
              releasedAt: result.releasedAt
            }
          });
        } else {
          res.status(500).json({
            success: false,
            error: result.error
          });
        }
      } catch (error) {
        console.error('Erro ao liberar controle:', error);
        res.status(500).json({
          success: false,
          error: 'Erro interno do servidor'
        });
      }
    });

    // Rota para verificar status de controle
    this.app.get('/whatsapp/control-status/:phoneNumber', (req, res) => {
      try {
        const { phoneNumber } = req.params;
        const status = this.whatsappClient.getManualControlInfo(phoneNumber);
        
        res.json({
          success: true,
          data: {
            isManualControl: !!status,
            manualInfo: status
          }
        });
      } catch (error) {
        console.error('Erro ao verificar status de controle:', error);
        res.status(500).json({ success: false, error: 'Erro ao verificar status' });
      }
    });

    // Rota para gerar QR Code do WhatsApp
    this.app.get('/whatsapp/qrcode', async (req, res) => {
      try {
        if (!this.whatsappClient) {
          return res.status(500).json({ 
            success: false, 
            error: 'Cliente WhatsApp não inicializado' 
          });
        }

        const qrCode = await this.whatsappClient.generateQRCode();
        
        if (qrCode) {
          res.json({
            success: true,
            data: {
              qrCode: qrCode,
              message: 'QR Code gerado com sucesso. Escaneie com o WhatsApp.'
            }
          });
        } else {
          res.json({
            success: false,
            error: 'Não foi possível gerar QR Code. WhatsApp pode estar conectado.'
          });
        }
      } catch (error) {
        console.error('Erro ao gerar QR Code:', error);
        res.status(500).json({ 
          success: false, 
          error: 'Erro ao gerar QR Code' 
        });
      }
    });

    // Rota para verificar status do WhatsApp
    this.app.get('/whatsapp/status', (req, res) => {
      try {
        if (!this.whatsappClient) {
          return res.json({
            success: true,
            data: {
              connected: false,
              status: 'Cliente não inicializado'
            }
          });
        }

        const isConnected = this.whatsappClient.isConnected();
        
        res.json({
          success: true,
          data: {
            connected: isConnected,
            status: isConnected ? 'Conectado' : 'Desconectado'
          }
        });
      } catch (error) {
        console.error('Erro ao verificar status do WhatsApp:', error);
        res.status(500).json({ 
          success: false, 
          error: 'Erro ao verificar status do WhatsApp' 
        });
      }
    });

    // Rota para forçar desconexão do WhatsApp
    this.app.post('/whatsapp/disconnect', async (req, res) => {
      try {
        if (!this.whatsappClient) {
          return res.status(500).json({ 
            success: false, 
            error: 'Cliente WhatsApp não inicializado' 
          });
        }

        const result = await this.whatsappClient.forceDisconnect();
        
        if (result) {
          res.json({
            success: true,
            message: 'WhatsApp desconectado com sucesso. Novo QR Code será gerado.'
          });
        } else {
          res.status(500).json({
            success: false,
            error: 'Erro ao desconectar WhatsApp'
          });
        }
      } catch (error) {
        console.error('Erro ao desconectar WhatsApp:', error);
        res.status(500).json({ 
          success: false, 
          error: 'Erro ao desconectar WhatsApp' 
        });
      }
    });

    // Rota para estatísticas
    this.app.get('/stats', async (req, res) => {
      try {
        const jobs = await this.database.getActiveJobs();
        
        let activeConversations = { total: 0, conversations: [], manualControl: { total: 0, conversations: [] } };
        
        if (this.whatsappClient && this.whatsappClient.isConnected()) {
          try {
            activeConversations = this.whatsappClient.getActiveConversationsStats();
          } catch (conversationError) {
            console.error('Erro ao obter estatísticas de conversas:', conversationError);
            // Mantém o valor padrão se houver erro
          }
        }
        
        const stats = {
          success: true,
          data: {
            activeJobs: jobs.length,
            whatsappConnected: this.whatsappClient ? this.whatsappClient.isConnected() : false,
            activeConversations: activeConversations,
            timestamp: new Date().toISOString()
          }
        };
        
        res.json(stats);
      } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
        res.status(500).json({
          success: false,
          error: 'Erro interno do servidor'
        });
      }
    });

    // Endpoints para notificações
    this.app.get('/notifications/companies', async (req, res) => {
      try {
        const notifications = await this.database.getNotifications('company');
        res.json({ success: true, data: notifications });
      } catch (error) {
        console.error('Erro ao buscar notificações de empresas:', error);
        res.status(500).json({ success: false, error: 'Erro interno do servidor' });
      }
    });

    this.app.get('/notifications/others', async (req, res) => {
      try {
        const notifications = await this.database.getNotifications('other');
        res.json({ success: true, data: notifications });
      } catch (error) {
        console.error('Erro ao buscar notificações de outros assuntos:', error);
        res.status(500).json({ success: false, error: 'Erro interno do servidor' });
      }
    });

    this.app.get('/notifications/candidates', async (req, res) => {
      try {
        const notifications = await this.database.getNotifications('candidate');
        res.json({ success: true, data: notifications });
      } catch (error) {
        console.error('Erro ao buscar notificações de candidatos:', error);
        res.status(500).json({ success: false, error: 'Erro interno do servidor' });
      }
    });

    this.app.get('/notifications/all', async (req, res) => {
      try {
        const notifications = await this.database.getNotifications();
        res.json({ success: true, data: notifications });
      } catch (error) {
        console.error('Erro ao buscar todas as notificações:', error);
        res.status(500).json({ success: false, error: 'Erro interno do servidor' });
      }
    });

    this.app.post('/notifications/read', async (req, res) => {
      try {
        const { notificationId } = req.body;
        await this.database.markNotificationAsRead(notificationId);
        res.json({ success: true, message: 'Notificação marcada como lida' });
      } catch (error) {
        console.error('Erro ao marcar notificação como lida:', error);
        res.status(500).json({ success: false, error: 'Erro interno do servidor' });
      }
    });

    // Endpoints para mensagens de empresas
    this.app.get('/company-messages', async (req, res) => {
      try {
        const { phoneNumber, status } = req.query;
        const messages = await this.database.getCompanyMessages(phoneNumber, status);
        res.json({ success: true, data: messages });
      } catch (error) {
        console.error('Erro ao buscar mensagens de empresas:', error);
        res.status(500).json({ success: false, error: 'Erro interno do servidor' });
      }
    });

    this.app.get('/company-messages/pending', async (req, res) => {
      try {
        const messages = await this.database.getPendingCompanyMessages();
        res.json({ success: true, data: messages });
      } catch (error) {
        console.error('Erro ao buscar mensagens pendentes:', error);
        res.status(500).json({ success: false, error: 'Erro interno do servidor' });
      }
    });

    this.app.post('/company-messages/:messageId/status', async (req, res) => {
      try {
        const { messageId } = req.params;
        const { status, agentId, notes } = req.body;
        
        await this.database.updateCompanyMessageStatus(messageId, status, agentId, notes);
        res.json({ success: true, message: 'Status atualizado com sucesso' });
      } catch (error) {
        console.error('Erro ao atualizar status da mensagem:', error);
        res.status(500).json({ success: false, error: 'Erro interno do servidor' });
      }
    });

    this.app.get('/company-messages/stats', async (req, res) => {
      try {
        const stats = await this.database.getCompanyMessageStats();
        res.json({ success: true, data: stats });
      } catch (error) {
        console.error('Erro ao buscar estatísticas de mensagens:', error);
        res.status(500).json({ success: false, error: 'Erro interno do servidor' });
      }
    });

    // Rota para informações da empresa
    this.app.get('/company/info', (req, res) => {
      res.json({
        success: true,
        data: config.company
      });
    });

    // Middleware de tratamento de erros
    this.app.use((err, req, res, next) => {
      console.error('Erro não tratado:', err);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    });

    // Rota 404
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        error: 'Rota não encontrada'
      });
    });
  }

  setWhatsAppClient(whatsappClient) {
    this.whatsappClient = whatsappClient;
  }

  start() {
    const port = config.server.port;
    this.app.listen(port, () => {
      console.log(`🚀 Servidor API rodando na porta ${port}`);
      console.log(`📊 Dashboard disponível em: http://localhost:${port}/health`);
    });
  }
}

module.exports = APIServer;
