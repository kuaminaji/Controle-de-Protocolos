# 📦 Guia de Instalação Completo - Sistema de Gestão de Protocolos

## 🎯 Pré-requisitos

Antes de começar, certifique-se de ter instalado:

- **Python 3.8+** ([Download](https://www.python.org/downloads/))
- **MongoDB** (local ou conta MongoDB Atlas)
- **Git** ([Download](https://git-scm.com/downloads))
- **Editor de texto** (VS Code, Sublime, Notepad++, etc.)

---

## 📥 PASSO 1: Clonar o Repositório

```bash
# Clone o repositório
git clone https://github.com/kuaminaji/protocolos.git

# Entre no diretório
cd protocolos

# Mude para a branch com as melhorias de segurança
git checkout copilot/refactor-code-files-for-optimization
```

---

## 🔧 PASSO 2: Configurar Python e Dependências

### Windows:

```bash
# Criar ambiente virtual
python -m venv venv

# Ativar ambiente virtual
venv\Scripts\activate

# Instalar dependências
pip install -r backend\requirements.txt
```

### Linux/macOS:

```bash
# Criar ambiente virtual
python3 -m venv venv

# Ativar ambiente virtual
source venv/bin/activate

# Instalar dependências
pip install -r backend/requirements.txt
```

**Dependências instaladas:**
- FastAPI (framework web)
- Uvicorn (servidor ASGI)
- PyMongo (cliente MongoDB)
- PyJWT (autenticação JWT)
- Python-dotenv (variáveis de ambiente)
- Python-multipart (upload de arquivos)

---

## 🗄️ PASSO 3: Configurar MongoDB

### Opção A: MongoDB Local (Recomendado para desenvolvimento)

**Windows:**
1. Baixe o MongoDB Community Edition: https://www.mongodb.com/try/download/community
2. Instale seguindo o instalador
3. MongoDB iniciará automaticamente como serviço
4. Teste: abra `cmd` e digite `mongo` (ou `mongosh` na versão nova)

**Linux:**
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y mongodb

# Iniciar serviço
sudo systemctl start mongodb
sudo systemctl enable mongodb

# Verificar status
sudo systemctl status mongodb
```

**macOS:**
```bash
# Instalar via Homebrew
brew tap mongodb/brew
brew install mongodb-community

# Iniciar serviço
brew services start mongodb-community

# Verificar
mongosh
```

### Opção B: MongoDB Atlas (Cloud - Grátis para pequenos projetos)

1. Acesse: https://www.mongodb.com/cloud/atlas/register
2. Crie conta gratuita
3. Crie um cluster (Shared - Free tier)
4. Configure acesso:
   - **Database Access**: Crie usuário e senha
   - **Network Access**: Adicione IP `0.0.0.0/0` (permite qualquer IP) ou seu IP específico
5. Clique em "Connect" → "Connect your application"
6. Copie a string de conexão (ex: `mongodb+srv://user:pass@cluster.mongodb.net/`)

---

## 🔐 PASSO 4: Configurar Variáveis de Ambiente (CRÍTICO)

### 1. Copiar arquivo de exemplo:

```bash
# Windows
copy .env.example .env

# Linux/macOS
cp .env.example .env
```

### 2. Editar arquivo `.env`:

Abra o arquivo `.env` no editor e configure:

```bash
# ============ BANCO DE DADOS ============
# Para MongoDB Local:
MONGO_URL=mongodb://localhost:27017/

# Para MongoDB Atlas (substitua com sua string):
# MONGO_URL=mongodb+srv://seu_usuario:sua_senha@cluster.mongodb.net/

DB_NAME=protocolos_db

# ============ SEGURANÇA - ADMIN (OBRIGATÓRIO) ============
ADMIN_USER=admin
ADMIN_PASSWORD=SuaSenhaForte123

# ============ SEGURANÇA - JWT (OBRIGATÓRIO) ============
# Gere chaves secretas únicas:
JWT_SECRET_KEY=<GERAR_CHAVE_AQUI>
CSRF_SECRET_KEY=<GERAR_CHAVE_AQUI>

# ============ CONFIGURAÇÕES OPCIONAIS ============
PBKDF2_ITER=260000
LOGIN_MAX_ATTEMPTS=5
BUSINESS_DAYS_THRESHOLD=30
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=60
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7
```

### 3. Gerar chaves secretas JWT e CSRF:

**No Windows (PowerShell ou cmd com Python):**
```bash
python -c "import secrets; print('JWT_SECRET_KEY=' + secrets.token_urlsafe(32))"
python -c "import secrets; print('CSRF_SECRET_KEY=' + secrets.token_urlsafe(32))"
```

**No Linux/macOS:**
```bash
python3 -c "import secrets; print('JWT_SECRET_KEY=' + secrets.token_urlsafe(32))"
python3 -c "import secrets; print('CSRF_SECRET_KEY=' + secrets.token_urlsafe(32))"
```

**Exemplo de saída:**
```
JWT_SECRET_KEY=xK9mP2nQ8vR4tY6uI0oP3aS5dF7gH9jK1lZ4xC6vB8nM2qW5eR8tY1uI4oP7aS0
CSRF_SECRET_KEY=aB3cD5eF7gH9iJ1kL3mN5oP7qR9sT1uV3wX5yZ7aB9cD1eF3gH5iJ7kL9mN1oP3
```

Copie e cole essas chaves no arquivo `.env`.

### 4. Configurar senha do admin:

**IMPORTANTE**: Configure uma senha forte com:
- Mínimo 8 caracteres
- Pelo menos 1 número
- Pelo menos 1 letra

Exemplo: `Admin@2026` ou `Protocolo123!`

---

## ▶️ PASSO 5: Iniciar a Aplicação

### 1. Ativar ambiente virtual (se ainda não estiver ativo):

**Windows:**
```bash
venv\Scripts\activate
```

**Linux/macOS:**
```bash
source venv/bin/activate
```

### 2. Iniciar o servidor:

```bash
# Entre no diretório backend
cd backend

# Inicie a aplicação
python main.py
```

**Saída esperada:**
```
[INFO] MongoDB conectado com sucesso.
[INFO] Admin user 'admin' created successfully.
[WARNING] SECURITY: Change admin password after first login!
INFO:     Started server process [12345]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

### 3. Acessar a aplicação:

Abra o navegador e acesse:
```
http://localhost:8000
```

---

## 🔑 PASSO 6: Primeiro Login

1. **Abra o navegador** em `http://localhost:8000`
2. **Faça login** com as credenciais configuradas no `.env`:
   - **Usuário**: `admin` (ou o que você configurou em `ADMIN_USER`)
   - **Senha**: A senha configurada em `ADMIN_PASSWORD`
3. **Altere a senha** imediatamente após o primeiro login:
   - Vá em "Cadastrar Usuário"
   - Edite o usuário admin
   - Defina uma senha ainda mais forte

---

## ✅ PASSO 7: Verificar Instalação

### 1. Teste a aplicação:
- ✅ Login funciona?
- ✅ Dashboard carrega?
- ✅ Pode criar um protocolo?
- ✅ Pode criar um usuário?

### 2. Verifique os logs:
- Sem erros no console do servidor?
- MongoDB conectado com sucesso?

### 3. Teste autenticação JWT:
- Abra DevTools do navegador (F12)
- Vá em "Application" → "Local Storage"
- Verifique se existem: `access_token`, `refresh_token`, `csrf_token`

---

## 🚀 PASSO 8: Configurações de Produção (Opcional)

Se for usar em produção, configure também:

### 1. HTTPS/SSL:
```bash
# Instale certificado SSL (Let's Encrypt)
# Configure reverse proxy (Nginx ou Apache)
```

### 2. Firewall:
```bash
# Windows Firewall: Libere porta 8000
# Linux ufw:
sudo ufw allow 8000/tcp
```

### 3. Serviço Systemd (Linux - para iniciar automaticamente):

Crie `/etc/systemd/system/protocolos.service`:
```ini
[Unit]
Description=Sistema de Gestão de Protocolos
After=network.target

[Service]
Type=simple
User=seu_usuario
WorkingDirectory=/caminho/para/protocolos/backend
Environment="PATH=/caminho/para/protocolos/venv/bin"
ExecStart=/caminho/para/protocolos/venv/bin/python main.py
Restart=always

[Install]
WantedBy=multi-user.target
```

Ative o serviço:
```bash
sudo systemctl enable protocolos
sudo systemctl start protocolos
sudo systemctl status protocolos
```

### 4. Backups Automáticos:

Configure cron job para backup diário:
```bash
# Edite crontab
crontab -e

# Adicione linha para backup às 2h da manhã
0 2 * * * cd /caminho/para/protocolos && /caminho/para/venv/bin/python -c "import requests; requests.post('http://localhost:8000/api/backup/full')"
```

---

## 🔧 Solução de Problemas Comuns

### Problema: "ModuleNotFoundError: No module named 'fastapi'"
**Solução:** Ative o ambiente virtual e instale dependências:
```bash
# Windows
venv\Scripts\activate
pip install -r backend\requirements.txt

# Linux/macOS
source venv/bin/activate
pip install -r backend/requirements.txt
```

### Problema: "pymongo.errors.ServerSelectionTimeoutError"
**Solução:** MongoDB não está rodando ou URL incorreta
- Verifique se MongoDB está iniciado
- Confirme a `MONGO_URL` no `.env`
- Teste conexão: `mongosh` ou `mongo`

### Problema: "ADMIN_PASSWORD environment variable not set"
**Solução:** Configure a senha no `.env`
- Abra `.env`
- Defina `ADMIN_PASSWORD=SuaSenha123`
- Reinicie a aplicação

### Problema: "Port 8000 already in use"
**Solução:** Outra aplicação está usando a porta
```bash
# Windows: Encontre e mate o processo
netstat -ano | findstr :8000
taskkill /PID <numero_do_pid> /F

# Linux/macOS
lsof -ti:8000 | xargs kill -9
```

### Problema: Login não funciona após clonar
**Solução:** Verifique se JWT está configurado
- Confirme que `JWT_SECRET_KEY` e `CSRF_SECRET_KEY` estão no `.env`
- Verifique DevTools → Application → Local Storage para ver tokens
- Limpe cache do navegador (Ctrl+Shift+Delete)

---

## 📚 Recursos Adicionais

- **Documentação de Segurança**: Veja `SECURITY_SETUP.md`
- **Status de Implementação**: Veja `SECURITY_IMPLEMENTATION_STATUS.md`
- **Análise de Segurança**: Veja `SECURITY_ANALYSIS.md`
- **API Docs (Swagger)**: Acesse `http://localhost:8000/docs` após iniciar

---

## 📞 Suporte

Se encontrar problemas:

1. Verifique os logs do servidor
2. Consulte a documentação de segurança
3. Abra uma issue no GitHub
4. Revise os arquivos de configuração

---

## 🎉 Pronto!

Sua aplicação está instalada e rodando com segurança aprimorada:
- ✅ JWT Authentication implementado
- ✅ CSRF Protection ativo
- ✅ Senhas hasheadas com PBKDF2
- ✅ Headers de segurança configurados
- ✅ Validação de input implementada
- ✅ Endpoints protegidos com autenticação

**Importante**: Esta aplicação agora usa autenticação JWT. Certifique-se de manter as chaves secretas seguras e nunca commitar o arquivo `.env` no Git!

---

**Versão**: 2.0.0 (Segurança Aprimorada)  
**Data**: Janeiro 2026  
**Autor**: Sistema de Gestão de Protocolos
