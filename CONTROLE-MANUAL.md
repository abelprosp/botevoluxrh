# 🎛️ Sistema de Controle Manual - Agente Evolux

Este documento explica como usar o sistema de controle manual que permite assumir e liberar conversas do agente de IA.

## 🎯 **Funcionalidades**

### **1. Assumir Controle Manual**
- ✅ **Para a IA:** Interrompe o processamento automático de mensagens
- ✅ **Remove timeout:** Cancela o timeout automático da conversa
- ✅ **Identificação:** Registra qual agente assumiu o controle
- ✅ **Persistência:** Salva o status no banco de dados

### **2. Liberar Controle Manual**
- ✅ **Reativa IA:** Volta a processar mensagens automaticamente
- ✅ **Restaura timeout:** Reativa o sistema de timeout
- ✅ **Limpeza:** Remove registros de controle manual
- ✅ **Transição suave:** Mantém histórico da conversa

### **3. Monitoramento**
- ✅ **Status em tempo real:** Verifica se conversa está sob controle manual
- ✅ **Estatísticas:** Mostra conversas em controle manual vs. IA
- ✅ **Logs detalhados:** Registra todas as ações de controle

## 🔧 **Como Funciona**

### **Fluxo de Controle Manual:**
1. **Conversa ativa** → IA processando mensagens normalmente
2. **Assumir controle** → IA para de processar, timeout é cancelado
3. **Mensagens do usuário** → São salvas mas não processadas pela IA
4. **Liberar controle** → IA volta a processar, timeout é reativado

### **Comportamento Durante Controle Manual:**
- ✅ **Mensagens do usuário:** São salvas no banco mas ignoradas pela IA
- ✅ **Mensagens do agente:** Podem ser enviadas manualmente via API
- ✅ **Timeout:** Desabilitado durante controle manual
- ✅ **Histórico:** Mantido para quando IA retomar

## 📊 **API Endpoints**

### **1. Assumir Controle Manual**
```bash
POST /whatsapp/take-control
```

**Body:**
```json
{
  "phoneNumber": "555195501677@c.us",
  "agentId": "atendente_joao"
}
```

**Resposta:**
```json
{
  "success": true,
  "message": "Controle manual assumido para 555195501677@c.us",
  "data": {
    "phoneNumber": "555195501677@c.us",
    "agentId": "atendente_joao",
    "takenAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### **2. Liberar Controle Manual**
```bash
POST /whatsapp/release-control
```

**Body:**
```json
{
  "phoneNumber": "555195501677@c.us"
}
```

**Resposta:**
```json
{
  "success": true,
  "message": "Controle manual liberado para 555195501677@c.us",
  "data": {
    "phoneNumber": "555195501677@c.us",
    "releasedAt": "2024-01-15T10:35:00.000Z"
  }
}
```

### **3. Verificar Status de Controle**
```bash
GET /whatsapp/control-status/555195501677@c.us
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "phoneNumber": "555195501677@c.us",
    "isManualControl": true,
    "manualInfo": {
      "agentId": "atendente_joao",
      "takenAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

### **4. Estatísticas Atualizadas**
```bash
GET /stats
```

**Resposta:**
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
          "timeRemaining": 15,
          "isManualControl": false
        }
      ],
      "manualControl": {
        "total": 1,
        "conversations": [
          {
            "phoneNumber": "555195501678@c.us",
            "lastActivity": "2024-01-15T10:25:00.000Z",
            "timeSinceLastActivity": 300,
            "timeRemaining": 0,
            "isManualControl": true,
            "manualControl": {
              "agentId": "atendente_maria",
              "takenAt": "2024-01-15T10:20:00.000Z"
            }
          }
        ]
      }
    },
    "timestamp": "2024-01-15T10:30:45.000Z"
  }
}
```

## 🖥️ **CLI Interativo**

### **Iniciar CLI:**
```bash
npm run cli
```

### **Menu do CLI:**
```
🎛️  CONTROLE MANUAL - EVOLUX AGENT
==================================================
1. 📊 Ver estatísticas
2. 👤 Assumir controle de conversa
3. 🤖 Liberar controle de conversa
4. 📱 Enviar mensagem manual
5. 🔍 Verificar status de controle
6. 🔄 Atualizar estatísticas
0. ❌ Sair
==================================================
```

### **Exemplo de Uso:**
```bash
# 1. Ver estatísticas
Escolha uma opção: 1

