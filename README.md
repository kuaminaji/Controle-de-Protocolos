# 📋 Sistema de Gestão de Protocolos

Sistema completo para gerenciamento de protocolos com autenticação JWT, interface responsiva e segurança aprimorada.

## 🚀 Instalação Rápida

### Opção 1: Script Automático (Recomendado)

**Windows:**
```bash
cd install
instalar_windows.bat
```

**Linux/macOS:**
```bash
cd install
chmod +x instalar_linux.sh
./instalar_linux.sh
```

### Opção 2: Manual

```bash
# 1. Criar ambiente virtual
python -m venv venv

# 2. Ativar ambiente virtual
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# 3. Instalar dependências
pip install -r backend/requirements.txt

# 4. Iniciar servidor
cd backend
python main.py
```

### 3. Acessar o Sistema

Abra o navegador em: **http://localhost:8000**

**Login padrão:**
- Usuário: `admin`
- Senha: `admin123@`

⚠️ **IMPORTANTE:** Altere a senha após o primeiro login!

> 💡 **Dica:** Se precisar criar o usuário admin manualmente no MongoDB, use o arquivo `mongodb_compass_admin_user.json` com o [MongoDB Compass](MONGODB_COMPASS_GUIDE.md).

### 📚 Guias de Instalação Detalhados

- **[Guia Completo Windows/Linux/macOS](GUIA_INSTALACAO_WINDOWS.md)** ⭐ **RECOMENDADO**
- [Guia em Português - Detalhado](GUIA_INSTALACAO_COMPLETO.md)
- [Installation Guide - English](INSTALLATION_GUIDE.md)

## 📚 Documentação Completa

Para instruções detalhadas, consulte:

- **[GUIA_INSTALACAO_WINDOWS.md](GUIA_INSTALACAO_WINDOWS.md)** ⭐ - Guia completo Windows/Linux/macOS (RECOMENDADO)
- **[GUIA_INSTALACAO_COMPLETO.md](GUIA_INSTALACAO_COMPLETO.md)** - Guia passo a passo com 10 seções
- **[MONGODB_COMPASS_GUIDE.md](MONGODB_COMPASS_GUIDE.md)** 🧭 - Criar usuário admin no MongoDB Compass
- **[CONSULTAS_MONGODB.md](CONSULTAS_MONGODB.md)** 🔍 - Consultas úteis no MongoDB Shell (mongosh)
- **[SECURITY_SETUP.md](SECURITY_SETUP.md)** - Configuração de segurança
- **[SECURITY_ANALYSIS.md](SECURITY_ANALYSIS.md)** - Análise de segurança completa

## ✨ Funcionalidades

- 📝 Cadastro e gestão de protocolos
- 👥 Gerenciamento de usuários (admin)
- 📊 Dashboard com estatísticas em tempo real
- 🔍 Busca avançada com múltiplos filtros
- 📂 Categorização por setores
- ⚠️ Alertas de protocolos atrasados
- 🔔 Sistema de notificações
- 💾 Backup e restauração completa
- 🔐 Autenticação JWT segura
- 🛡️ Proteção CSRF
- 📱 Interface responsiva

## 🔒 Segurança

- ✅ Autenticação JWT end-to-end
- ✅ Senhas hasheadas com PBKDF2 (260.000 iterações)
- ✅ Proteção CSRF em todas operações
- ✅ Rate limiting (5 tentativas de login)
- ✅ Headers de segurança (CSP, X-Frame-Options, etc.)
- ✅ Validação de entrada em todos campos
- ✅ Tokens com expiração automática

## 🔧 Requisitos

- Python 3.8+
- MongoDB (local ou MongoDB Atlas)
- Navegador moderno (Chrome, Firefox, Edge, Safari)

## 📦 Estrutura do Projeto

```
protocolos/
├── backend/              # API FastAPI
│   ├── main.py          # Servidor principal
│   └── requirements.txt # Dependências Python
├── frontend/            # Interface do usuário
│   ├── index.html      # Página principal
│   ├── app.js          # Lógica do frontend
│   └── style.css       # Estilos
├── install/            # Scripts de instalação
├── .env                # Configurações (incluso!)
├── .env.example        # Template de configuração
└── GUIA_INSTALACAO_COMPLETO.md  # Guia detalhado
```

## 🆘 Solução de Problemas

### MongoDB não conecta

**MongoDB Local:**
```bash
# Windows: Abra Services e inicie "MongoDB Server"
# Linux:
sudo systemctl start mongodb
```

**MongoDB Atlas:**
- Verifique a string de conexão no `.env`
- Libere seu IP no MongoDB Atlas (0.0.0.0/0)

### Porta 8000 em uso

```bash
# Windows:
netstat -ano | findstr :8000
taskkill /PID [PID] /F

# Linux/macOS:
lsof -ti:8000 | xargs kill -9
```

### Mais problemas?

Consulte o **[GUIA_INSTALACAO_COMPLETO.md](GUIA_INSTALACAO_COMPLETO.md)** - seção "Solução de Problemas"

## 🌐 API Documentation

Após iniciar o servidor:
- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

## 📝 Configuração

O arquivo `.env` está **pronto para uso** com valores seguros.

Para produção, gere novas chaves:
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

Atualize no `.env`:
- `JWT_SECRET_KEY`
- `CSRF_SECRET_KEY`
- `ADMIN_PASSWORD`

## 🤝 Contribuindo

Contribuições são bem-vindas! Abra issues ou pull requests.

## 📄 Licença

Open Source - use livremente em seus projetos.

## 📞 Suporte

- **Documentação:** Consulte os arquivos `.md` na raiz
- **Issues:** https://github.com/kuaminaji/protocolos/issues
- **Logs:** `backend/app.log`

---

**Versão:** 2.0.0 (Segurança Aprimorada)  
**Última atualização:** Janeiro 2026

🎉 **Instalação rápida em 5 minutos!**
