const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const Database = require('../database/database');
const GroqClient = require('../ai/groqClient');
const config = require('../config/config');

class WhatsAppClient {
  constructor() {
    this.client = new Client({
      authStrategy: new LocalAuth(),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-field-trial-config',
          '--disable-ipc-flooding-protection',
          '--disable-background-networking',
          '--disable-default-apps',
          '--disable-extensions',
          '--disable-sync',
          '--disable-translate',
          '--hide-scrollbars',
          '--mute-audio',
          '--no-default-browser-check',
          '--safebrowsing-disable-auto-update',
          '--ignore-certificate-errors',
          '--ignore-ssl-errors',
          '--ignore-certificate-errors-spki-list',
          '--allow-running-insecure-content',
          '--disable-features=TranslateUI',
          '--disable-component-extensions-with-background-pages',
          '--disable-extension-network-service',
          '--disable-features=NetworkService',
          '--force-color-profile=srgb',
          '--metrics-recording-only',
          '--disable-background-networking',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-breakpad',
          '--disable-component-extensions-with-background-pages',
          '--disable-features=TranslateUI,BlinkGenPropertyTrees',
          '--disable-ipc-flooding-protection',
          '--disable-renderer-backgrounding',
          '--enable-features=NetworkService,NetworkServiceLogging',
          '--force-color-profile=srgb',
          '--metrics-recording-only',
          '--no-default-browser-check',
          '--safebrowsing-disable-auto-update'
        ],
        timeout: 60000,
        protocolTimeout: 60000
      }
    });

    this.database = new Database();
    this.groqClient = new GroqClient();
    this.isReady = false;

    this.setupEventHandlers();
  }

  setupEventHandlers() {
    // Evento quando o QR Code é gerado
    this.client.on('qr', (qr) => {
      console.log('QR Code gerado. Escaneie com o WhatsApp:');
      qrcode.generate(qr, { small: true });
    });

    // Evento quando o cliente está pronto
    this.client.on('ready', () => {
      console.log('✅ Cliente WhatsApp conectado e pronto!');
      this.isReady = true;
    });

    // Evento quando uma mensagem é recebida
    this.client.on('message', async (message) => {
      await this.handleMessage(message);
    });

    // Evento de autenticação
    this.client.on('authenticated', () => {
      console.log('🔐 WhatsApp autenticado com sucesso!');
    });

    // Evento de desconexão
    this.client.on('disconnected', (reason) => {
      console.log('❌ Cliente WhatsApp desconectado:', reason);
      this.isReady = false;
    });

    // Evento de erro
    this.client.on('auth_failure', (msg) => {
      console.error('❌ Falha na autenticação:', msg);
    });

    // Evento de loading
    this.client.on('loading_screen', (percent, message) => {
      console.log(`📱 Carregando WhatsApp: ${percent}% - ${message}`);
    });
  }

  async handleMessage(message) {
    try {
      // Ignora mensagens do próprio bot
      if (message.fromMe) return;

      const phoneNumber = message.from;
      const messageText = message.body;

      console.log(`📱 Nova mensagem de ${phoneNumber}: ${messageText}`);

      // Salva a mensagem do usuário
      await this.saveUserMessage(phoneNumber, messageText);

      // Processa a mensagem e gera resposta
      const response = await this.processMessage(phoneNumber, messageText);

      // Envia a resposta
      await this.sendMessage(phoneNumber, response);

      // Salva a resposta do agente
      await this.saveAgentMessage(phoneNumber, response);

    } catch (error) {
      console.error('Erro ao processar mensagem:', error);
      await this.sendMessage(message.from, 'Desculpe, ocorreu um erro. Tente novamente em alguns instantes.');
    }
  }

  async processMessage(phoneNumber, messageText) {
    try {
      // Obtém ou cria conversa
      let conversation = await this.database.getConversation(phoneNumber);
      
      if (!conversation) {
        // Se é a primeira mensagem, envia mensagem inicial
        return await this.groqClient.getInitialMessage();
      }

      // Obtém histórico da conversa
      const history = await this.database.getConversationHistory(conversation.id, 10);
      
      // Se ainda não foi classificado o tipo de usuário
      if (!conversation.user_type || conversation.user_type === 'unknown') {
        const userType = await this.groqClient.classifyUserType(messageText);
        await this.database.updateConversationUserType(conversation.id, userType);
        conversation.user_type = userType;
      }

      // Processa baseado no tipo de usuário
      if (conversation.user_type === 'company') {
        return await this.groqClient.handleCompanyFlow(messageText);
      } else if (conversation.user_type === 'candidate') {
        return await this.groqClient.handleCandidateFlow(messageText, history);
      } else {
        // Se não conseguiu classificar, pergunta novamente
        return await this.groqClient.getInitialMessage();
      }

    } catch (error) {
      console.error('Erro no processamento da mensagem:', error);
      return 'Desculpe, estou enfrentando dificuldades técnicas. Tente novamente em alguns instantes.';
    }
  }

  async saveUserMessage(phoneNumber, message) {
    try {
      let conversation = await this.database.getConversation(phoneNumber);
      if (!conversation) {
        const conversationId = await this.database.createConversation(phoneNumber, 'unknown');
        conversation = { id: conversationId };
      }
      
      await this.database.saveMessage(conversation.id, message, 'user');
    } catch (error) {
      console.error('Erro ao salvar mensagem do usuário:', error);
    }
  }

  async saveAgentMessage(phoneNumber, message) {
    try {
      const conversation = await this.database.getConversation(phoneNumber);
      if (conversation) {
        await this.database.saveMessage(conversation.id, message, 'agent');
      }
    } catch (error) {
      console.error('Erro ao salvar mensagem do agente:', error);
    }
  }

  async sendMessage(phoneNumber, message) {
    try {
      if (!this.isReady) {
        console.log('Cliente WhatsApp não está pronto');
        return;
      }

      // Formata o número do telefone se necessário
      const formattedNumber = phoneNumber.includes('@c.us') ? phoneNumber : `${phoneNumber}@c.us`;
      
      await this.client.sendMessage(formattedNumber, message);
      console.log(`✅ Mensagem enviada para ${phoneNumber}`);
      
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
    }
  }

  async sendMessageToAll(message, userType = null) {
    try {
      // Implementar envio em massa se necessário
      console.log('Funcionalidade de envio em massa não implementada');
    } catch (error) {
      console.error('Erro no envio em massa:', error);
    }
  }

  async getChats() {
    try {
      return await this.client.getChats();
    } catch (error) {
      console.error('Erro ao obter chats:', error);
      return [];
    }
  }

  async getChatById(chatId) {
    try {
      return await this.client.getChatById(chatId);
    } catch (error) {
      console.error('Erro ao obter chat:', error);
      return null;
    }
  }

  async initialize() {
    try {
      console.log('🚀 Iniciando cliente WhatsApp...');
      console.log('⏳ Aguarde, isso pode levar alguns minutos...');
      
      // Adiciona timeout mais longo para inicialização
      const initPromise = this.client.initialize();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout na inicialização do WhatsApp')), 120000); // 2 minutos
      });

      await Promise.race([initPromise, timeoutPromise]);
      
    } catch (error) {
      console.error('Erro ao inicializar cliente WhatsApp:', error);
      
      // Tenta reinicializar se for erro de protocolo
      if (error.message.includes('Protocol error') || error.message.includes('Execution context was destroyed')) {
        console.log('🔄 Tentando reinicializar com configurações alternativas...');
        await this.retryInitialize();
      } else {
        throw error;
      }
    }
  }

  async retryInitialize() {
    try {
      // Limpa a sessão anterior
      await this.client.destroy();
      
      // Cria novo cliente com configurações mais simples
      this.client = new Client({
        authStrategy: new LocalAuth(),
        puppeteer: {
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--no-first-run',
            '--disable-extensions',
            '--disable-default-apps',
            '--disable-sync',
            '--disable-translate',
            '--hide-scrollbars',
            '--mute-audio',
            '--no-default-browser-check'
          ],
          timeout: 90000,
          protocolTimeout: 90000
        }
      });

      this.setupEventHandlers();
      await this.client.initialize();
      
    } catch (error) {
      console.error('❌ Falha na reinicialização:', error);
      throw error;
    }
  }

  async destroy() {
    try {
      await this.client.destroy();
      this.database.close();
      console.log('Cliente WhatsApp destruído');
    } catch (error) {
      console.error('Erro ao destruir cliente:', error);
    }
  }

  isConnected() {
    return this.isReady;
  }
}

module.exports = WhatsAppClient;
