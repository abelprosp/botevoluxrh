const Groq = require('groq-sdk');
const config = require('../config/config');
const JobService = require('../services/jobService');
const BusinessHoursService = require('../services/businessHoursService');

class GroqClient {
  constructor() {
    this.groq = new Groq({
      apiKey: config.groq.apiKey,
    });
    this.model = config.groq.model;
    this.jobService = new JobService();
    this.businessHoursService = new BusinessHoursService();
  }

  async generateResponse(messages, context = {}) {
    try {
      const systemPrompt = this.buildSystemPrompt(context);
      
      const chatMessages = [
        { role: 'system', content: systemPrompt },
        ...messages
      ];

      const completion = await this.groq.chat.completions.create({
        messages: chatMessages,
        model: this.model,
        temperature: 0.8, // Aumentado para respostas mais naturais
        max_tokens: 1000,
        top_p: 1,
        stream: false,
      });

      return completion.choices[0]?.message?.content || 'Desculpe, não consegui processar sua mensagem.';
    } catch (error) {
      console.error('Erro na Groq API:', error);
      return 'Desculpe, estou enfrentando dificuldades técnicas. Tente novamente em alguns instantes.';
    }
  }

  buildSystemPrompt(context) {
    const company = config.company;
    
    return `Você é um assistente virtual especializado em recrutamento e seleção da ${company.name}.

${company.description}

SEU PERSONALIDADE E ESTILO:
- Seja natural, caloroso e empático
- Use linguagem conversacional, não robótica
- Demonstre interesse genuíno pelo candidato/empresa
- Faça perguntas de acompanhamento quando apropriado
- Use emojis moderadamente para tornar a conversa mais amigável
- Adapte seu tom baseado no contexto da conversa
- Seja proativo em oferecer ajuda adicional

SUAS FUNÇÕES PRINCIPAIS:

1. PARA EMPRESAS (que querem contratar a Evolux):
- Verificar se está no horário comercial (8h-12h e 13h30-18h, Segunda a Sexta)
- Se fora do horário: informar de forma cordial que retornaremos o contato
- Se no horário: pedir para aguardar um atendente humano de forma acolhedora
- NÃO processar informações de vagas para empresas

2. PARA CANDIDATOS (que querem se candidatar):
- Coletar informações de forma conversacional e natural
- Fazer perguntas de acompanhamento baseadas nas respostas
- Buscar vagas adequadas usando análise inteligente
- Explicar por que as vagas são adequadas para o perfil
- Oferecer dicas e orientações quando apropriado
- Fornecer link de cadastro: https://app.pipefy.com/public/form/a19wdDh_

DIRETRIZES DE CONVERSA:
- SEMPRE pergunte primeiro se é empresa ou candidato de forma natural
- Para empresas: verificar horário comercial ANTES de qualquer processamento
- Para candidatos: coletar informações de forma fluida e conversacional
- Use o nome da pessoa quando disponível
- Faça referência a informações mencionadas anteriormente
- Ofereça ajuda adicional quando apropriado
- Seja paciente e compreensivo

CONTEXTO ATUAL:
- Tipo de usuário: ${context.userType || 'não identificado'}
- Horário comercial: ${this.businessHoursService.isBusinessHours() ? 'Sim' : 'Não'}
- Vagas disponíveis: ${this.jobService.getAllJobs().length}

INFORMAÇÕES DA EMPRESA:
- Nome: ${company.name}
- Website: ${company.website}
- Email: ${company.email}

Responda sempre em português brasileiro de forma natural, calorosa e profissional. Seja você mesmo - um assistente amigável e útil!`;
  }

  async classifyUserType(message) {
    const prompt = `
    Analise a seguinte mensagem e classifique o tipo de usuário:
    
    MENSAGEM: "${message}"
    
    CLASSIFICAÇÕES POSSÍVEIS:
    - "company": Se a pessoa menciona que é empresa, quer contratar a Evolux, precisa de serviços de RH, representa uma empresa, quer contratar serviços de recrutamento
    - "candidate": Se a pessoa está procurando emprego, quer se candidatar, tem interesse em vagas, quer trabalhar, está desempregado, quer uma vaga
    - "other": Se a pessoa menciona "outros", "outras dúvidas", "outros assuntos", "dúvidas", "perguntas", "informações", "ajuda", ou qualquer assunto não relacionado a contratação de serviços ou busca de emprego
    
    PALAVRAS-CHAVE PARA EMPRESA:
    - empresa, contratar, serviços, RH, recrutamento, seleção, funcionários, colaboradores, vagas para contratar
    
    PALAVRAS-CHAVE PARA CANDIDATO:
    - emprego, vaga, candidatar, trabalhar, experiência, currículo, desempregado, oportunidade
    
    PALAVRAS-CHAVE PARA OUTROS ASSUNTOS:
    - outros, outras dúvidas, outros assuntos, dúvidas, perguntas, informações, ajuda, consulta, esclarecimento
    
    Responda apenas com "company", "candidate" ou "other".
    `;

    try {
      const response = await this.groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: this.model,
        temperature: 0.1,
        max_tokens: 10,
      });

