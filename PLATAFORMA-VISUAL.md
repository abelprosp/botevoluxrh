# 🌐 Plataforma Visual de Atendimento - Evolux

Este documento explica como usar a plataforma visual web para controle manual de atendimento.

## 🎯 **Funcionalidades da Plataforma Visual**

### **1. Dashboard em Tempo Real**
- ✅ **Estatísticas visuais:** Status do WhatsApp, conversas ativas, controle manual
- ✅ **Atualização automática:** Dados atualizados a cada 10 segundos
- ✅ **Interface responsiva:** Funciona em desktop, tablet e mobile
- ✅ **Design moderno:** Interface intuitiva e profissional

### **2. Controle Manual Visual**
- ✅ **Assumir controle:** Botão para assumir controle de conversas
- ✅ **Enviar mensagens:** Campo para enviar mensagens manuais
- ✅ **Liberar controle:** Botão para liberar controle para IA
- ✅ **Verificar status:** Verificar status de controle de conversas

### **3. Monitoramento de Conversas**
- ✅ **Lista de conversas ativas:** Visualização de todas as conversas
- ✅ **Diferenciação visual:** Conversas normais vs. controle manual
- ✅ **Informações detalhadas:** Tempo restante, agente responsável
- ✅ **Atualização em tempo real:** Lista atualizada automaticamente

## 🚀 **Como Acessar**

### **1. Iniciar a Plataforma:**
```bash
# Iniciar o agente completo (inclui dashboard web)
npm start

# Ou especificamente o dashboard
npm run dashboard
```

### **2. Acessar no Navegador:**
```
🌐 Dashboard Web: http://localhost:3001
📊 API: http://localhost:3000
```

## 🖥️ **Interface da Plataforma**

### **Header:**
- **Título:** Evolux Dashboard
- **Subtítulo:** Plataforma de Controle Manual de Atendimento

### **Cards de Estatísticas:**
1. **Status WhatsApp:** ✅/❌ Conectado/Desconectado
2. **Conversas Ativas:** Número total de conversas
3. **Controle Manual:** Número de conversas em controle manual
4. **Vagas Ativas:** Número de vagas disponíveis

### **Painel de Conversas:**
- **Lista de conversas ativas** com informações:
  - Número do telefone
  - Tempo restante de timeout
  - Horário da última atividade
  - Status de controle manual (se aplicável)

### **Painel de Controle:**
- **Campo de telefone:** Para inserir número do telefone
- **Campo de agente:** Para inserir ID do agente
- **Campo de mensagem:** Para enviar mensagens manuais
- **Botões de ação:**
  - 👤 Assumir Controle
  - 📱 Enviar Mensagem
  - 🤖 Liberar Controle
  - 🔍 Verificar Status

## 🎨 **Características Visuais**

### **Design:**
- **Gradiente moderno:** Fundo com gradiente azul/roxo
- **Glassmorphism:** Efeito de vidro fosco nos cards
- **Animações suaves:** Transições e hover effects
- **Responsivo:** Adapta-se a diferentes tamanhos de tela

### **Cores:**
- **Primária:** #667eea (Azul)
- **Sucesso:** #48bb78 (Verde)
- **Perigo:** #f56565 (Vermelho)
- **Aviso:** #ed8936 (Laranja)

### **Ícones:**
- 🎛️ Dashboard
- 📱 Conversas
- 👤 Controle Manual
- 🤖 IA
- 🔄 Atualizar
- ✅ Sucesso
- ❌ Erro

## 📱 **Como Usar**

### **1. Monitorar Conversas:**
1. Acesse `http://localhost:3001`
2. Visualize as estatísticas no topo
3. Veja a lista de conversas ativas
4. Identifique conversas em controle manual (borda vermelha)

### **2. Assumir Controle:**
1. Digite o número do telefone no campo
2. Digite o ID do agente (opcional)
3. Clique em "👤 Assumir Controle"
4. Confirme o sucesso na mensagem

### **3. Enviar Mensagem Manual:**
1. Digite o número do telefone
2. Digite a mensagem no campo de texto
3. Clique em "📱 Enviar Mensagem"
4. Confirme o envio

### **4. Liberar Controle:**
1. Digite o número do telefone
2. Clique em "🤖 Liberar Controle"
3. Confirme a liberação

### **5. Verificar Status:**
1. Digite o número do telefone
2. Clique em "🔍 Verificar Status"
3. Veja o status atual da conversa

## 🔄 **Atualizações Automáticas**

### **Frequência:**
- **Estatísticas:** Atualizadas a cada 10 segundos
- **Lista de conversas:** Atualizada automaticamente
- **Status do WhatsApp:** Verificado em tempo real

### **Botão de Atualização:**
- **Posição:** Canto inferior direito
- **Função:** Atualizar manualmente
- **Animação:** Rotação 180° no hover

## 📊 **Alertas e Notificações**

### **Tipos de Alerta:**
- **Sucesso:** Fundo verde, mensagem de confirmação
- **Erro:** Fundo vermelho, mensagem de erro
- **Info:** Fundo azul, informação

### **Duração:**
- **Auto-remoção:** 5 segundos
- **Posição:** Painel de controle

## 🛠️ **Solução de Problemas**

### **Problema: Dashboard não carrega**
**Causa:** Servidor não iniciado
**Solução:** Verifique se o agente está rodando com `npm start`

### **Problema: Estatísticas não atualizam**
**Causa:** Problema de conexão com API
**Solução:** Verifique se a API está rodando na porta 3000

### **Problema: Botões não funcionam**
**Causa:** JavaScript desabilitado ou erro
**Solução:** Verifique o console do navegador (F12)

### **Problema: Interface não responsiva**
**Causa:** Navegador antigo
**Solução:** Use navegadores modernos (Chrome, Firefox, Safari, Edge)

## 📋 **Comandos Úteis**

```bash
# Iniciar agente completo (inclui dashboard)
npm start

# Iniciar apenas o dashboard
npm run dashboard

# Verificar status da API
curl http://localhost:3000/health

# Verificar estatísticas
curl http://localhost:3000/stats
```

## 🎯 **Vantagens da Plataforma Visual**

### **1. Facilidade de Uso:**
- Interface intuitiva e visual
- Não requer conhecimento técnico
- Acesso via navegador web

### **2. Monitoramento em Tempo Real:**
- Dados atualizados automaticamente
- Visualização clara do status
- Alertas e notificações

### **3. Controle Total:**
- Assumir/liberar controle com um clique
- Envio de mensagens manuais
- Verificação de status

### **4. Profissionalismo:**
- Design moderno e profissional
- Interface responsiva
- Experiência de usuário otimizada

A plataforma visual transforma o controle manual em uma experiência intuitiva e profissional, permitindo que atendentes gerenciem conversas de forma eficiente! 🚀
