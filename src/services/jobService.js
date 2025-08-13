const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

class JobService {
  constructor() {
    this.jobs = [];
    this.csvPath = path.join(__dirname, '../data/jobs.csv');
    this.loadJobs();
  }

  loadJobs() {
    try {
      const results = [];
      fs.createReadStream(this.csvPath)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => {
          this.jobs = results;
          console.log(`✅ ${this.jobs.length} vagas carregadas do CSV`);
        });
    } catch (error) {
      console.error('❌ Erro ao carregar vagas do CSV:', error);
      this.jobs = [];
    }
  }

  getAllJobs() {
    return this.jobs;
  }

  // Função melhorada para encontrar vagas que correspondem ao perfil do candidato
  findMatchingJobs(candidateProfile, candidateMessage = '') {
    if (!candidateProfile || Object.keys(candidateProfile).length === 0) {
      return this.jobs.slice(0, 3); // Retorna as primeiras 3 vagas se não há perfil
    }

    const scoredJobs = this.jobs.map(job => {
      const score = this.calculateJobMatchScore(job, candidateProfile, candidateMessage);
      return { ...job, score };
    });

    // Verifica se o candidato mencionou ser motorista
    const isMotorista = this.isMotoristaCandidate(candidateProfile, candidateMessage);
    
    if (isMotorista) {
      // Se é motorista, prioriza vagas de motorista
      const motoristaJobs = scoredJobs.filter(job => 
        job.nome_vaga.toLowerCase().includes('motorista') || 
        job.descricao.toLowerCase().includes('motorista') ||
        job.descricao.toLowerCase().includes('cnh')
      );
      
      const otherJobs = scoredJobs.filter(job => 
        !job.nome_vaga.toLowerCase().includes('motorista') && 
        !job.descricao.toLowerCase().includes('motorista') &&
        !job.descricao.toLowerCase().includes('cnh')
      );

      // Ordena vagas de motorista por score e depois adiciona outras vagas
      const sortedMotoristaJobs = motoristaJobs
        .sort((a, b) => b.score - a.score)
        .slice(0, 3); // Máximo 3 vagas de motorista

      const sortedOtherJobs = otherJobs
        .filter(job => job.score > 0.3)
        .sort((a, b) => b.score - a.score)
        .slice(0, 2); // Máximo 2 outras vagas

      const finalJobs = [...sortedMotoristaJobs, ...sortedOtherJobs];
      
      console.log(`🎯 Motorista detectado! Vagas encontradas:`, finalJobs.map(j => `${j.nome_vaga}: ${(j.score * 100).toFixed(1)}%`));
      
      return finalJobs;
    }

    // Filtra vagas com score mínimo e ordena por relevância
    const matchingJobs = scoredJobs
      .filter(job => job.score > 0.3) // Score mínimo de 30%
      .sort((a, b) => b.score - a.score)
      .slice(0, 5); // Top 5 vagas

    console.log(`🎯 Vagas encontradas com scores:`, matchingJobs.map(j => `${j.nome_vaga}: ${(j.score * 100).toFixed(1)}%`));

    // Se não encontrou vagas adequadas, sugere alternativas
    if (matchingJobs.length === 0) {
      return this.suggestAlternativeJobs(candidateProfile, candidateMessage);
    }

    return matchingJobs;
  }

  // Sugere vagas alternativas quando não há matches perfeitos
  suggestAlternativeJobs(candidateProfile, candidateMessage = '') {
    console.log('🔍 Nenhuma vaga perfeita encontrada, sugerindo alternativas...');
    
    const message = candidateMessage.toLowerCase();
    const skills = (candidateProfile.skills || '').toLowerCase();
    const position = (candidateProfile.current_position || '').toLowerCase();
    const experience = (candidateProfile.experience || '').toLowerCase();

    // Mapeamento de profissões para vagas relacionadas
    const professionAlternatives = {
      'motorista': ['Auxiliar de Expedição', 'Assistente de Logística', 'Auxiliar de Produção/Expedição'],
      'mecânico': ['Vendedor de Peças', 'Auxiliar de Produção/Expedição', 'Assistente de Logística'],
      'vendedor': ['Assistente de Vendas', 'Atendimento ao Cliente', 'Consultor especialista B2B', 'Assistente Comercial'],
      'administrativo': ['Estagiário Administrativo', 'Assistente de Logística', 'Secretária'],
      'técnico': ['Técnico de Informática', 'Técnico em Segurança do Trabalho', 'Auxiliar de Produção/Expedição'],
      'logística': ['Auxiliar de Expedição', 'Assistente de Logística', 'Auxiliar de Produção/Expedição'],
      'segurança': ['Técnico em Segurança do Trabalho', 'Auxiliar de Produção/Expedição'],
      'estagiário': ['Estagiário Administrativo', 'Auxiliar de Expedição', 'Auxiliar de Produção/Expedição']
    };

    // Busca por profissões relacionadas
    let suggestedJobs = [];
    
    for (const [profession, alternatives] of Object.entries(professionAlternatives)) {
      if (message.includes(profession) || skills.includes(profession) || position.includes(profession) || experience.includes(profession)) {
        suggestedJobs = this.jobs.filter(job => alternatives.includes(job.nome_vaga));
        break;
      }
    }

    // Se não encontrou alternativas específicas, sugere vagas gerais
    if (suggestedJobs.length === 0) {
      suggestedJobs = this.jobs.filter(job => 
        job.nome_vaga.includes('Assistente') || 
        job.nome_vaga.includes('Auxiliar') ||
        job.nome_vaga.includes('Estagiário')
      );
    }

    // Adiciona scores e ordena
    const scoredSuggestions = suggestedJobs.map(job => ({
      ...job,
      score: 0.4, // Score padrão para sugestões
      isSuggestion: true
    }));

    console.log(`💡 Sugestões encontradas:`, scoredSuggestions.map(j => j.nome_vaga));
    
    return scoredSuggestions.slice(0, 3);
  }

  // Calcula score de compatibilidade entre vaga e candidato
  calculateJobMatchScore(job, candidateProfile, candidateMessage = '') {
    let score = 0;
    const totalWeight = 100;

    // Se não há perfil do candidato, usa apenas análise da mensagem
    if (!candidateProfile || Object.keys(candidateProfile).length === 0) {
      if (candidateMessage) {
        const messageScore = this.analyzeMessageRelevance(candidateMessage, job);
        score += messageScore * 100; // Usa 100% do peso na mensagem
      }
      return score / totalWeight;
    }

    // 1. Senioridade (peso: 25)
    if (candidateProfile.experience && job.senioridade) {
      const seniorityScore = this.matchSeniority(candidateProfile.experience, job.senioridade);
      score += seniorityScore * 25;
    }

    // 2. Localização (peso: 20)
    if (candidateProfile.location && job.localizacao) {
      const locationScore = this.matchLocation(candidateProfile.location, job.localizacao);
      score += locationScore * 20;
    }

    // 3. Habilidades (peso: 35)
    if (candidateProfile.skills && job.descricao) {
      const skillsScore = this.matchSkills(candidateProfile.skills, job.descricao);
      score += skillsScore * 35;
    }

    // 4. Análise semântica da mensagem (peso: 20)
    if (candidateMessage) {
      const messageScore = this.analyzeMessageRelevance(candidateMessage, job);
      score += messageScore * 20;
    }

    // Garante que o score não seja NaN
    if (isNaN(score)) {
      score = 0;
    }

    return score / totalWeight; // Retorna score entre 0 e 1
  }

  // Compara senioridade do candidato com a vaga
  matchSeniority(candidateExp, jobSeniority) {
    const candidateLevel = this.extractSeniorityLevel(candidateExp);
    const jobLevel = jobSeniority.toLowerCase();

    // Mapeamento de níveis
    const levels = {
      'estágio': 1,
      'júnior': 2,
      'pleno': 3,
      'sênior': 4
    };

    const candidateScore = levels[candidateLevel] || 2;
    const jobScore = levels[jobLevel] || 2;

    // Candidato pode se candidatar para nível igual ou um nível acima
    if (candidateScore >= jobScore && candidateScore <= jobScore + 1) {
      return 1.0; // Perfeito
    } else if (candidateScore >= jobScore - 1 && candidateScore <= jobScore + 2) {
      return 0.7; // Bom
    } else {
      return 0.3; // Baixo
    }
  }

  // Extrai nível de senioridade da experiência
  extractSeniorityLevel(experience) {
    const exp = experience.toLowerCase();
    
    if (exp.includes('estágio') || exp.includes('estagiário')) return 'estágio';
    if (exp.includes('júnior') || exp.includes('junior') || exp.includes('iniciante')) return 'júnior';
    if (exp.includes('pleno') || exp.includes('intermediário')) return 'pleno';
    if (exp.includes('sênior') || exp.includes('senior') || exp.includes('experiente')) return 'sênior';
    
    // Tenta extrair anos de experiência
    const yearsMatch = exp.match(/(\d+)\s*(anos?|anos)/);
    if (yearsMatch) {
      const years = parseInt(yearsMatch[1]);
      if (years <= 1) return 'júnior';
      if (years <= 3) return 'pleno';
      return 'sênior';
    }

    return 'pleno'; // Default
  }

  // Compara localização
  matchLocation(candidateLocation, jobLocation) {
    const candidate = candidateLocation.toLowerCase();
    const job = jobLocation.toLowerCase();

    // Se a vaga é remota, sempre compatível
    if (job.includes('remoto') || job.includes('home office')) {
      return 1.0;
    }

    // Busca por cidades específicas
    const cities = ['lajeado', 'estrela', 'arroio do meio', 'venâncio aires'];
    const candidateCity = cities.find(city => candidate.includes(city));
    const jobCity = cities.find(city => job.includes(city));

    if (candidateCity && jobCity) {
      return candidateCity === jobCity ? 1.0 : 0.5; // Mesma cidade ou cidade próxima
    }

    // Se não encontrou cidade específica, assume compatibilidade média
    return 0.6;
  }

  // Compara habilidades com melhor reconhecimento de sinônimos
  matchSkills(candidateSkills, jobDescription) {
    const skills = candidateSkills.toLowerCase().split(',').map(s => s.trim());
    const description = jobDescription.toLowerCase();
    
    // Mapeamento de habilidades relacionadas
    const skillSynonyms = {
      'cnh': ['cnh', 'carteira de motorista', 'carteira nacional de habilitação', 'habilitação', 'habilitacao'],
      'caminhão': ['caminhão', 'caminhao', 'truck', 'veículo pesado', 'veiculo pesado'],
      'vendas': ['vendas', 'vender', 'comercial', 'atendimento', 'prospecção', 'prospecção de clientes'],
      'excel': ['excel', 'planilhas', 'microsoft excel'],
      'word': ['word', 'microsoft word', 'processador de texto'],
      'javascript': ['javascript', 'js', 'node.js', 'nodejs'],
      'react': ['react', 'react.js', 'reactjs'],
      'node.js': ['node.js', 'nodejs', 'node'],
      'administração': ['administração', 'administracao', 'administrativo', 'gestão', 'gestao'],
      'logística': ['logística', 'logistica', 'expedição', 'expedicao', 'estoque'],
      'mecânica': ['mecânica', 'mecanica', 'mecânico', 'mecanico', 'manutenção', 'manutencao'],
      'segurança': ['segurança', 'seguranca', 'prevenção', 'prevencao'],
      'atendimento': ['atendimento', 'atender', 'cliente', 'clientes', 'suporte'],
      'carros': ['carros', 'automóveis', 'automoveis', 'veículos', 'veiculos', 'mecânica', 'mecanica'],
      'motorista': ['motorista', 'dirigir', 'cnh', 'caminhão', 'caminhao', 'veículo', 'veiculo'],
      'produção': ['produção', 'producao', 'produzir', 'fabricação', 'fabricacao'],
      'expedição': ['expedição', 'expedicao', 'estoque', 'logística', 'logistica'],
      'ti': ['ti', 'tecnologia da informação', 'informática', 'informatica', 'computador', 'sistema'],
      'informática': ['informática', 'informatica', 'ti', 'computador', 'sistema', 'suporte']
    };

    let matchedSkills = 0;
    const totalSkills = skills.length;

    skills.forEach(skill => {
      // Verifica match direto
      if (description.includes(skill)) {
        matchedSkills++;
        return;
      }

      // Verifica sinônimos
      for (const [category, synonyms] of Object.entries(skillSynonyms)) {
        if (skill.includes(category) || synonyms.some(syn => skill.includes(syn))) {
          // Verifica se algum sinônimo está na descrição
          if (synonyms.some(syn => description.includes(syn))) {
            matchedSkills++;
            return;
          }
        }
      }

      // Verifica palavras-chave relacionadas na descrição
      const relatedKeywords = this.getRelatedKeywords(skill);
      if (relatedKeywords.some(keyword => description.includes(keyword))) {
        matchedSkills++;
        return;
      }
    });

    return totalSkills > 0 ? matchedSkills / totalSkills : 0.5;
  }

  // Retorna palavras-chave relacionadas a uma habilidade
  getRelatedKeywords(skill) {
    const keywordMap = {
      'motorista': ['dirigir', 'cnh', 'caminhão', 'caminhao', 'veículo', 'veiculo', 'transporte', 'entrega', 'coleta'],
      'mecânico': ['manutenção', 'manutencao', 'reparo', 'carros', 'automóveis', 'automoveis', 'veículos', 'veiculos'],
      'vendas': ['comercial', 'atendimento', 'cliente', 'clientes', 'prospecção', 'prospecção de clientes', 'negociação', 'negociacao'],
      'administrativo': ['administração', 'administracao', 'gestão', 'gestao', 'organização', 'organizacao', 'controle'],
      'ti': ['informática', 'informatica', 'computador', 'sistema', 'suporte', 'tecnologia', 'programação', 'programacao'],
      'logística': ['expedição', 'expedicao', 'estoque', 'armazenagem', 'distribuição', 'distribuicao', 'transporte'],
      'produção': ['fabricação', 'fabricacao', 'produzir', 'manufatura', 'operar', 'equipamentos'],
      'segurança': ['prevenção', 'prevencao', 'proteção', 'protecao', 'riscos', 'acidentes', 'trabalho']
    };

    return keywordMap[skill] || [];
  }

  // Analisa relevância da mensagem do candidato com a vaga
  analyzeMessageRelevance(candidateMessage, job) {
    const message = candidateMessage.toLowerCase();
    const jobTitle = job.nome_vaga.toLowerCase();
    const jobDesc = job.descricao.toLowerCase();

    let relevance = 0;

    // Mapeamento de sinônimos e termos relacionados
    const synonyms = {
      'motorista': ['motorista', 'motorista de caminhão', 'motorista de carro', 'motorista de van', 'motorista de ônibus', 'motorista de entrega', 'motorista de coleta', 'cnh', 'cnh c', 'cnh d', 'cnh e'],
      'mecânico': ['mecânico', 'mecanico', 'mecânica', 'mecanica', 'manutenção de veículos', 'manutencao de veiculos', 'reparo de veículos', 'reparo de veiculos'],
      'vendedor': ['vendedor', 'vendedora', 'vendas', 'comercial', 'atendimento', 'prospecção', 'prospecção de clientes'],
      'administrativo': ['administrativo', 'administração', 'administracao', 'secretária', 'secretaria', 'assistente administrativo', 'auxiliar administrativo'],
      'técnico': ['técnico', 'tecnico', 'técnica', 'tecnica', 'suporte técnico', 'suporte tecnico', 'manutenção', 'manutencao'],
      'logística': ['logística', 'logistica', 'expedição', 'expedicao', 'estoque', 'armazenagem', 'distribuição', 'distribuicao'],
      'segurança': ['segurança', 'seguranca', 'segurança do trabalho', 'seguranca do trabalho', 'prevenção', 'prevencao'],
      'estagiário': ['estagiário', 'estagiario', 'estágio', 'estagio', 'estudante', 'universitário', 'universitario']
    };

    // Verifica se a mensagem menciona o cargo diretamente
    if (message.includes(jobTitle.split(' ')[0]) || message.includes(jobTitle.split(' ')[1])) {
      relevance += 0.4;
    }

    // Verifica sinônimos para o cargo
    for (const [category, terms] of Object.entries(synonyms)) {
      if (jobTitle.includes(category) || jobDesc.includes(category)) {
        for (const term of terms) {
          if (message.includes(term)) {
            relevance += 0.5; // Match forte com sinônimo
            break;
          }
        }
      }
    }

    // Verifica palavras-chave específicas da descrição na mensagem
    const keywords = jobDesc.split(' ').filter(word => word.length > 3);
    const messageWords = message.split(' ');
    
    const commonWords = keywords.filter(keyword => 
      messageWords.some(word => word.includes(keyword) || keyword.includes(word))
    );

    relevance += (commonWords.length / Math.max(keywords.length, 1)) * 0.3;

    return Math.min(relevance, 1.0);
  }

  // Funções auxiliares mantidas para compatibilidade
  getJobsBySeniority(seniority) {
    return this.jobs.filter(job => 
      job.senioridade.toLowerCase() === seniority.toLowerCase()
    );
  }

  getJobsByLocation(location) {
    return this.jobs.filter(job => 
      job.localizacao.toLowerCase().includes(location.toLowerCase()) ||
      job.localizacao.toLowerCase() === 'remoto'
    );
  }

  getJobsBySkills(skills) {
    const skillsArray = skills.toLowerCase().split(',').map(s => s.trim());
    return this.jobs.filter(job => {
      const jobDescription = job.descricao.toLowerCase();
      return skillsArray.some(skill => jobDescription.includes(skill));
    });
  }

  formatJobForDisplay(job) {
    const score = job.score ? ` (${(job.score * 100).toFixed(0)}% compatível)` : '';
    const suggestionTag = job.isSuggestion ? '💡 *SUGESTÃO* ' : '';
    return `${suggestionTag}🏢 *${job.nome_vaga}*${score}
📊 Senioridade: ${job.senioridade}
📍 Localização: ${job.localizacao}
📝 Descrição: ${job.descricao}`;
  }

  formatJobsList(jobs) {
    if (jobs.length === 0) {
      return "Nenhuma vaga encontrada que corresponda ao seu perfil no momento.";
    }

    // Verifica se são sugestões
    const hasSuggestions = jobs.some(job => job.isSuggestion);
    
    let message = '';
    if (hasSuggestions) {
      message = `💡 *Sugestões de vagas relacionadas ao seu perfil:*\n\n`;
    } else {
      message = `🎯 *Vagas encontradas para você:*\n\n`;
    }
    
    jobs.forEach((job, index) => {
      message += `${index + 1}. ${this.formatJobForDisplay(job)}\n\n`;
    });

    if (hasSuggestions) {
      message += `💡 *Estas são sugestões baseadas no seu perfil. Se nenhuma te interessar, me conte mais sobre suas preferências!*\n\n`;
    }

    message += `📋 Para se candidatar, acesse: https://app.pipefy.com/public/form/a19wdDh_`;
    
    return message;
  }

  // Verifica se o candidato é motorista
  isMotoristaCandidate(candidateProfile, candidateMessage = '') {
    const message = candidateMessage.toLowerCase();
    const skills = (candidateProfile.skills || '').toLowerCase();
    const position = (candidateProfile.current_position || '').toLowerCase();
    const experience = (candidateProfile.experience || '').toLowerCase();

    const motoristaKeywords = [
      'motorista', 'motorista de caminhão', 'motorista de carro', 'motorista de van',
      'motorista de ônibus', 'motorista de entrega', 'motorista de coleta',
      'cnh', 'cnh c', 'cnh d', 'cnh e', 'carteira de motorista',
      'carteira nacional de habilitação', 'habilitação', 'habilitacao'
    ];

    // Verifica na mensagem
    if (motoristaKeywords.some(keyword => message.includes(keyword))) {
      return true;
    }

    // Verifica nas habilidades
    if (motoristaKeywords.some(keyword => skills.includes(keyword))) {
      return true;
    }

    // Verifica no cargo atual
    if (motoristaKeywords.some(keyword => position.includes(keyword))) {
      return true;
    }

    // Verifica na experiência
    if (motoristaKeywords.some(keyword => experience.includes(keyword))) {
      return true;
    }

    return false;
  }
}

module.exports = JobService;
