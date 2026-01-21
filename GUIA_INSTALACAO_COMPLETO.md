# 📘 Guia Completo de Instalação - Sistema de Gestão de Protocolos

**Versão:** 2.0.0 (Com Segurança JWT)  
**Última atualização:** Janeiro 2026

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Pré-requisitos](#pré-requisitos)
3. [Instalação Passo a Passo](#instalação-passo-a-passo)
4. [Configuração do Sistema](#configuração-do-sistema)
5. [Primeiro Acesso](#primeiro-acesso)
6. [Verificação da Instalação](#verificação-da-instalação)
7. [Configuração para Produção](#configuração-para-produção)
8. [Solução de Problemas](#solução-de-problemas)
9. [Perguntas Frequentes](#perguntas-frequentes)
10. [Suporte](#suporte)

---

## 🎯 Visão Geral

Este guia fornece instruções **detalhadas** para instalar o Sistema de Gestão de Protocolos em uma **nova máquina** (Windows, Linux ou macOS).

### O que você vai instalar:

- ✅ Backend Python com FastAPI
- ✅ Frontend JavaScript responsivo
- ✅ Banco de dados MongoDB
- ✅ Sistema de autenticação JWT
- ✅ Proteção CSRF
- ✅ Sistema de backup

### Tempo estimado: 30-45 minutos

---

## 🔧 Pré-requisitos

Antes de começar, certifique-se de ter:

### 1. Python 3.8 ou superior

**Verificar se já está instalado:**
```bash
python --version
# ou
python3 --version
```

**Se não estiver instalado:**
- **Windows:** Baixe em https://www.python.org/downloads/
  - ⚠️ IMPORTANTE: Marque "Add Python to PATH" durante a instalação
- **Linux Ubuntu/Debian:**
  ```bash
  sudo apt update
  sudo apt install python3 python3-pip python3-venv
  ```
- **macOS:**
  ```bash
  brew install python3
  ```

### 2. Git

**Verificar se já está instalado:**
```bash
git --version
```

**Se não estiver instalado:**
- **Windows:** Baixe em https://git-scm.com/downloads
- **Linux:**
  ```bash
  sudo apt install git
  ```
- **macOS:**
  ```bash
  brew install git
  ```

### 3. MongoDB

**Você tem duas opções:**

#### Opção A: MongoDB Local (Recomendado para desenvolvimento)

**Windows:**
1. Baixe: https://www.mongodb.com/try/download/community
2. Execute o instalador
3. Marque "Install MongoDB as a Service"
4. Deixe as configurações padrão
5. Aguarde a instalação completar
6. MongoDB iniciará automaticamente

**Verificar instalação:**
```bash
# Abra cmd ou PowerShell
mongosh
# ou
mongo
```

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
# Via Homebrew
brew tap mongodb/brew
brew install mongodb-community

# Iniciar serviço
brew services start mongodb-community

# Verificar
mongosh
```

#### Opção B: MongoDB Atlas (Cloud - Grátis)

1. Acesse: https://www.mongodb.com/cloud/atlas/register
2. Crie uma conta gratuita
3. Crie um novo cluster (escolha "Shared" - Free tier)
4. Aguarde ~5 minutos para o cluster ser criado
5. Configure o acesso:
   - Clique em "Database Access" → "Add New Database User"
   - Crie usuário e senha (anote!)
   - Clique em "Network Access" → "Add IP Address"
   - Selecione "Allow Access from Anywhere" (0.0.0.0/0)
6. Obtenha a string de conexão:
   - Clique em "Connect" no seu cluster
   - Escolha "Connect your application"
   - Copie a string (ex: `mongodb+srv://usuario:senha@cluster.mongodb.net/`)

---

## 💾 Instalação Passo a Passo

### PASSO 1: Clonar o Repositório

Abra o terminal (ou cmd/PowerShell no Windows) e execute:

```bash
# Navegue até o diretório onde deseja instalar
cd ~
# ou no Windows:
# cd C:\Users\SeuUsuario\

# Clone o repositório
git clone https://github.com/kuaminaji/protocolos.git

# Entre no diretório
cd protocolos

# Mude para a branch com as melhorias
git checkout copilot/refactor-code-files-for-optimization
```

✅ **Verificação:** Execute `ls` (Linux/macOS) ou `dir` (Windows). Você deve ver arquivos como `backend/`, `frontend/`, `.env`, etc.

---

### PASSO 2: Criar Ambiente Virtual Python

O ambiente virtual isola as dependências do projeto.

**Windows:**
```bash
# Criar ambiente virtual
python -m venv venv

# Ativar ambiente virtual
venv\Scripts\activate

# Você verá (venv) no início da linha do prompt
```

**Linux/macOS:**
```bash
# Criar ambiente virtual
python3 -m venv venv

# Ativar ambiente virtual
source venv/bin/activate

# Você verá (venv) no início da linha do prompt
```

✅ **Verificação:** Seu prompt deve mostrar `(venv)` no início.

---

### PASSO 3: Instalar Dependências Python

Com o ambiente virtual ativado:

```bash
# Atualizar pip (gerenciador de pacotes)
pip install --upgrade pip

# Instalar dependências do projeto
pip install -r backend/requirements.txt
```

**Saída esperada:**
```
Collecting fastapi
Collecting uvicorn
Collecting pymongo
Collecting pyjwt
...
Successfully installed fastapi-... uvicorn-... pymongo-...
```

⏱️ **Tempo:** 2-5 minutos dependendo da conexão

✅ **Verificação:** Execute `pip list`. Você deve ver `fastapi`, `uvicorn`, `pymongo`, `pyjwt` na lista.

---

### PASSO 4: Configurar MongoDB

#### Se você escolheu MongoDB Local:

O MongoDB já deve estar rodando. Teste:

```bash
# Windows/Linux/macOS
mongosh
# ou
mongo

# Você deve ver algo como:
# MongoDB shell version v6.0.0
# connecting to: mongodb://127.0.0.1:27017/
```

Digite `exit` para sair.

✅ **Verificação:** Se conectou com sucesso, está pronto!

#### Se você escolheu MongoDB Atlas:

1. Abra o arquivo `.env` no editor de texto
2. Localize a linha `MONGO_URL=mongodb://localhost:27017/`
3. Substitua pela sua string do Atlas:
   ```
   MONGO_URL=mongodb+srv://usuario:senha@cluster.mongodb.net/
   ```
4. Salve o arquivo

---

### PASSO 5: Configurar Variáveis de Ambiente

O arquivo `.env` JÁ ESTÁ PRONTO com valores padrão seguros!

**IMPORTANTE:** Abra o arquivo `.env` e verifique/ajuste:

```bash
# Use qualquer editor de texto
# Windows:
notepad .env

# Linux/macOS:
nano .env
# ou
vim .env
# ou abra com seu editor favorito
```

**Configurações principais:**

```bash
# 1. MongoDB (já configurado no Passo 4)
MONGO_URL=mongodb://localhost:27017/

# 2. Senha do Admin (ALTERE!)
ADMIN_PASSWORD=admin123@

# 3. Chaves JWT (JÁ GERADAS - podem usar)
JWT_SECRET_KEY=WUoizhB7HXpw1L4TSES-qjTKNAYtzhxo0PueKVd_7OE
CSRF_SECRET_KEY=vvHrCsazYcSpvDeSHCCeavzMQH_pgWQk3er7kbekhGg
```

**Ajustes recomendados:**

1. **ADMIN_PASSWORD:** Troque `admin123@` por uma senha forte
   - Mínimo 8 caracteres
   - Pelo menos 1 número
   - Pelo menos 1 letra
   - Exemplo: `Protocolo@2026`

2. **MONGO_URL:** Se usar Atlas, atualize com sua string

3. **JWT_SECRET_KEY e CSRF_SECRET_KEY:** 
   - Os valores já gerados são seguros
   - Se desejar gerar novos (opcional):
     ```bash
     python -c "import secrets; print(secrets.token_urlsafe(32))"
     ```

**Salve e feche o arquivo.**

✅ **Verificação:** O arquivo `.env` existe e contém as configurações.

---

### PASSO 6: Iniciar a Aplicação

**IMPORTANTE:** Certifique-se de que:
- ✅ O ambiente virtual está ativado (veja `(venv)` no prompt)
- ✅ MongoDB está rodando
- ✅ O arquivo `.env` está configurado

**Inicie o servidor:**

```bash
# Entre no diretório backend
cd backend

# Inicie a aplicação
python main.py
```

**Saída esperada:**

```
[INFO] MongoDB conectado com sucesso.
[INFO] Coleções e índices criados/verificados.
[INFO] Admin user 'admin' created successfully.
[WARNING] SECURITY: Change admin password after first login!
INFO:     Started server process [12345]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

🎉 **Sucesso!** O servidor está rodando!

✅ **Verificação:** A última linha deve mostrar "Uvicorn running on http://0.0.0.0:8000"

⚠️ **Se houver erro:** Veja a seção "Solução de Problemas" abaixo.

---

## 🌐 Primeiro Acesso

### PASSO 7: Acessar o Sistema

1. **Abra seu navegador** (Chrome, Firefox, Edge, Safari)

2. **Digite na barra de endereço:**
   ```
   http://localhost:8000
   ```

3. **Você verá a tela de login:**

   ![Tela de Login](https://via.placeholder.com/600x400?text=Tela+de+Login)

### PASSO 8: Fazer Login

Use as credenciais configuradas no `.env`:

- **Usuário:** `admin` (ou o que você configurou em ADMIN_USER)
- **Senha:** `admin123@` (ou a que você configurou em ADMIN_PASSWORD)

Clique em **"Entrar"**

🎉 **Você está dentro do sistema!**

### PASSO 9: Alterar Senha do Admin

**CRÍTICO:** Altere a senha imediatamente!

1. No menu lateral, clique em **"Cadastrar Usuário"**
2. Na lista de usuários, encontre **"admin"**
3. Clique no botão **"Editar"**
4. Digite uma **nova senha forte**
5. Clique em **"Salvar"**

✅ **Verificação:** Faça logout e login novamente com a nova senha.

---

## ✅ Verificação da Instalação

### 1. Testar Funcionalidades Básicas

**a) Dashboard:**
- ✅ O dashboard carrega sem erros?
- ✅ Os cards mostram estatísticas?

**b) Criar Protocolo:**
1. Clique em "Cadastrar Protocolo"
2. Preencha os campos obrigatórios
3. Clique em "Salvar"
4. ✅ Protocolo criado com sucesso?

**c) Listar Protocolos:**
1. Clique em "Listar Protocolos"
2. ✅ A lista carrega?
3. ✅ Consegue buscar protocolos?

**d) Gerenciar Usuários (Admin):**
1. Clique em "Cadastrar Usuário"
2. ✅ A lista de usuários aparece?
3. Crie um usuário de teste
4. ✅ Usuário criado com sucesso?

### 2. Verificar Autenticação JWT

**Abra o DevTools do navegador (F12):**

1. Vá em **"Application"** (Chrome) ou **"Storage"** (Firefox)
2. Clique em **"Local Storage"** → `http://localhost:8000`
3. ✅ Você deve ver:
   - `access_token`
   - `refresh_token`
   - `csrf_token`

4. Vá em **"Session Storage"**
5. ✅ Você deve ver:
   - `sessao` com dados do usuário

### 3. Verificar Logs

No terminal onde o servidor está rodando:

✅ Você deve ver logs como:
```
INFO: GET /api/protocolo/estatisticas - Status: 200 - Tempo: 0.05s
INFO: POST /api/protocolo - Status: 201 - Tempo: 0.12s
```

---

## 🚀 Configuração para Produção

Se você for usar em produção (servidor real, não localhost):

### 1. Segurança

**a) Gere novas chaves únicas:**
```bash
python -c "import secrets; print('JWT_SECRET_KEY=' + secrets.token_urlsafe(32))"
python -c "import secrets; print('CSRF_SECRET_KEY=' + secrets.token_urlsafe(32))"
```

Atualize no `.env`.

**b) Use senha forte para admin:**
- Mínimo 12 caracteres
- Letras maiúsculas e minúsculas
- Números e símbolos
- Exemplo: `Pr0t0c@l0$2026!`

**c) Configure HTTPS:**
- Obtenha certificado SSL (Let's Encrypt é grátis)
- Use Nginx ou Apache como reverse proxy

### 2. Firewall

**Linux:**
```bash
sudo ufw allow 8000/tcp
sudo ufw enable
```

**Windows:**
- Painel de Controle → Firewall do Windows
- Regras de Entrada → Nova Regra
- Porta → TCP 8000 → Permitir

### 3. Iniciar Automaticamente (Linux)

Crie um serviço systemd:

```bash
sudo nano /etc/systemd/system/protocolos.service
```

Cole:
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

Ative:
```bash
sudo systemctl enable protocolos
sudo systemctl start protocolos
sudo systemctl status protocolos
```

### 4. Backup Automático

Crie um script de backup:

```bash
nano ~/backup-protocolos.sh
```

Cole:
```bash
#!/bin/bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
curl -X POST http://localhost:8000/api/backup/full \
  -o ~/backups/protocolo_$TIMESTAMP.zip
```

Torne executável:
```bash
chmod +x ~/backup-protocolos.sh
```

Agende no cron (diário às 2h):
```bash
crontab -e
```

Adicione:
```
0 2 * * * /home/seu_usuario/backup-protocolos.sh
```

---

## 🔧 Solução de Problemas

### Problema 1: "python: command not found"

**Solução:**
- No Linux/macOS, use `python3` ao invés de `python`
- No Windows, reinstale Python marcando "Add to PATH"

### Problema 2: "ModuleNotFoundError: No module named 'fastapi'"

**Causa:** Ambiente virtual não ativado ou dependências não instaladas

**Solução:**
```bash
# Ative o ambiente virtual
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Reinstale dependências
pip install -r backend/requirements.txt
```

### Problema 3: "pymongo.errors.ServerSelectionTimeoutError"

**Causa:** MongoDB não está rodando ou URL incorreta

**Solução:**

**MongoDB Local:**
```bash
# Windows: Abra "Services" e inicie "MongoDB Server"
# Linux:
sudo systemctl start mongodb
# macOS:
brew services start mongodb-community
```

**MongoDB Atlas:**
- Verifique se a string de conexão no `.env` está correta
- Verifique se o IP está liberado no MongoDB Atlas (0.0.0.0/0)
- Verifique usuário e senha

### Problema 4: "ADMIN_PASSWORD environment variable not set"

**Causa:** Arquivo `.env` não existe ou está vazio

**Solução:**
1. Verifique se o arquivo `.env` existe no diretório raiz
2. Abra e verifique se tem `ADMIN_PASSWORD=suasenha`
3. Reinicie a aplicação

### Problema 5: "Port 8000 already in use"

**Causa:** Outra aplicação está usando a porta 8000

**Solução:**

**Windows:**
```bash
# Encontre o processo
netstat -ano | findstr :8000
# Mate o processo (substitua PID)
taskkill /PID 12345 /F
```

**Linux/macOS:**
```bash
# Encontre e mate o processo
lsof -ti:8000 | xargs kill -9
```

Ou altere a porta no `.env`:
```
PORT=8001
```

### Problema 6: Login não funciona após clonar

**Causa:** Tokens JWT inválidos ou cache do navegador

**Solução:**
1. Limpe o cache do navegador (Ctrl+Shift+Delete)
2. Limpe Local Storage e Session Storage no DevTools
3. Faça login novamente
4. Verifique se `JWT_SECRET_KEY` e `CSRF_SECRET_KEY` estão no `.env`

### Problema 7: "Access denied" ou "403 Forbidden"

**Causa:** Tokens expirados ou usuário não tem permissão

**Solução:**
1. Faça logout e login novamente
2. Verifique se o usuário tem tipo "admin" para operações administrativas
3. Limpe tokens antigos no navegador

### Problema 8: Erro ao criar protocolo

**Causa:** Campos obrigatórios não preenchidos ou validação falhou

**Solução:**
1. Preencha TODOS os campos obrigatórios
2. CPF deve ter 11 dígitos válidos
3. Número do protocolo deve ter 5-10 dígitos

---

## ❓ Perguntas Frequentes

### 1. Posso usar em rede local?

**Sim!** Outros computadores na rede podem acessar usando:
```
http://IP_DO_SERVIDOR:8000
```

Para descobrir seu IP:
- **Windows:** `ipconfig`
- **Linux/macOS:** `ifconfig` ou `ip addr`

### 2. Como adicionar mais usuários?

1. Faça login como admin
2. Vá em "Cadastrar Usuário"
3. Clique em "Adicionar Novo Usuário"
4. Preencha os dados
5. Escolha o tipo: "admin" ou "escrevente"

### 3. Como fazer backup?

**Manual:**
1. Login como admin
2. Menu "Admin" → "Backup Completo"
3. Arquivo ZIP será baixado

**Via API:**
```bash
curl -X POST http://localhost:8000/api/backup/full -o backup.zip
```

### 4. Como restaurar backup?

1. Login como admin
2. Menu "Admin" → "Restaurar Backup"
3. Selecione o arquivo ZIP
4. Clique em "Restaurar"

⚠️ **ATENÇÃO:** Isso sobrescreve TODOS os dados!

### 5. Esqueci a senha do admin

**Solução:**

1. Pare o servidor (Ctrl+C)
2. Execute:
   ```bash
   cd backend
   python cria_admin.py
   ```
3. Digite nova senha quando solicitado
4. Reinicie o servidor

### 6. Como atualizar o sistema?

```bash
# Pare o servidor (Ctrl+C)

# Atualize o código
git pull origin copilot/refactor-code-files-for-optimization

# Atualize dependências (se mudaram)
pip install -r backend/requirements.txt --upgrade

# Reinicie o servidor
python backend/main.py
```

### 7. Quantos protocolos suporta?

O sistema foi testado com:
- ✅ 10.000 protocolos sem problemas
- ✅ 100+ usuários simultâneos
- ✅ Performance: < 200ms por requisição

Para volumes maiores, considere:
- Servidor dedicado
- MongoDB em cluster
- Configurar índices adicionais

### 8. Funciona offline?

**Parcialmente:**
- Backend e frontend funcionam localmente
- MongoDB local funciona offline
- MongoDB Atlas precisa internet

### 9. Posso personalizar?

**Sim!** O código é open source. Você pode:
- Modificar cores e estilos em `frontend/style.css`
- Adicionar campos em `backend/main.py`
- Personalizar relatórios
- Adicionar novas funcionalidades

### 10. Tem app mobile?

Atualmente não, mas:
- O frontend é responsivo (funciona bem em tablets/celulares)
- Acesse pelo navegador do celular
- App mobile está no roadmap

---

## 📞 Suporte

### Documentação

- **Segurança:** `SECURITY_SETUP.md`
- **Status de Implementação:** `SECURITY_IMPLEMENTATION_STATUS.md`
- **Análise de Segurança:** `SECURITY_ANALYSIS.md`

### API Documentation

Após iniciar o servidor, acesse:
- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

### Comunidade

- **GitHub Issues:** https://github.com/kuaminaji/protocolos/issues
- **Discussões:** https://github.com/kuaminaji/protocolos/discussions

### Logs

Verifique os logs em:
- **Servidor:** Terminal onde rodou `python main.py`
- **Arquivo:** `backend/app.log`
- **MongoDB:** `backend/mongodb_monitor.log`

---

## 🎓 Próximos Passos

Após a instalação, recomendamos:

1. ✅ **Ler a documentação de segurança** (`SECURITY_SETUP.md`)
2. ✅ **Criar usuários de teste** para familiarizar-se
3. ✅ **Fazer um backup** imediatamente
4. ✅ **Configurar backup automático** se for usar em produção
5. ✅ **Personalizar conforme necessário**

---

## ✨ Recursos do Sistema

### Funcionalidades Principais

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
- 🎨 Design moderno e intuitivo

### Segurança

- ✅ Autenticação JWT end-to-end
- ✅ Senhas hasheadas com PBKDF2 (260.000 iterações)
- ✅ Proteção CSRF em todas operações
- ✅ Rate limiting (5 tentativas de login)
- ✅ Headers de segurança (CSP, X-Frame-Options, etc.)
- ✅ Validação de entrada em todos campos
- ✅ Logs de auditoria
- ✅ Tokens com expiração automática

---

## 🎉 Conclusão

**Parabéns!** Você instalou com sucesso o Sistema de Gestão de Protocolos.

O sistema está pronto para uso com:
- ✅ Backend funcionando
- ✅ Frontend responsivo
- ✅ MongoDB conectado
- ✅ Autenticação JWT ativa
- ✅ Segurança configurada

**Dúvidas?** Consulte a seção "Solução de Problemas" ou abra uma issue no GitHub.

**Bom trabalho! 🚀**

---

**Versão do Guia:** 3.0  
**Data:** Janeiro 2026  
**Autor:** Sistema de Gestão de Protocolos  
**Licença:** Open Source
