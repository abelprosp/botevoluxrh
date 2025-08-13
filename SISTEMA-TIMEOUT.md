# ⏰ Sistema de Timeout - Agente Evolux

Este documento explica como funciona o sistema de timeout que finaliza automaticamente o atendimento após 1 minuto de inatividade.

## 🎯 **Funcionalidades**

### **1. Timeout Automático**
- ✅ **1 minuto de inatividade:** Conversa é finalizada automaticamente
- ✅ **Mensagem de finalização:** Usuário recebe aviso de que o atendimento foi encerrado
- ✅ **Reinicialização:** Se o usuário enviar nova mensagem, o atendimento recomeça

### **2. Detecção de Reinicialização**
- ✅ **5 minutos de intervalo:** Se passou mais de 5 minutos, considera nova conversa
- ✅ **Limpeza de dados:** Remove informações anteriores da conversa
- ✅ **Mensagem inicial:** Sempre envia a mensagem de boas-vindas

### **3. Monitoramento**
- ✅ **Conversas ativas:** Rastreia todas as conversas em andamento
- ✅ **Estatísticas:** API mostra conversas ativas e tempo restante
- ✅ **Logs detalhados:** Registra todas as ações do sistema

## 🔧 **Como Funciona**

### **Fluxo Normal:**
1. **Usuário envia mensagem** → Timeout configurado para 1 minuto
2. **Usuário interage** → Timeout é resetado
3. **1 minuto sem interação** → Conversa finalizada automaticamente
4. **Usuário envia nova mensagem** → Atendimento reiniciado

### **Mensagem de Finalização:**
```
⏰ Atendimento Finalizado

Olá! Percebemos que você não interagiu conosco nos últimos minutos.

📞 Se precisar de mais informações, sinta-se à vontade para enviar uma nova mensagem a qualquer momento!

Obrigado por escolher a Evolux Soluções de RH! 🙏

---
Este atendimento foi finalizado automaticamente por inatividade.
```

## 📊 **Monitoramento via API**

### **Endpoint de Estatísticas:**
```bash
GET http://localhost:3000/stats
```

### **Resposta:**
```json
{
  "success": true,
  "data": {
    "activeJobs": 15,
    "whatsappConnected": true,
    "activeConversations": {
      "total": 3,
      "conversations": [
        {
          "phoneNumber": "555195501677@c.us",
          "lastActivity": "2024-01-15T10:30:00.000Z",
          "timeSinceLastActivity": 45,
          "timeRemaining": 15
        }
      ]
    },
    "timestamp": "2024-01-15T10:30:45.000Z"
  }
}
```

## 🧪 **Testes**

### **1. Teste do Sistema de Timeout:**
```bash
npm run test-timeout
```

Este teste simula:
- ✅ Primeira mensagem (timeout configurado)
- ✅ Nova mensagem após 30s (timeout resetado)
- ✅ Timeout após 1 minuto (conversa finalizada)
- ✅ Reinicialização da conversa

### **2. Teste Manual:**
1. **Inicie o agente:** `npm start`
2. **Envie uma mensagem** no WhatsApp
3. **Aguarde 1 minuto** sem interagir
4. **Verifique** se recebeu a mensagem de finalização
5. **Envie nova mensagem** para reiniciar

## ⚙️ **Configurações**

### **Timeouts Configuráveis:**
```javascript
// No arquivo whatsappClientSimple.js
this.timeoutDuration = 60000; // 1 minuto (em millisegundos)
const restartThreshold = 300000; // 5 minutos para reinicialização
```

### **Personalização:**
- **Timeout mais curto:** `30000` (30 segundos)
- **Timeout mais longo:** `120000` (2 minutos)
- **Reinicialização mais rápida:** `180000` (3 minutos)

## 🔍 **Logs do Sistema**

### **Exemplos de Logs:**
```
⏰ Timeout configurado para 555195501677@c.us (60s)
📱 Nova mensagem de 555195501677@c.us: Olá
⏰ Timeout configurado para 555195501677@c.us (60s)
⏰ Finalizando conversa com 555195501677@c.us por inatividade
✅ Conversa com 555195501677@c.us finalizada
🔄 Conversa reiniciada com 555195501677@c.us
```

## 🛠️ **Solução de Problemas**

### **Problema: Timeout não funciona**
**Causa:** Cliente WhatsApp desconectado
**Solução:** Verifique se o WhatsApp está conectado

### **Problema: Conversa não reinicia**
**Causa:** Dados antigos no banco
**Solução:** Execute `npm run reset-db`

### **Problema: Timeout muito rápido/lento**
**Causa:** Configuração incorreta
**Solução:** Ajuste `timeoutDuration` no código

## 📋 **Comandos Úteis**

```bash
# Testar sistema de timeout
npm run test-timeout

# Ver estatísticas em tempo real
curl http://localhost:3000/stats

# Resetar banco de dados
npm run reset-db

# Iniciar agente
npm start
```

## 🎯 **Benefícios**

1. **Melhor experiência do usuário:** Não fica "pendurado" esperando
2. **Economia de recursos:** Libera conexões inativas
3. **Reinicialização automática:** Usuário pode voltar quando quiser
4. **Monitoramento em tempo real:** Acompanhe conversas ativas
5. **Logs detalhados:** Facilita debugging e análise

O sistema de timeout garante que o agente seja eficiente e responsivo, proporcionando uma experiência profissional para todos os usuários! 🚀
