const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();

// Middleware de segurança
app.use(helmet({
  contentSecurityPolicy: false // Necessário para o dashboard
}));
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100 // limite por IP
});
app.use(limiter);

// Servir arquivos estáticos do dashboard
app.use('/dashboard', express.static(path.join(__dirname, 'web/public')));

// Dashboard HTML
app.get('/dashboard', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Evolux Agent Dashboard</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .login-container {
            background: white;
            padding: 2rem;
            border-radius: 10px;
            box-shadow: 0 15px 35px rgba(0, 0, 0, 0.1);
            width: 100%;
            max-width: 400px;
        }
        
        .logo {
            text-align: center;
            margin-bottom: 2rem;
        }
        
        .logo h1 {
            color: #333;
            font-size: 1.8rem;
            margin-bottom: 0.5rem;
        }
        
        .logo p {
            color: #666;
            font-size: 0.9rem;
        }
        
        .form-group {
            margin-bottom: 1.5rem;
        }
        
        label {
            display: block;
            margin-bottom: 0.5rem;
            color: #333;
            font-weight: 500;
        }
        
        input[type="password"] {
            width: 100%;
            padding: 0.75rem;
            border: 2px solid #e1e5e9;
            border-radius: 5px;
            font-size: 1rem;
            transition: border-color 0.3s ease;
        }
        
        input[type="password"]:focus {
            outline: none;
            border-color: #667eea;
        }
        
        .btn {
            width: 100%;
            padding: 0.75rem;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 5px;
            font-size: 1rem;
            font-weight: 500;
            cursor: pointer;
            transition: transform 0.2s ease;
        }
        
        .btn:hover {
            transform: translateY(-2px);
        }
        
        .error {
            color: #e74c3c;
            font-size: 0.9rem;
            margin-top: 0.5rem;
            text-align: center;
        }
        
        .dashboard {
            display: none;
            background: white;
            border-radius: 10px;
            box-shadow: 0 15px 35px rgba(0, 0, 0, 0.1);
            width: 100%;
            max-width: 1200px;
            margin: 2rem;
        }
        
        .dashboard-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 1.5rem;
            border-radius: 10px 10px 0 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .dashboard-content {
            padding: 2rem;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2rem;
        }
        
        .stat-card {
            background: #f8f9fa;
            padding: 1.5rem;
            border-radius: 8px;
            border-left: 4px solid #667eea;
        }
        
        .stat-card h3 {
            color: #333;
            margin-bottom: 0.5rem;
        }
        
        .stat-card .number {
            font-size: 2rem;
            font-weight: bold;
            color: #667eea;
        }
        
        .logout-btn {
            background: rgba(255, 255, 255, 0.2);
            color: white;
            border: 1px solid rgba(255, 255, 255, 0.3);
            padding: 0.5rem 1rem;
            border-radius: 5px;
            cursor: pointer;
            transition: background 0.3s ease;
        }
        
        .logout-btn:hover {
            background: rgba(255, 255, 255, 0.3);
        }
    </style>
</head>
<body>
    <div class="login-container" id="loginForm">
        <div class="logo">
            <h1>Evolux Agent</h1>
            <p>Dashboard de Controle</p>
        </div>
        
        <form onsubmit="login(event)">
            <div class="form-group">
                <label for="token">Token de Acesso:</label>
                <input type="password" id="token" placeholder="Digite o token de acesso" required>
            </div>
            
            <button type="submit" class="btn">Acessar Dashboard</button>
            
            <div class="error" id="error" style="display: none;"></div>
        </form>
    </div>
    
    <div class="dashboard" id="dashboard">
        <div class="dashboard-header">
            <div>
                <h1>Evolux Agent Dashboard</h1>
                <p>Monitoramento em Tempo Real</p>
            </div>
            <button class="logout-btn" onclick="logout()">Sair</button>
        </div>
        
        <div class="dashboard-content">
            <div class="stats-grid">
                <div class="stat-card">
                    <h3>Status do Sistema</h3>
                    <div class="number" id="systemStatus">Online</div>
                </div>
                
                <div class="stat-card">
                    <h3>Ambiente</h3>
                    <div class="number" id="environment">Vercel</div>
                </div>
                
                <div class="stat-card">
                    <h3>Versão</h3>
                    <div class="number" id="version">2.0.0</div>
                </div>
                
                <div class="stat-card">
                    <h3>Uptime</h3>
                    <div class="number" id="uptime">--</div>
                </div>
            </div>
            
            <div class="stat-card">
                <h3>Informações do Sistema</h3>
                <p><strong>Nota:</strong> Este é o dashboard da versão Vercel. O WhatsApp não está disponível neste ambiente.</p>
                <p><strong>Para funcionalidade completa:</strong> Use a versão VPS com WhatsApp Web.</p>
            </div>
        </div>
    </div>

    <script>
        function login(event) {
            event.preventDefault();
            
            const token = document.getElementById('token').value;
            const correctToken = 'Jornada2024@';
            
            if (token === correctToken) {
                document.getElementById('loginForm').style.display = 'none';
                document.getElementById('dashboard').style.display = 'block';
                loadDashboardData();
            } else {
                document.getElementById('error').textContent = 'Token incorreto!';
                document.getElementById('error').style.display = 'block';
            }
        }
        
        function logout() {
            document.getElementById('loginForm').style.display = 'block';
            document.getElementById('dashboard').style.display = 'none';
            document.getElementById('token').value = '';
            document.getElementById('error').style.display = 'none';
        }
        
        function loadDashboardData() {
            // Carrega dados do sistema
            fetch('/api/status')
                .then(response => response.json())
                .then(data => {
                    document.getElementById('uptime').textContent = Math.floor(data.uptime) + 's';
                })
                .catch(error => {
                    console.error('Erro ao carregar dados:', error);
                });
        }
        
        // Atualiza dados a cada 30 segundos
        setInterval(() => {
            if (document.getElementById('dashboard').style.display === 'block') {
                loadDashboardData();
            }
        }, 30000);
    </script>
</body>
</html>
  `);
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'Evolux Agent API',
    version: '2.0.0',
    environment: 'vercel'
  });
});

// Endpoint principal
app.get('/', (req, res) => {
  res.json({
    message: 'Evolux WhatsApp Agent API',
    version: '2.0.0',
    status: 'running',
    environment: 'vercel',
    note: 'WhatsApp não disponível em produção Vercel',
    endpoints: {
      health: '/health',
      chat: '/api/chat',
      company: '/api/company',
      dashboard: '/dashboard'
    }
  });
});

// Endpoint para testar IA
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Mensagem é obrigatória' });
    }

    // Resposta simulada da IA
    const response = {
      message: 'API funcionando! WhatsApp não disponível em produção Vercel.',
      received: message,
      timestamp: new Date().toISOString(),
      service: 'Evolux Agent API',
      environment: 'vercel'
    };

    res.json(response);
  } catch (error) {
    console.error('Erro no chat:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Endpoint para informações da empresa
app.get('/api/company', (req, res) => {
  res.json({
    name: 'Evolux Soluções de RH',
    website: 'https://evoluxrh.com.br',
    email: 'contato@evoluxrh.com.br',
    service: 'Recrutamento e Seleção'
  });
});

// Endpoint para status do sistema
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    service: 'Evolux Agent API'
  });
});

// Middleware de erro
app.use((err, req, res, next) => {
  console.error('Erro:', err);
  res.status(500).json({ 
    error: 'Erro interno do servidor',
    message: err.message 
  });
});

// Middleware para rotas não encontradas
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Endpoint não encontrado',
    availableEndpoints: ['/', '/health', '/api/chat', '/api/company', '/api/status', '/dashboard']
  });
});

const PORT = process.env.PORT || 3000;

// Para Vercel, não precisamos do app.listen()
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`🚀 API rodando na porta ${PORT}`);
    console.log(` Health check: http://localhost:${PORT}/health`);
    console.log(` Dashboard: http://localhost:${PORT}/dashboard`);
  });
}

module.exports = app;