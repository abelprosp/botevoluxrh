const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const Database = require('../database/database');
const GroqClient = require('../ai/groqClient');
const BusinessHoursService = require('../services/businessHoursService');
const config = require('../config/config');

class WhatsAppClientSimple {
  constructor() {
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
          '--no-default-browser-check',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-field-trial-config',
          '--disable-ipc-flooding-protection',
          '--disable-background-networking',
          '--disable-breakpad',
          '--disable-component-extensions-with-background-pages',
          '--disable-features=TranslateUI,BlinkGenPropertyTrees',
          '--enable-features=NetworkService,NetworkServiceLogging',
          '--force-color-profile=srgb',
          '--metrics-recording-only',
          '--safebrowsing-disable-auto-update',
          '--ignore-certificate-errors',
          '--ignore-ssl-errors',
          '--ignore-certificate-errors-spki-list',
          '--allow-running-insecure-content',
          '--disable-features=TranslateUI',
          '--disable-component-extensions-with-background-pages',
          '--disable-extension-network-service',
          '--disable-features=NetworkService'
        ],
        timeout: 120000,
        protocolTimeout: 120000,
        executablePath: process.platform === 'win32' ? undefined : '/usr/bin/google-chrome-stable'
      }
    });

    this.database = new Database();
    this.groqClient = new GroqClient();
    this.isReady = false;
    this.retryCount = 0;
    this.maxRetries = 3;
    
    // Sistema de timeout
    this.activeConversations = new Map(); // phoneNumber -> { timeoutId, lastActivity }
    this.timeoutDuration = config.conversation.timeoutDuration || 120000; // 2 minutos em millisegundos

    // Sistema de controle manual
    this.manualControl = new Map(); // phoneNumber -> { isManual: boolean, agentId: string, takenAt: Date }

    this.setupEventHandlers();
  }

  setupEventHandlers() {
    // Evento quando o QR Code é gerado
    this.client.on('qr', (qr) => {
      console.log('QR Code gerado. Escaneie com o WhatsApp:');
      this.qrCode = qr; // Salva o QR Code para uso posterior
      qrcode.generate(qr, { small: true });
    });

    // Evento quando o cliente está pronto
    this.client.on('ready', () => {
      console.log('✅ Cliente WhatsApp conectado e pronto!');
      this.isReady = true;
      this.retryCount = 0; // Reset retry count on success
      this.qrCode = null; // Limpa o QR Code quando conectado
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

  // Sistema de controle manual
  async takeManualControl(phoneNumber, agentId = 'human') {
    try {
      // Remove timeout da conversa mas mantém na lista ativa
      if (this.activeConversations.has(phoneNumber)) {
        const { timeoutId } = this.activeConversations.get(phoneNumber);
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        
        // Mantém a conversa na lista mas sem timeout
        this.activeConversations.set(phoneNumber, {
          timeoutId: null,
          lastActivity: Date.now(),
          isManualControl: true
        });
      } else {
        // Se não estava na lista, adiciona sem timeout
        this.activeConversations.set(phoneNumber, {
          timeoutId: null,
          lastActivity: Date.now(),
          isManualControl: true
        });
      }

      // Marca conversa como controle manual
      this.manualControl.set(phoneNumber, {
        isManual: true,
        agentId: agentId,
        takenAt: new Date()
      });

      // Atualiza no banco de dados
      await this.database.updateConversationStatus(phoneNumber, 'manual_control');

      // Envia mensagem informando que o atendimento foi iniciado
      const startMessage = `👤 *Atendimento Iniciado*

Olá! Meu nome é ${agentId} e vou atendê-lo agora.

Como posso ajudá-lo hoje?

---
*Atendimento iniciado em ${new Date().toLocaleString('pt-BR')}*`;

      await this.sendMessage(phoneNumber, startMessage);
      console.log(`📤 Mensagem de início de atendimento enviada para ${phoneNumber}`);

      console.log(`👤 Controle manual assumido para ${phoneNumber} por ${agentId}`);
      
      return {
        success: true,
        message: `Controle manual assumido para ${phoneNumber}`,
        agentId: agentId,
        takenAt: new Date()
      };

    } catch (error) {
      console.error('Erro ao assumir controle manual:', error);
      return {
        success: false,
        error: 'Erro ao assumir controle manual'
      };
    }
  }

  async releaseManualControl(phoneNumber) {
    try {
      // Obtém informações do controle manual antes de remover
      const manualInfo = this.getManualControlInfo(phoneNumber);
      const agentId = manualInfo ? manualInfo.agentId : 'atendente';

      // Remove controle manual
      this.manualControl.delete(phoneNumber);

      // Atualiza no banco de dados
      await this.database.updateConversationStatus(phoneNumber, 'active');

      // Envia mensagem informando que o atendimento foi finalizado
      const finishMessage = `✅ *Atendimento Finalizado*

Obrigado por escolher a ${config.company.name}!

O atendimento foi finalizado por ${agentId}.

Se precisar de mais informações, sinta-se à vontade para enviar uma nova mensagem a qualquer momento!

Obrigado pela confiança! 🙏

---
*Atendimento finalizado em ${new Date().toLocaleString('pt-BR')}*`;

      await this.sendMessage(phoneNumber, finishMessage);
      console.log(`📤 Mensagem de finalização de atendimento enviada para ${phoneNumber}`);

      // Envia mensagem de encerramento do atendimento manual
      const closingMessage = `✅ *Atendimento Manual Encerrado*

O atendimento manual foi encerrado e o assistente virtual da Evolux Soluções de RH está de volta!

🤖 Como posso ajudá-lo hoje?

*Digite "empresa" se você representa uma empresa interessada em nossos serviços de RH*
*Digite "candidato" se você está procurando oportunidades de emprego*

---
*Sistema reiniciado automaticamente*`;

      await this.sendMessage(phoneNumber, closingMessage);
      console.log(`📤 Mensagem de encerramento enviada para ${phoneNumber}`);

      // Limpa o histórico da conversa para reiniciar o fluxo
      await this.database.clearConversationData(phoneNumber);
      console.log(`🔄 Histórico da conversa limpo para ${phoneNumber}`);

      // Cria nova conversa
      await this.database.createConversation(phoneNumber, 'candidate');
      console.log(`🆕 Nova conversa criada para ${phoneNumber}`);

      // Envia mensagem inicial
      const initialMessage = await this.groqClient.getInitialMessage();
      await this.sendMessage(phoneNumber, initialMessage);
      console.log(`👋 Mensagem inicial enviada para ${phoneNumber}`);

      // Reativa timeout
      this.manageConversationTimeout(phoneNumber);

      console.log(`🤖 Controle manual liberado e fluxo reiniciado para ${phoneNumber}`);
      
      return {
        success: true,
        message: `Controle manual liberado e fluxo reiniciado para ${phoneNumber}`,
        releasedAt: new Date()
      };

    } catch (error) {
      console.error('Erro ao liberar controle manual:', error);
      return {
        success: false,
        error: 'Erro ao liberar controle manual'
      };
    }
  }

  isUnderManualControl(phoneNumber) {
    return this.manualControl.has(phoneNumber);
  }

  getManualControlInfo(phoneNumber) {
    return this.manualControl.get(phoneNumber) || null;
  }

  // Gerencia o timeout da conversa
  manageConversationTimeout(phoneNumber) {
    // Cancela timeout anterior se existir
    if (this.activeConversations.has(phoneNumber)) {
      const { timeoutId } = this.activeConversations.get(phoneNumber);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }

    // Configura novo timeout
    const timeoutId = setTimeout(async () => {
      await this.handleConversationTimeout(phoneNumber);
    }, this.timeoutDuration);

    // Atualiza registro da conversa
    this.activeConversations.set(phoneNumber, {
      timeoutId,
      lastActivity: Date.now()
    });

    console.log(`⏰ Timeout configurado para ${phoneNumber} (${this.timeoutDuration/1000}s)`);
  }

  // Trata timeout da conversa baseado no tipo de usuário
  async handleConversationTimeout(phoneNumber) {
    try {
      // Verifica o tipo de usuário
      const conversation = await this.database.getConversation(phoneNumber);
      
      if (conversation && (conversation.user_type === 'company' || conversation.user_type === 'other')) {
        // Para empresas e outros assuntos, envia mensagem de follow-up em vez de finalizar
        await this.sendCompanyFollowUp(phoneNumber);
      } else {
        // Para candidatos, finaliza normalmente
        await this.finalizeConversation(phoneNumber);
      }
    } catch (error) {
      console.error('Erro ao tratar timeout da conversa:', error);
      // Em caso de erro, finaliza normalmente
      await this.finalizeConversation(phoneNumber);
    }
  }

  // Envia mensagem de follow-up para empresas
  async sendCompanyFollowUp(phoneNumber) {
    try {
      console.log(`🏢 Enviando follow-up para empresa ${phoneNumber}`);
      
      const followUpMessage = `⏰ *Ainda está conosco?*

Olá! Percebemos que você não interagiu conosco nos últimos minutos.

🤔 Você ainda deseja conversar com a Evolux Soluções de RH?

📞 Todos os nossos atendentes estão ocupados no momento, mas retornaremos assim que possível!

💬 Se ainda estiver interessado, responda com "sim" ou envie uma nova mensagem.

Obrigado pela paciência! 🙏

---
*Esta mensagem foi enviada automaticamente após 2 minutos de inatividade.*`;

      await this.sendMessage(phoneNumber, followUpMessage);
      
      // Configura um novo timeout mais longo para finalizar se não responder
      const finalTimeoutId = setTimeout(async () => {
        await this.finalizeConversation(phoneNumber);
      }, 300000); // 5 minutos adicionais

      // Atualiza o registro da conversa
      this.activeConversations.set(phoneNumber, {
        timeoutId: finalTimeoutId,
        lastActivity: Date.now()
      });

      console.log(`✅ Follow-up enviado para empresa ${phoneNumber}`);
      
    } catch (error) {
      console.error('Erro ao enviar follow-up para empresa:', error);
    }
  }

  // Finaliza a conversa após timeout
  async finalizeConversation(phoneNumber) {
    try {
      console.log(`⏰ Finalizando conversa com ${phoneNumber} por inatividade`);
      
      // Remove da lista de conversas ativas
      this.activeConversations.delete(phoneNumber);
      
      // Remove controle manual se existir
      this.manualControl.delete(phoneNumber);
      
      // Envia mensagem de finalização
      const finalMessage = `⏰ *Atendimento Finalizado*

Olá! Percebemos que você não interagiu conosco nos últimos minutos.

📞 Se precisar de mais informações, sinta-se à vontade para enviar uma nova mensagem a qualquer momento!

Obrigado por escolher a ${config.company.name}! 🙏

---
*Este atendimento foi finalizado automaticamente por inatividade.*`;

      await this.sendMessage(phoneNumber, finalMessage);
      
      // Marca conversa como finalizada no banco
      await this.database.finalizeConversation(phoneNumber);
      
      console.log(`✅ Conversa com ${phoneNumber} finalizada`);
      
    } catch (error) {
      console.error('Erro ao finalizar conversa:', error);
    }
  }

  // Verifica se a conversa foi reiniciada
  isConversationRestarted(phoneNumber) {
    if (!this.activeConversations.has(phoneNumber)) {
      return true; // Nova conversa ou reiniciada
    }
    
    const { lastActivity } = this.activeConversations.get(phoneNumber);
    const timeSinceLastActivity = Date.now() - lastActivity;
    
    // Se passou mais de 5 minutos, considera reiniciada
    return timeSinceLastActivity > 300000; // 5 minutos
  }

  async handleMessage(message) {
    try {
      // Ignora mensagens do próprio bot
      if (message.fromMe) return;

      const phoneNumber = message.from;
      const messageText = message.body;

      console.log(`📱 Nova mensagem de ${phoneNumber}: ${messageText}`);

      // Verifica se é uma conversa reiniciada
      const isRestarted = this.isConversationRestarted(phoneNumber);
      if (isRestarted) {
        console.log(`🔄 Conversa reiniciada com ${phoneNumber}`);
        // Limpa dados anteriores da conversa
        await this.database.clearConversationData(phoneNumber);
        // NÃO remove controle manual em conversas reiniciadas
        // this.manualControl.delete(phoneNumber);
      }

      // Verifica se está sob controle manual
      if (this.isUnderManualControl(phoneNumber)) {
        console.log(`👤 Mensagem de ${phoneNumber} em controle manual - ignorando IA`);
        // Salva a mensagem mas não processa com IA
        await this.saveUserMessage(phoneNumber, messageText);
        return; // Não processa com IA
      }

      // Gerencia timeout da conversa
      this.manageConversationTimeout(phoneNumber);

      // Salva a mensagem do usuário
      await this.saveUserMessage(phoneNumber, messageText);

      // Processa a mensagem e gera resposta
      const response = await this.processMessage(phoneNumber, messageText, isRestarted);

      // Se a resposta for null, significa que a conversa foi encerrada
      if (response === null) {
        console.log(`✅ Conversa encerrada pelo usuário ${phoneNumber}`);
        return;
      }

      // Envia a resposta
      await this.sendMessage(phoneNumber, response);

      // Salva a resposta do agente
      await this.saveAgentMessage(phoneNumber, response);

    } catch (error) {
      console.error('Erro ao processar mensagem:', error);
      await this.sendMessage(message.from, 'Desculpe, ocorreu um erro. Tente novamente em alguns instantes.');
    }
  }

  async processMessage(phoneNumber, messageText, isRestarted = false) {
    try {
      console.log(`🔍 PROCESSANDO MENSAGEM: "${messageText}" de ${phoneNumber}`);
      
      // Se é uma conversa reiniciada, sempre envia mensagem inicial
      if (isRestarted) {
        console.log(`🔄 Conversa reiniciada - enviando mensagem inicial`);
        return await this.groqClient.getInitialMessage();
      }

      // Obtém ou cria conversa
      let conversation = await this.database.getConversation(phoneNumber);
      console.log(`📋 Conversa encontrada:`, conversation);
      
      if (!conversation) {
        // Se é a primeira mensagem, envia mensagem inicial
        console.log(`🆕 Primeira mensagem - enviando mensagem inicial`);
        return await this.groqClient.getInitialMessage();
      }

      // Obtém histórico da conversa
      const history = await this.database.getConversationHistory(conversation.id, 10);
      console.log(`📜 Histórico da conversa: ${history.length} mensagens`);
      
      // Verifica se a mensagem é uma resposta direta à pergunta inicial
      const messageLower = messageText.toLowerCase();
      console.log(`🔍 Verificando palavras-chave na mensagem: "${messageLower}"`);
      
      if (messageLower.includes('candidato') || messageLower.includes('candidate')) {
        console.log(`📱 Usuário ${phoneNumber} respondeu: candidato`);
        await this.database.updateConversationUserType(conversation.id, 'candidate');
        conversation.user_type = 'candidate';
        return await this.groqClient.handleCandidateFlow(messageText, history);
      } else if (messageLower.includes('empresa') || messageLower.includes('company')) {
        console.log(`📱 Usuário ${phoneNumber} respondeu: empresa`);
        await this.database.updateConversationUserType(conversation.id, 'company');
        conversation.user_type = 'company';
        
        // Criar notificação para empresa
        try {
          await this.database.createNotification(
            'company',
            phoneNumber,
            '🏢 Nova Empresa Interessada',
            `Empresa ${phoneNumber} entrou em contato para contratar serviços da Evolux`
          );
          console.log(`🔔 Notificação criada para empresa ${phoneNumber}`);
        } catch (error) {
          console.error('Erro ao criar notificação:', error);
        }
        
        return await this.groqClient.handleCompanyFlow(messageText);
      } else if (messageLower.includes('outros') || messageLower.includes('outras dúvidas') || messageLower.includes('outros assuntos')) {
        console.log(`📱 Usuário ${phoneNumber} respondeu: outros assuntos`);
        await this.database.updateConversationUserType(conversation.id, 'other');
        conversation.user_type = 'other';
        
        // Criar notificação para outros assuntos
        try {
          await this.database.createNotification(
            'other',
            phoneNumber,
            '❓ Outros Assuntos',
            `Usuário ${phoneNumber} solicitou informações sobre outros assuntos: "${messageText}"`
          );
          console.log(`🔔 Notificação de outros assuntos criada: ${phoneNumber}`);
        } catch (error) {
          console.error('Erro ao criar notificação de outros assuntos:', error);
        }
        
        return await this.groqClient.handleOtherFlow(messageText, history);
      }
      
      console.log(`📋 Tipo de usuário atual: ${conversation.user_type}`);
      
      // Se ainda não foi classificado o tipo de usuário
      if (!conversation.user_type || conversation.user_type === 'unknown') {
        console.log(`🤖 Classificando tipo de usuário automaticamente`);
        const userType = await this.groqClient.classifyUserType(messageText);
        console.log(`📱 Usuário ${phoneNumber} classificado como: ${userType}`);
        await this.database.updateConversationUserType(conversation.id, userType);
        conversation.user_type = userType;
        
        // Processa a primeira resposta baseada na classificação
        if (userType === 'company') {
          // Criar notificação para empresa
          try {
            await this.database.createNotification(
              'company',
              phoneNumber,
              '🏢 Nova Empresa Interessada',
              `Empresa ${phoneNumber} entrou em contato para contratar serviços da Evolux`
            );
            console.log(`🔔 Notificação criada para empresa ${phoneNumber}`);
          } catch (error) {
            console.error('Erro ao criar notificação:', error);
          }
          
          return await this.groqClient.handleCompanyFlow(messageText);
        } else if (userType === 'candidate') {
          return await this.groqClient.handleCandidateFlow(messageText, history);
        } else if (userType === 'other') {
          // Criar notificação para outros assuntos
          try {
            await this.database.createNotification(
              'other',
              phoneNumber,
              '❓ Outros Assuntos',
              `Usuário ${phoneNumber} solicitou informações sobre outros assuntos: "${messageText}"`
            );
            console.log(`🔔 Notificação de outros assuntos criada: ${phoneNumber}`);
          } catch (error) {
            console.error('Erro ao criar notificação de outros assuntos:', error);
          }
          
          return await this.groqClient.handleOtherFlow(messageText, history);
        }
      }

      // Se já foi classificado, processa normalmente
      if (conversation.user_type === 'company') {
        // Registra a mensagem da empresa
        try {
          const businessHours = this.businessHoursService.isBusinessHours() ? 'within' : 'outside';
          await this.database.createCompanyMessage(
            phoneNumber, 
            messageText, 
            null, // companyName será extraído depois se necessário
            'initial',
            businessHours
          );
          console.log(`📝 Mensagem da empresa registrada: ${phoneNumber}`);
        } catch (error) {
          console.error('Erro ao registrar mensagem da empresa:', error);
        }
        
        // Verifica se a empresa quer encerrar a conversa
        console.log(`🔍 Verificando se empresa ${phoneNumber} quer encerrar: "${messageText}"`);
        if (this.groqClient.wantsToEndConversation(messageText)) {
          console.log(`🏢 Empresa ${phoneNumber} quer encerrar a conversa`);
          
          // Envia mensagem de encerramento
          const endMessage = await this.groqClient.handleEndConversation(messageText);
          await this.sendMessage(phoneNumber, endMessage);
          
          // Finaliza a conversa
          await this.finalizeConversation(phoneNumber);
          
          return null; // Não envia resposta adicional
        }
        
        return await this.groqClient.handleCompanyFlow(messageText);
      } else if (conversation.user_type === 'candidate') {
        // Verifica se o candidato quer falar com um atendente
        if (this.groqClient.wantsToTalkToAttendant(messageText)) {
          console.log(`👤 Candidato ${phoneNumber} quer falar com atendente`);
          
          // Cria notificação para atendimento manual
          try {
            await this.database.createNotification(
              'candidate',
              phoneNumber,
              '👤 Candidato Quer Atendente',
              `Candidato ${phoneNumber} solicitou atendimento humano: "${messageText}"`
            );
            console.log(`🔔 Notificação de candidato criada: ${phoneNumber}`);
          } catch (error) {
            console.error('Erro ao criar notificação de candidato:', error);
          }
          
          // Retorna mensagem de transferência
          return await this.groqClient.handleAttendantRequest(messageText);
        }
        
        // Verifica se o candidato quer encerrar a conversa
        console.log(`🔍 Verificando se candidato ${phoneNumber} quer encerrar: "${messageText}"`);
        if (this.groqClient.wantsToEndConversation(messageText)) {
          console.log(`👤 Candidato ${phoneNumber} quer encerrar a conversa`);
          
          // Envia mensagem de encerramento
          const endMessage = await this.groqClient.handleEndConversation(messageText);
          await this.sendMessage(phoneNumber, endMessage);
          
          // Finaliza a conversa
          await this.finalizeConversation(phoneNumber);
          
          return null; // Não envia resposta adicional
        }
        
        return await this.groqClient.handleCandidateFlow(messageText, history);
      } else if (conversation.user_type === 'other') {
        // Cria notificação para outros assuntos
        try {
          await this.database.createNotification(
            'other',
            phoneNumber,
            '❓ Outros Assuntos',
            `Usuário solicitou informações sobre outros assuntos: "${messageText}"`
          );
          console.log(`📝 Notificação de outros assuntos criada: ${phoneNumber}`);
        } catch (error) {
          console.error('Erro ao criar notificação de outros assuntos:', error);
        }
        
        // Verifica se quer encerrar a conversa
        console.log(`🔍 Verificando se usuário ${phoneNumber} quer encerrar (outros): "${messageText}"`);
        if (this.groqClient.wantsToEndConversation(messageText)) {
          console.log(`❓ Usuário ${phoneNumber} quer encerrar a conversa (outros assuntos)`);
          
          // Envia mensagem de encerramento
          const endMessage = await this.groqClient.handleEndConversation(messageText);
          await this.sendMessage(phoneNumber, endMessage);
          
          // Finaliza a conversa
          await this.finalizeConversation(phoneNumber);
          
          return null; // Não envia resposta adicional
        }
        
        return await this.groqClient.handleOtherFlow(messageText, history);
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
        // Se a mensagem é "candidato" ou "empresa", usa diretamente
        let userType = 'unknown';
        if (message.toLowerCase().includes('candidato')) {
          userType = 'candidate';
        } else if (message.toLowerCase().includes('empresa')) {
          userType = 'company';
        }
        
        const conversationId = await this.database.createConversation(phoneNumber, userType);
        conversation = { id: conversationId, user_type: userType };
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

  async initialize() {
    try {
      console.log('🚀 Iniciando cliente WhatsApp (versão simplificada)...');
      console.log('⏳ Aguarde, isso pode levar alguns minutos...');
      
      await this.client.initialize();
      
    } catch (error) {
      console.error('Erro ao inicializar cliente WhatsApp:', error);
      
      // Tenta reinicializar se for erro de protocolo e ainda não excedeu tentativas
      if ((error.message.includes('Protocol error') || 
           error.message.includes('Execution context was destroyed') ||
           error.message.includes('Navigation timeout')) && 
          this.retryCount < this.maxRetries) {
        
        this.retryCount++;
        console.log(`🔄 Tentativa ${this.retryCount}/${this.maxRetries} - Reinicializando...`);
        
        // Aguarda um pouco antes de tentar novamente
        await new Promise(resolve => setTimeout(resolve, 5000));
        
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
      
      // Cria novo cliente com configurações ainda mais básicas
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
            '--no-default-browser-check',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--disable-field-trial-config',
            '--disable-ipc-flooding-protection',
            '--disable-background-networking',
            '--disable-breakpad',
            '--disable-component-extensions-with-background-pages',
            '--disable-features=TranslateUI,BlinkGenPropertyTrees',
            '--enable-features=NetworkService,NetworkServiceLogging',
            '--force-color-profile=srgb',
            '--metrics-recording-only',
            '--safebrowsing-disable-auto-update',
            '--ignore-certificate-errors',
            '--ignore-ssl-errors',
            '--ignore-certificate-errors-spki-list',
            '--allow-running-insecure-content',
            '--disable-features=TranslateUI',
            '--disable-component-extensions-with-background-pages',
            '--disable-extension-network-service',
            '--disable-features=NetworkService'
          ],
          timeout: 120000,
          protocolTimeout: 120000
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
      // Limpa todos os timeouts ativos
      for (const [phoneNumber, { timeoutId }] of this.activeConversations) {
        clearTimeout(timeoutId);
        console.log(`⏰ Timeout limpo para ${phoneNumber}`);
      }
      this.activeConversations.clear();
      
      // Limpa controle manual
      this.manualControl.clear();
      
      await this.client.destroy();
      this.database.close();
      console.log('Cliente WhatsApp destruído');
    } catch (error) {
      console.error('Erro ao destruir cliente:', error);
    }
  }

  async generateQRCode() {
    try {
      if (this.isConnected()) {
        console.log('📱 WhatsApp já está conectado');
        return null;
      }

      if (!this.client) {
        console.log('📱 Cliente WhatsApp não inicializado');
        return null;
      }

      // Verifica se há um QR Code disponível
      if (this.qrCode) {
        console.log('📱 QR Code já disponível');
        // Gera QR Code em base64
        const qrCodeBase64 = await qrcode.toDataURL(this.qrCode, {
          width: 300,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
        
        // Remove o prefixo data:image/png;base64, para retornar apenas o base64
        return qrCodeBase64.split(',')[1];
      }

      // Se não há QR Code disponível, tenta forçar uma nova geração
      console.log('📱 Forçando geração de novo QR Code...');
      
      // Limpa QR Code anterior
      this.qrCode = null;
      
      // Tenta reinicializar o cliente se necessário
      if (!this.client.pupPage) {
        console.log('📱 Reinicializando cliente WhatsApp...');
        await this.initialize();
      }
      
      // Aguarda até 10 segundos para o QR Code ser gerado
      let attempts = 0;
      const maxAttempts = 10;
      
      while (!this.qrCode && attempts < maxAttempts) {
        console.log(`📱 Tentativa ${attempts + 1}/${maxAttempts} - Aguardando QR Code...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }
      
      if (this.qrCode) {
        console.log('📱 QR Code gerado com sucesso!');
        // Gera QR Code em base64
        const qrCodeBase64 = await qrcode.toDataURL(this.qrCode, {
          width: 300,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
        
        // Remove o prefixo data:image/png;base64, para retornar apenas o base64
        return qrCodeBase64.split(',')[1];
      } else {
        console.log('📱 QR Code não disponível após tentativas');
        return null;
      }
    } catch (error) {
      console.error('❌ Erro ao gerar QR Code:', error);
      return null;
    }
  }

  isConnected() {
    return this.isReady;
  }

  // Método para forçar desconexão e gerar novo QR Code
  async forceDisconnect() {
    try {
      console.log('📱 Forçando desconexão do WhatsApp...');
      this.isReady = false;
      this.qrCode = null;
      
      if (this.client) {
        await this.client.destroy();
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
              '--no-default-browser-check',
              '--disable-web-security',
              '--disable-features=VizDisplayCompositor',
              '--disable-background-timer-throttling',
              '--disable-backgrounding-occluded-windows',
              '--disable-renderer-backgrounding',
              '--disable-field-trial-config',
              '--disable-ipc-flooding-protection',
              '--disable-background-networking',
              '--disable-breakpad',
              '--disable-component-extensions-with-background-pages',
              '--disable-features=TranslateUI,BlinkGenPropertyTrees',
              '--enable-features=NetworkService,NetworkServiceLogging',
              '--force-color-profile=srgb',
              '--metrics-recording-only',
              '--safebrowsing-disable-auto-update',
              '--ignore-certificate-errors',
              '--ignore-ssl-errors',
              '--ignore-certificate-errors-spki-list',
              '--allow-running-insecure-content',
              '--disable-features=TranslateUI',
              '--disable-component-extensions-with-background-pages',
              '--disable-extension-network-service',
              '--disable-features=NetworkService'
            ],
            timeout: 120000,
            protocolTimeout: 120000,
            executablePath: process.platform === 'win32' ? undefined : '/usr/bin/google-chrome-stable'
          }
        });
        
        this.setupEventHandlers();
        await this.client.initialize();
        
        console.log('📱 Cliente WhatsApp reinicializado');
        return true;
      }
    } catch (error) {
      console.error('❌ Erro ao forçar desconexão:', error);
      return false;
    }
  }

  // Método para obter estatísticas de conversas ativas
  getActiveConversationsStats() {
    try {
      const now = Date.now();
      const stats = {
        total: this.activeConversations ? this.activeConversations.size : 0,
        conversations: [],
        manualControl: {
          total: this.manualControl ? this.manualControl.size : 0,
          conversations: []
        }
      };

      if (!this.activeConversations) {
        console.warn('activeConversations não está inicializado');
        return stats;
      }

      for (const [phoneNumber, conversationData] of this.activeConversations) {
        try {
          const { lastActivity, isManualControl } = conversationData;
          const timeSinceLastActivity = now - lastActivity;
          const timeRemaining = this.timeoutDuration - timeSinceLastActivity;
          
          const conversationInfo = {
            phoneNumber,
            lastActivity: new Date(lastActivity).toISOString(),
            timeSinceLastActivity: Math.floor(timeSinceLastActivity / 1000),
            timeRemaining: Math.max(0, Math.floor(timeRemaining / 1000)),
            isManualControl: this.isUnderManualControl(phoneNumber) || isManualControl
          };

          if (this.isUnderManualControl(phoneNumber) || isManualControl) {
            const manualInfo = this.getManualControlInfo(phoneNumber);
            conversationInfo.manualControl = {
              agentId: manualInfo ? manualInfo.agentId : 'unknown',
              takenAt: manualInfo ? manualInfo.takenAt.toISOString() : new Date().toISOString()
            };
            stats.manualControl.conversations.push(conversationInfo);
          } else {
            stats.conversations.push(conversationInfo);
          }
        } catch (convError) {
          console.error(`Erro ao processar conversa ${phoneNumber}:`, convError);
          // Continua com a próxima conversa
        }
      }

      return stats;
    } catch (error) {
      console.error('Erro ao obter estatísticas de conversas:', error);
      return {
        total: 0,
        conversations: [],
        manualControl: {
          total: 0,
          conversations: []
        }
      };
    }
  }
}

module.exports = WhatsAppClientSimple;
