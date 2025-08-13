const { createClient } = require('@supabase/supabase-js');
const config = require('../config/config');

class JobService {
  constructor() {
    this.supabase = createClient(config.supabase.url, config.supabase.key);
    this.jobs = [];
    this.lastFetch = null;
    this.cacheDuration = 5 * 60 * 1000; // 5 minutos
  }

  async loadJobs() {
    try {
      console.log('🔄 Carregando vagas do Supabase...');
      
      const { data, error } = await this.supabase
        .from('jobs')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Erro ao carregar vagas do Supabase:', error);
        return [];
      }

      this.jobs = data || [];
      this.lastFetch = Date.now();
      
      console.log(`✅ ${this.jobs.length} vagas carregadas do Supabase`);
      return this.jobs;
    } catch (error) {
      console.error('❌ Erro ao conectar com Supabase:', error);
      return [];
    }
  }

  async getAllJobs() {
    // Verifica se precisa atualizar o cache
    if (!this.lastFetch || (Date.now() - this.lastFetch) > this.cacheDuration) {
      await this.loadJobs();
    }
    return this.jobs;
  }

  // Função melhorada para encontrar vagas que correspondem ao perfil do candidato
  async findMatchingJobs(candidateProfile, candidateMessage = '') {
    try {
      const jobs = await this.getAllJobs();
      
      if (!jobs || jobs.length === 0) {
        console.log('⚠️ Nenhuma vaga encontrada no Supabase');
        return [];
      }

      if (!candidateProfile || Object.keys(candidateProfile).length === 0) {
        return jobs.slice(0, 3); // Retorna as primeiras 3 vagas se não há perfil
      }

      const scoredJobs = jobs.map(job => {
        const score = this.calculateJobMatchScore(job, candidateProfile, candidateMessage);
        return { ...job, score };
      });

      // Verifica se o candidato mencionou ser motorista
      const isMotorista = this.isMotoristaCandidate(candidateProfile, candidateMessage);
      
      if (isMotorista) {
        // Se é motorista, prioriza vagas de motorista
        const motoristaJobs = scoredJobs.filter(job => 
          job.title.toLowerCase().includes('motorista') || 
          job.description.toLowerCase().includes('motorista') ||
          job.description.toLowerCase().includes('cnh') ||
          job.area.toLowerCase().includes('logística') ||
          job.area.toLowerCase().includes('transporte')
        );
        
        const otherJobs = scoredJobs.filter(job => 
          !job.title.toLowerCase().includes('motorista') && 
          !job.description.toLowerCase().includes('motorista') &&
          !job.description.toLowerCase().includes('cnh') &&
          !job.area.toLowerCase().includes('logística') &&
          !job.area.toLowerCase().includes('transporte')
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
        
        console.log(`🎯 Motorista detectado! Vagas encontradas:`, finalJobs.map(j => `${j.title}: ${(j.score * 100).toFixed(1)}%`));
        
        return finalJobs;
      }

      // Filtra vagas com score mínimo e ordena por relevância
      const matchingJobs = scoredJobs
        .filter(job => job.score > 0.3) // Score mínimo de 30%
        .sort((a, b) => b.score - a.score)
        .slice(0, 5); // Top 5 vagas

      console.log(`🎯 Vagas encontradas com scores:`, matchingJobs.map(j => `${j.title}: ${(j.score * 100).toFixed(1)}%`));

      // Se não encontrou vagas adequadas, sugere alternativas
      if (matchingJobs.length === 0) {
        return this.suggestAlternativeJobs(candidateProfile, candidateMessage);
      }

      return matchingJobs;
    } catch (error) {
      console.error('❌ Erro ao buscar vagas:', error);
      return [];
    }
  }

  // Calcula o score de compatibilidade entre vaga e candidato
  calculateJobMatchScore(job, candidateProfile, candidateMessage = '') {
    let score = 0;
    const message = candidateMessage.toLowerCase();
    const skills = (candidateProfile.skills || '').toLowerCase();
    const position = (candidateProfile.current_position || '').toLowerCase();
    const experience = (candidateProfile.experience || '').toLowerCase();
    const location = (candidateProfile.location || '').toLowerCase();

    // Score por nível (júnior, pleno, sênior)
    if (job.level && experience) {
      if (job.level.toLowerCase() === 'júnior' && (experience.includes('júnior') || experience.includes('iniciante') || experience.includes('estagiário'))) {
        score += 0.3;
      } else if (job.level.toLowerCase() === 'pleno' && (experience.includes('pleno') || experience.includes('intermediário'))) {
        score += 0.3;
      } else if (job.level.toLowerCase() === 'sênior' && (experience.includes('sênior') || experience.includes('experiente'))) {
        score += 0.3;
      }
    }

    // Score por área
    if (job.area && skills) {
      const jobArea = job.area.toLowerCase();
      if (skills.includes(jobArea) || message.includes(jobArea)) {
        score += 0.2;
      }
    }

    // Score por localização
    if (job.location && location) {
      const jobLocation = job.location.toLowerCase();
      if (location.includes(jobLocation) || jobLocation.includes(location)) {
        score += 0.2;
      }
    }

    // Score por título da vaga
    if (job.title && position) {
      const jobTitle = job.title.toLowerCase();
      if (position.includes(jobTitle) || jobTitle.includes(position)) {
        score += 0.3;
      }
    }

    // Score por requisitos
    if (job.requirements && Array.isArray(job.requirements)) {
      const requirements = job.requirements.join(' ').toLowerCase();
      if (skills && requirements.includes(skills)) {
        score += 0.2;
      }
    }

    // Score por descrição
    if (job.description && (skills || position)) {
      const description = job.description.toLowerCase();
      if (skills && description.includes(skills)) {
        score += 0.1;
      }
      if (position && description.includes(position)) {
        score += 0.1;
      }
    }

    return Math.min(score, 1.0); // Máximo score de 1.0
  }

  // Verifica se o candidato é motorista
  isMotoristaCandidate(candidateProfile, candidateMessage = '') {
    const message = candidateMessage.toLowerCase();
    const skills = (candidateProfile.skills || '').toLowerCase();
    const position = (candidateProfile.current_position || '').toLowerCase();
    
    const motoristaKeywords = [
      'motorista', 'cnh', 'carteira', 'dirigir', 'caminhão', 'carro',
      'entregas', 'logística', 'transporte', 'frete', 'delivery'
    ];
    
    return motoristaKeywords.some(keyword => 
      message.includes(keyword) || 
      skills.includes(keyword) || 
      position.includes(keyword)
    );
  }

  // Sugere vagas alternativas quando não há matches perfeitos
  suggestAlternativeJobs(candidateProfile, candidateMessage = '') {
    console.log('🔍 Nenhuma vaga perfeita encontrada, sugerindo alternativas...');
    
    const message = candidateMessage.toLowerCase();
    const skills = (candidateProfile.skills || '').toLowerCase();
    const position = (candidateProfile.current_position || '').toLowerCase();
    const experience = (candidateProfile.experience || '').toLowerCase();
    
    // Busca vagas que tenham pelo menos uma palavra-chave em comum
    const scoredJobs = this.jobs.map(job => {
      let score = 0;
      
      // Score por área
      if (job.area && (skills.includes(job.area.toLowerCase()) || message.includes(job.area.toLowerCase()))) {
        score += 0.2;
      }
      
      // Score por nível
      if (job.level && experience.includes(job.level.toLowerCase())) {
        score += 0.2;
      }
      
      // Score por título
      if (job.title && (position.includes(job.title.toLowerCase()) || message.includes(job.title.toLowerCase()))) {
        score += 0.2;
      }
      
      return { ...job, score };
    });
    
    return scoredJobs
      .filter(job => job.score > 0.1)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }

  // Formata a lista de vagas para exibição
  formatJobsList(jobs) {
    if (!jobs || jobs.length === 0) {
      return '😔 Desculpe, não encontrei vagas adequadas no momento. Mas não se preocupe! Vou continuar monitorando e assim que surgir uma oportunidade que combine com seu perfil, entrarei em contato!\n\n💡 Dica: Você pode me enviar uma nova mensagem a qualquer momento para verificar se há novas vagas disponíveis.';
    }

    let formattedList = '🎯 Vagas encontradas para você:\n\n';
    
    jobs.forEach((job, index) => {
      formattedList += `${index + 1}. 🏢 ${job.title}\n`;
      formattedList += `📊 Senioridade: ${job.level || 'Não especificado'}\n`;
      formattedList += `📍 Localização: ${job.location}\n`;
      formattedList += `🏭 Empresa: ${job.company}\n`;
      
      if (job.salary_range) {
        formattedList += `💰 Salário: ${job.salary_range}\n`;
      }
      
      // Trunca a descrição para não ficar muito longa
      const shortDescription = job.description.length > 150 
        ? job.description.substring(0, 150) + '...' 
        : job.description;
      
      formattedList += `📝 Descrição: ${shortDescription}\n`;
      
      if (job.application_url) {
        formattedList += `🔗 Candidatar-se: ${job.application_url}\n`;
      }
      
      formattedList += '\n';
    });

    return formattedList;
  }

  // Busca vagas por área específica
  async getJobsByArea(area) {
    try {
      const { data, error } = await this.supabase
        .from('jobs')
        .select('*')
        .eq('is_active', true)
        .eq('area', area)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Erro ao buscar vagas por área:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ Erro ao buscar vagas por área:', error);
      return [];
    }
  }

  // Busca vagas por localização
  async getJobsByLocation(location) {
    try {
      const { data, error } = await this.supabase
        .from('jobs')
        .select('*')
        .eq('is_active', true)
        .ilike('location', `%${location}%`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Erro ao buscar vagas por localização:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ Erro ao buscar vagas por localização:', error);
      return [];
    }
  }

  // Atualiza o cache de vagas
  async refreshCache() {
    console.log('🔄 Atualizando cache de vagas...');
    this.lastFetch = null;
    return await this.loadJobs();
  }
}

module.exports = JobService;