📊 ESTATÍSTICAS ATUAIS:
==================================================
🔗 WhatsApp conectado: ✅
📱 Conversas ativas: 2
👤 Controle manual: 1
💼 Vagas ativas: 15

📱 CONVERSAS ATIVAS:
  • 555195501677@c.us (45s restantes)

👤 CONTROLE MANUAL:
  • 555195501678@c.us - atendente_maria

# 2. Assumir controle
Escolha uma opção: 2
Digite o número do telefone: 555195501677@c.us
Digite o ID do agente: atendente_joao

✅ Controle assumido com sucesso!
👤 Agente: atendente_joao
⏰ Assumido em: 2024-01-15T10:30:00.000Z
```

## 🧪 **Testes**

### **1. Teste do Sistema de Controle Manual:**
```bash
npm run test-manual
```

Este teste simula:
- ✅ Conversa ativa com timeout
- ✅ Assumir controle manual
- ✅ Mensagem durante controle manual (IA não processa)
- ✅ Liberar controle manual
- ✅ Mensagem após liberar (IA processa normalmente)

### **2. Teste Manual via CLI:**
1. **Inicie o agente:** `npm start`
2. **Inicie o CLI:** `npm run cli`
3. **Verifique estatísticas:** Opção 1
4. **Assuma controle:** Opção 2
5. **Envie mensagem manual:** Opção 4
6. **Libere controle:** Opção 3

## 🔍 **Logs do Sistema**

### **Exemplos de Logs:**
```
👤 Controle manual assumido para 555195501677@c.us por atendente_joao
📱 Nova mensagem de 555195501677@c.us: Olá, preciso de ajuda
👤 Mensagem de 555195501677@c.us em controle manual - ignorando IA
🤖 Controle manual liberado para 555195501677@c.us
⏰ Timeout configurado para 555195501677@c.us (60s)
```

## 🛠️ **Solução de Problemas**

### **Problema: Não consegue assumir controle**
**Causa:** WhatsApp não conectado ou número inválido
**Solução:** Verifique se o agente está rodando e o número está correto

### **Problema: IA ainda processa mensagens**
**Causa:** Controle não foi assumido corretamente
**Solução:** Verifique o status com `GET /whatsapp/control-status/{phoneNumber}`

### **Problema: Timeout não é restaurado**
**Causa:** Erro ao liberar controle
**Solução:** Verifique logs e tente liberar novamente

## 📋 **Comandos Úteis**

```bash
# Testar sistema de controle manual
npm run test-manual

# Iniciar CLI interativo
npm run cli

# Ver estatísticas via API
curl http://localhost:3000/stats

# Assumir controle via API
curl -X POST http://localhost:3000/whatsapp/take-control \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"555195501677@c.us","agentId":"atendente_joao"}'

# Liberar controle via API
curl -X POST http://localhost:3000/whatsapp/release-control \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"555195501677@c.us"}'
```

## 🎯 **Casos de Uso**

### **1. Atendimento Complexo**
- Usuário tem dúvidas específicas que a IA não consegue resolver
- Atendente assume controle para dar atenção personalizada
- Após resolver, libera controle para IA continuar

### **2. Escalação de Problemas**
- IA detecta situação que requer intervenção humana
- Sistema automaticamente transfere para atendente
- Atendente resolve e libera para IA

### **3. Treinamento da IA**
- Atendente assume controle para mostrar respostas corretas
- IA aprende com as interações humanas
- Controle é liberado para IA aplicar aprendizado

### **4. Manutenção**
- Atendente assume controle durante atualizações
- Sistema continua funcionando sem IA
- Controle é liberado após manutenção

O sistema de controle manual garante flexibilidade total, permitindo intervenção humana quando necessário enquanto mantém a eficiência da IA! 🚀