      const classification = response.choices[0]?.message?.content?.toLowerCase().trim();
      console.log(`🔍 Classificação: "${message}" -> ${classification}`);
      
      if (classification === 'company') return 'company';
      if (classification === 'other') return 'other';
      return 'candidate'; // Default
    } catch (error) {
      console.error('Erro na classificação:', error);
      return 'candidate'; // Default
    }
  }

  async extractCandidateInfo(message) {
    const prompt = `
    Extraia informações profissionais da seguinte mensagem de forma inteligente:
    
    MENSAGEM: "${message}"
    
    IMPORTANTE: Responda APENAS com um JSON válido, sem texto adicional.
    
    Retorne um JSON com as seguintes informações (se mencionadas):
    {
      "name": "nome da pessoa",
      "experience": "anos de experiência ou nível (júnior, pleno, sênior)",
      "skills": "habilidades mencionadas (separadas por vírgula)",
      "location": "localização ou cidade",
      "current_position": "cargo atual",
      "desired_salary": "pretensão salarial",
      "interests": "áreas de interesse ou preferências mencionadas"
    }
    
    Se alguma informação não for mencionada, use null.
    Seja inteligente na interpretação - por exemplo, se alguém diz "trabalho com vendas", extraia "vendas" como habilidade.
    Se alguém diz "sou motorista", extraia "motorista" como habilidade e cargo atual.
    `;

    try {
      const response = await this.groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: this.model,
        temperature: 0.1,
        max_tokens: 200,
      });

      const content = response.choices[0]?.message?.content;
      
      // Tenta extrair JSON do conteúdo
      let jsonContent = content;
      
      // Se o conteúdo não é JSON válido, tenta extrair
      if (!content.trim().startsWith('{')) {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          jsonContent = jsonMatch[0];
        }
      }
      
      const result = JSON.parse(jsonContent);
      console.log('📋 Informações extraídas com sucesso:', result);
      return result;
    } catch (error) {
      console.error('Erro na extração de informações:', error);
      console.log('Conteúdo recebido:', response?.choices[0]?.message?.content);
      
      // Retorna objeto vazio em caso de erro
      return {
        name: null,
        experience: null,
        skills: null,
        location: null,
        current_position: null,
        desired_salary: null,
        interests: null
      };
    }
  }

  async handleCompanyFlow(message) {
    // Verifica se está no horário comercial
    if (!this.businessHoursService.isBusinessHours()) {
      console.log('🏢 Empresa contactou fora do horário comercial');
      return this.businessHoursService.getOutOfHoursMessage();
    }

    // Se está no horário comercial, pede para aguardar atendente
    console.log('🏢 Empresa contactou no horário comercial - transferindo para humano');
    return `Olá! 👋

Obrigado pelo seu contato com a ${config.company.name}! 

📞 Um de nossos especialistas em recrutamento e seleção irá atendê-lo em breve.

⏰ Por favor, aguarde um momento enquanto transferimos você para um atendente humano.

Enquanto isso, você pode conhecer mais sobre nossos serviços em: ${config.company.website}

Obrigado pela paciência! 🙏`;
  }

  async handleCandidateFlow(message, conversationHistory = []) {
    // Se é a primeira mensagem do candidato ou ainda não forneceu informações
    if (conversationHistory.length <= 1) {
      return `Olá! 👋

Sou o assistente virtual da ${config.company.name} e vou te ajudar a encontrar as melhores oportunidades!

🎯 Para encontrar vagas que realmente combinem com você, preciso conhecer um pouco mais sobre seu perfil.

📝 Pode me contar sobre:
• Seu nome
• Sua experiência profissional (anos ou nível: júnior, pleno, sênior)
• Suas principais habilidades
• Onde você gostaria de trabalhar
• Seu cargo atual (se aplicável)

Exemplo: "Me chamo João, tenho 3 anos de experiência como desenvolvedor, trabalho com JavaScript, React e Node.js, moro em São Paulo e sou desenvolvedor pleno."

Vamos começar? 😊`;
    }

    // Analisa o contexto da mensagem para entender a intenção
    const messageLower = message.toLowerCase();
    const isNegativeResponse = this.isNegativeResponse(messageLower);
    const isAskingForMore = this.isAskingForMore(messageLower);
    const isAskingForDifferent = this.isAskingForDifferent(messageLower);
    const wantsToTalkToAttendant = this.wantsToTalkToAttendant(messageLower);

    // Se é uma resposta negativa sobre as vagas mostradas
    if (isNegativeResponse) {
      return `Entendo! 😊

Não se preocupe, posso te ajudar a encontrar outras opções.

🤔 Me conte um pouco mais sobre o que você está procurando:
• Que tipo de trabalho você gostaria?
• Tem alguma preferência de localização?
• Qual sua experiência profissional?
• Que habilidades você tem?

Assim posso te mostrar vagas mais adequadas ao seu perfil! 🎯`;
    }

    // Se está pedindo mais vagas ou opções diferentes
    if (isAskingForMore || isAskingForDifferent) {
      return `Claro! 😊

Vou buscar mais opções para você.

🔍 Pode me dar mais detalhes sobre:
• Que tipo de trabalho você prefere?
• Qual sua experiência?
• Onde você gostaria de trabalhar?
• Que habilidades você tem?

Assim posso encontrar vagas que realmente combinem com você! 🎯`;
    }

    // Se quer falar com atendente
    if (wantsToTalkToAttendant) {
      return `Olá! 👋

Obrigado por entrar em contato com a ${config.company.name}!

📞 Um de nossos especialistas em recrutamento e seleção irá atendê-lo em breve.

⏰ Por favor, aguarde um momento enquanto transferimos você para um atendente humano.

Enquanto isso, você pode conhecer mais sobre nossos serviços em: ${config.company.website}

Obrigado pela paciência! 🙏`;
    }

    // Extrai informações do candidato
    const candidateInfo = await this.extractCandidateInfo(message);
    console.log('📋 Informações extraídas do candidato:', candidateInfo);
    
    // Busca vagas que correspondam ao perfil
    const matchingJobs = this.jobService.findMatchingJobs(candidateInfo, message);
    console.log(`🎯 Encontradas ${matchingJobs.length} vagas para o perfil`);
    
    // Formata a resposta com as vagas encontradas
    const jobsMessage = this.jobService.formatJobsList(matchingJobs);
    
    // Adiciona uma mensagem personalizada baseada no perfil
    let personalizedMessage = '';
    if (candidateInfo.name) {
      personalizedMessage = `\n\nOlá ${candidateInfo.name}! 😊 `;
    } else {
      personalizedMessage = '\n\nPerfeito! ';
    }
    
    if (matchingJobs.length > 0) {
      const topJob = matchingJobs[0];
      if (topJob.score > 0.7) {
        personalizedMessage += `Encontrei algumas vagas que combinam muito com seu perfil! A vaga de ${topJob.nome_vaga} parece ser especialmente adequada para você. `;
      } else {
        personalizedMessage += `Encontrei algumas oportunidades interessantes! `;
      }
    } else {
      personalizedMessage += `Vou continuar buscando oportunidades que combinem com seu perfil. `;
    }
    
    personalizedMessage += `\n\n💡 Se essas vagas não forem exatamente o que você está procurando, me conte mais sobre suas preferências e posso buscar outras opções!\n\n📝 Para se candidatar, acesse: ${config.company.registrationLink}`;
    
    return jobsMessage + personalizedMessage;
  }

  async handleOtherFlow(message, conversationHistory = []) {
    // Para outros assuntos, funciona como empresas - transfere para atendente humano
    console.log('❓ Outros assuntos - transferindo para atendente humano');
    
    return `Olá! 👋

Obrigado pelo seu contato com a ${config.company.name}! 

📞 Um de nossos especialistas irá atendê-lo em breve.

⏰ Por favor, aguarde um momento enquanto transferimos você para um atendente humano.

Enquanto isso, você pode conhecer mais sobre nossos serviços em: ${config.company.website}

Obrigado pela paciência! 🙏`;
  }

  async handleAttendantRequest(message) {
    return `Olá! 👋

Obrigado por entrar em contato com a ${config.company.name}!

📞 Um de nossos especialistas em recrutamento e seleção irá atendê-lo em breve.

⏰ Por favor, aguarde um momento enquanto transferimos você para um atendente humano.

Enquanto isso, você pode conhecer mais sobre nossos serviços em: ${config.company.website}

Obrigado pela paciência! 🙏`;
  }

  async handleEndConversation(message) {
    return `✅ *Atendimento Finalizado*

Obrigado por escolher a ${config.company.name}!

Foi um prazer atendê-lo! 🙏

Se precisar de mais informações no futuro, sinta-se à vontade para enviar uma nova mensagem a qualquer momento.

📞 Nossos canais de contato:
• Website: ${config.company.website}
• Email: ${config.company.email}

Tenha um excelente dia! 😊

---
*Atendimento finalizado pelo usuário em ${new Date().toLocaleString('pt-BR')}*`;
  }

  // Verifica se é uma resposta negativa
  isNegativeResponse(message) {
    const negativeKeywords = [
      'não quero', 'não gosto', 'não me interessa', 'não serve', 'não combina',
      'não é isso', 'não é o que procuro', 'não é adequado', 'não é ideal',
      'não atende', 'não satisfaz', 'não é o que preciso', 'não é o que busco'
    ];
    return negativeKeywords.some(keyword => message.includes(keyword));
  }

  // Verifica se está pedindo mais vagas
  isAskingForMore(message) {
    const moreKeywords = [
      'mais vagas', 'outras vagas', 'mais opções', 'outras opções', 'mais oportunidades',
      'tem mais', 'tem outras', 'mostre mais', 'outras possibilidades', 'mais alternativas'
    ];
    return moreKeywords.some(keyword => message.includes(keyword));
  }

  // Verifica se está pedindo vagas diferentes
  isAskingForDifferent(message) {
    const differentKeywords = [
      'diferente', 'outro tipo', 'outra área', 'outro setor', 'outro ramo',
      'algo diferente', 'outro tipo de trabalho', 'outra área de atuação'
    ];
    return differentKeywords.some(keyword => message.includes(keyword));
  }

  // Verifica se quer falar com atendente
  wantsToTalkToAttendant(message) {
    const messageLower = message.toLowerCase();
    const attendantKeywords = [
      'quero conversar com uma atendente',
      'quero falar com uma atendente',
      'preciso conversar com uma atendente',
      'preciso falar com uma atendente',
      'quero falar com alguém',
      'quero conversar com alguém',
      'preciso falar com alguém',
      'preciso conversar com alguém',
      'atendimento humano',
      'atendimento pessoal',
      'falar com uma pessoa',
      'conversar com uma pessoa',
      'atendimento direto',
      'falar diretamente',
      'conversar diretamente'
    ];
    
    return attendantKeywords.some(keyword => messageLower.includes(keyword));
  }

  wantsToEndConversation(message) {
    const messageLower = message.toLowerCase();
    const endKeywords = [
      'encerrar',
      'finalizar',
      'terminar',
      'acabar',
      'fim',
      'sair',
      'sair do chat',
      'sair da conversa',
      'sair do atendimento',
      'encerrar chat',
      'encerrar conversa',
      'encerrar atendimento',
      'finalizar chat',
      'finalizar conversa',
      'finalizar atendimento',
      'terminar chat',
      'terminar conversa',
      'terminar atendimento',
      'tchau',
      'adeus',
      'até logo',
      'até mais',
      'obrigado',
      'obrigada',
      'valeu',
      'ok',
      'okay',
      'beleza',
      'blz',
      'entendi',
      'compreendi',
      'perfeito',
      'ótimo',
      'excelente',
      'muito bem',
      'tudo bem',
      'td bem',
      'tudo certo',
      'certo',
      'sim',
      'claro',
      'entendido',
      'combinado'
    ];
    
    return endKeywords.some(keyword => messageLower.includes(keyword));
  }

  async getInitialMessage() {
    return `Olá! 👋 Bem-vindo à ${config.company.name}!

Sou o assistente virtual da Evolux Soluções de RH e estou aqui para ajudá-lo!

🤔 Como posso ajudá-lo hoje?

*Digite "empresa" se você representa uma empresa interessada em nossos serviços de RH*

*Digite "candidato" se você está procurando oportunidades de emprego*

*Digite "outros" se você tem outras dúvidas ou assuntos para conversar*

Escolha uma das opções acima e eu direcionarei você da melhor forma! 😊`;
  }
}

module.exports = GroqClient;
