# 🧪 Teste do Fluxo do Agente Evolux

Este documento explica como testar o fluxo do agente para garantir que está funcionando corretamente.

## 🚀 Como Testar

### 1. Teste Automático do Fluxo
```bash
npm run test-flow
```

Este comando testa:
- ✅ Mensagem inicial
- ✅ Classificação de empresas
- ✅ Classificação de candidatos
- ✅ Processamento de informações
- ✅ Verificação de horário comercial
- ✅ Carregamento de vagas

### 2. Teste Manual no WhatsApp

#### **Fluxo para Empresas:**
1. Envie: "Olá, somos uma empresa e precisamos contratar funcionários"
2. **Resultado esperado:**
   - Se fora do horário: Mensagem informando que retornaremos o contato
   - Se no horário: Mensagem pedindo para aguardar atendente humano

#### **Fluxo para Candidatos:**
1. Envie: "Oi, estou procurando emprego"
2. **Resultado esperado:** Mensagem pedindo informações do perfil
3. Envie: "Me chamo João, tenho 3 anos de experiência como desenvolvedor, trabalho com JavaScript e React, moro em São Paulo"
4. **Resultado esperado:** Lista de vagas compatíveis + link do Pipefy

## 🔍 Logs de Debug

O sistema agora mostra logs detalhados:

```
🔍 Classificação: "Olá, estou procurando emprego" -> candidate
📱 Usuário 5511999999999@c.us classificado como: candidate
📋 Informações extraídas do candidato: { name: "João", experience: "3 anos", ... }
🎯 Encontradas 3 vagas para o perfil
```

## 🛠️ Solução de Problemas

### **Problema: Loop da mensagem inicial**
**Causa:** Classificação incorreta do tipo de usuário
**Solução:** Execute `npm run test-flow` para verificar a classificação

### **Problema: Não encontra vagas**
**Causa:** Arquivo CSV não carregado ou informações não extraídas
**Solução:** Verifique se `src/data/jobs.csv` existe e tem dados

### **Problema: Erro de classificação**
**Causa:** API Groq não configurada ou com erro
**Solução:** Verifique a chave da API no arquivo `.env`

## 📋 Exemplos de Mensagens para Teste

### **Para Empresas:**
- "Somos uma empresa e precisamos contratar"
- "Vocês fazem recrutamento e seleção?"
- "Precisamos de funcionários para nossa empresa"
- "Queremos contratar a Evolux para RH"

### **Para Candidatos:**
- "Estou procurando emprego"
- "Vocês têm vagas disponíveis?"
- "Quero me candidatar a uma vaga"
- "Preciso de uma oportunidade de trabalho"

## 🎯 Resultados Esperados

### **Empresa (Horário Comercial):**
```
Olá! 👋

Obrigado pelo seu contato com a Evolux Soluções de RH! 

📞 Um de nossos especialistas em recrutamento e seleção irá atendê-lo em breve.

⏰ Por favor, aguarde um momento enquanto transferimos você para um atendente humano.

Enquanto isso, você pode conhecer mais sobre nossos serviços em: https://evolux.com.br

Obrigado pela paciência! 🙏
```

### **Empresa (Fora do Horário):**
```
⏰ Fora do Horário Comercial

Olá! Agradecemos seu contato. 😊

No momento estamos fora do horário de atendimento:
🕐 Segunda a Sexta: 8h às 12h e 13h30 às 18h

📅 Retornaremos seu contato na próxima segunda-feira.

📧 Para urgências, envie um email para: contato@evolux.com.br

Obrigado pela compreensão! 🙏
```

### **Candidato (Primeira Mensagem):**
```
Olá! 👋

Sou o assistente virtual da Evolux Soluções de RH e vou te ajudar a encontrar as melhores oportunidades!

🎯 Para encontrar vagas adequadas ao seu perfil, preciso de algumas informações:

📝 Pode me contar:
• Seu nome
• Sua experiência profissional (anos ou nível: júnior, pleno, sênior)
• Suas principais habilidades
• Localização de preferência
• Cargo atual (se aplicável)

Exemplo: "Me chamo João, tenho 3 anos de experiência como desenvolvedor, trabalho com JavaScript, React e Node.js, moro em São Paulo e sou desenvolvedor pleno."

Vamos começar? 😊
```

### **Candidato (Com Vagas Encontradas):**
```
🎯 Vagas encontradas para você:

1. 🏢 Desenvolvedor Full Stack
📊 Senioridade: Pleno
📍 Localização: São Paulo - SP
📝 Descrição: Desenvolvimento de aplicações web completas com React, Node.js e banco de dados

2. 🏢 Analista de Dados
📊 Senioridade: Sênior
📍 Localização: Remoto
📝 Descrição: Análise de dados, criação de dashboards e relatórios com Python e SQL

📋 Para se candidatar, acesse: https://app.pipefy.com/public/form/a19wdDh_
```

## 🔧 Comandos Úteis

```bash
# Testar fluxo completo
npm run test-flow

# Testar apenas WhatsApp
npm run test-whatsapp

# Diagnóstico do ambiente
npm run diagnose

# Iniciar agente
npm start
```
