class BusinessHoursService {
  constructor() {
    this.businessHours = {
      start: 8, // 8:00
      end: 18, // 18:00
      lunchStart: 12, // 12:00
      lunchEnd: 13.5 // 13:30
    };
  }

  isBusinessHours() {
    const now = new Date();
    const currentHour = now.getHours() + (now.getMinutes() / 60);
    const currentDay = now.getDay(); // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado

    // Verifica se é dia útil (Segunda a Sexta)
    if (currentDay === 0 || currentDay === 6) {
      return false;
    }

    // Verifica se está dentro do horário comercial
    if (currentHour >= this.businessHours.start && currentHour < this.businessHours.lunchStart) {
      return true;
    }

    if (currentHour >= this.businessHours.lunchEnd && currentHour < this.businessHours.end) {
      return true;
    }

    return false;
  }

  getBusinessHoursMessage() {
    return `⏰ *Horário de Atendimento*

🕐 Segunda a Sexta:
   • Manhã: 8h às 12h
   • Tarde: 13h30 às 18h

📞 Fora do horário comercial, retornaremos seu contato assim que possível.

Obrigado pela compreensão! 🙏`;
  }

  getNextBusinessDay() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Se hoje é sexta-feira, próximo dia útil é segunda
    if (now.getDay() === 5) {
      tomorrow.setDate(tomorrow.getDate() + 3);
    }
    // Se hoje é sábado, próximo dia útil é segunda
    else if (now.getDay() === 6) {
      tomorrow.setDate(tomorrow.getDate() + 2);
    }
    // Se hoje é domingo, próximo dia útil é segunda
    else if (now.getDay() === 0) {
      tomorrow.setDate(tomorrow.getDate() + 1);
    }

    return tomorrow.toLocaleDateString('pt-BR', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }

  getOutOfHoursMessage() {
    const nextBusinessDay = this.getNextBusinessDay();
    
    return `⏰ *Fora do Horário Comercial*

Olá! Agradecemos seu contato. 😊

No momento estamos fora do horário de atendimento:
🕐 Segunda a Sexta: 8h às 12h e 13h30 às 18h

📅 Retornaremos seu contato na próxima segunda-feira (${nextBusinessDay}).

📧 Para urgências, envie um email para: contato@evolux.com.br

Obrigado pela compreensão! 🙏`;
  }
}

module.exports = BusinessHoursService;
