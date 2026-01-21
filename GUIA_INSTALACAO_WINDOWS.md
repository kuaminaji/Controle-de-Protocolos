# 📦 Guia de Instalação - Sistema de Gestão de Protocolos

## 🎯 Guia Completo de Instalação - Windows, Linux e macOS

Este guia fornece instruções passo a passo para instalar e configurar o Sistema de Gestão de Protocolos em qualquer sistema operacional.

---

## 📋 Sumário

1. [Instalação no Windows](#-instalação-no-windows) ⭐ **COMECE AQUI**
2. [Instalação no Linux](#-instalação-no-linux)
3. [Instalação no macOS](#-instalação-no-macos)
4. [Solução de Problemas](#-solução-de-problemas)
5. [Perguntas Frequentes](#-perguntas-frequentes)

---

## 🪟 Instalação no Windows

### Pré-requisitos

Você precisará instalar:

1. **Python 3.8 ou superior**
   - Baixe em: https://www.python.org/downloads/
   - ✅ **IMPORTANTE**: Marque "Add Python to PATH" durante a instalação!

2. **MongoDB Community Edition**
   - Baixe em: https://www.mongodb.com/try/download/community
   - Escolha versão: Windows x64
   - Durante instalação: marque "Install MongoDB as a Service"

3. **Git** (opcional, mas recomendado)
   - Baixe em: https://git-scm.com/download/win

### Passo 1: Clonar o Repositório

Abra o **PowerShell** ou **Prompt de Comando**:

```powershell
# Navegar para onde deseja instalar (exemplo: C:\)
cd C:\

# Clonar repositório
git clone https://github.com/kuaminaji/protocolos.git

# Entrar na pasta
cd protocolos
```

**Alternativa sem Git**: Baixe o ZIP do GitHub e extraia para `C:\protocolos`

### Passo 2: Instalação Automática

Usaremos o script de instalação automático:

```powershell
# Entrar na pasta de instalação
cd install

# Executar script de instalação (AGUARDE 2-3 minutos)
.\instalar_windows.bat
```

O script irá:
- ✅ Criar ambiente virtual Python
- ✅ Instalar todas as dependências
- ✅ Validar a instalação

**Saída esperada:**
```
==============================================
  Instalador - Sistema de Protocolos
==============================================
[1/4] Criando ambiente virtual...
[2/4] Ativando ambiente virtual...
[3/4] Instalando dependências...
[4/4] Validando instalação...
==============================================
  Instalação concluída com sucesso!
==============================================
```

### Passo 3: Iniciar MongoDB

O MongoDB deve iniciar automaticamente como serviço. Para verificar:

```powershell
# Verificar se MongoDB está rodando
net start | findstr MongoDB
```

Se não estiver rodando:
```powershell
# Iniciar serviço MongoDB
net start MongoDB
```

### Passo 4: Verificar Configuração

O arquivo `.env` já vem configurado! Verifique se existe:

```powershell
# Voltar para pasta raiz
cd ..

# Verificar arquivo .env
type .env
```

**Credenciais padrão** (já configuradas no `.env`):
- **Usuário**: `admin`
- **Senha**: `admin123@`

⚠️ **IMPORTANTE**: Estas credenciais são criadas automaticamente na primeira vez que iniciar o servidor!

### Passo 5: Iniciar o Servidor

```powershell
# Executar script de inicialização
.\iniciar_servidor.bat
```

**Saída esperada:**
```
==============================================
  Sistema de Gestão de Protocolos
==============================================

Ativando ambiente virtual...
Iniciando servidor na porta 8000...

2026-01-16 17:00:00,000 - __main__ - INFO - [MongoDB] Conectado na tentativa 1
INFO:     Started server process [12345]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)

==============================================
Servidor iniciado com sucesso!
Acesse: http://localhost:8000
==============================================
```

### Passo 6: Acessar o Sistema

1. Abra seu navegador
2. Acesse: **http://localhost:8000**
3. Faça login com:
   - **Usuário**: `admin`
   - **Senha**: `admin123@`

✅ **PRONTO!** Sistema instalado e funcionando!

### Passo 7: Trocar Senha do Admin

**MUITO IMPORTANTE** - Troque a senha padrão:

1. Faça login no sistema
2. Clique no ícone de usuário (canto superior direito)
3. Vá em "Gerenciar Usuários"
4. Clique em "Editar" no usuário admin
5. Digite uma nova senha forte
6. Salve as alterações

---

## 🐧 Instalação no Linux

### Pré-requisitos

```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Python 3 e pip
sudo apt install python3 python3-pip python3-venv git -y

# Instalar MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt update
sudo apt install mongodb-org -y

# Iniciar MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod
```

### Instalação

```bash
# Clonar repositório
cd ~
git clone https://github.com/kuaminaji/protocolos.git
cd protocolos

# Executar instalação automática
cd install
chmod +x instalar_linux.sh
./instalar_linux.sh

# Voltar para raiz
cd ..

# Iniciar servidor
chmod +x iniciar_servidor.sh
./iniciar_servidor.sh
```

**Acesse**: http://localhost:8000

**Login**:
- Usuário: `admin`
- Senha: `admin123@`

---

## 🍎 Instalação no macOS

### Pré-requisitos

```bash
# Instalar Homebrew (se não tiver)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Instalar Python 3
brew install python@3.11

# Instalar MongoDB
brew tap mongodb/brew
brew install mongodb-community@6.0

# Iniciar MongoDB
brew services start mongodb-community@6.0
```

### Instalação

```bash
# Clonar repositório
cd ~
git clone https://github.com/kuaminaji/protocolos.git
cd protocolos

# Executar instalação automática
cd install
chmod +x instalar_linux.sh
./instalar_linux.sh

# Voltar para raiz
cd ..

# Iniciar servidor
chmod +x iniciar_servidor.sh
./iniciar_servidor.sh
```

**Acesse**: http://localhost:8000

**Login**:
- Usuário: `admin`
- Senha: `admin123@`

---

## 🔧 Solução de Problemas

### Problema 1: "Python não é reconhecido"

**Windows:**
```powershell
# Verificar se Python está instalado
python --version

# Se não funcionar, adicionar ao PATH:
# 1. Painel de Controle > Sistema > Configurações Avançadas
# 2. Variáveis de Ambiente
# 3. Adicionar: C:\Users\SeuUsuario\AppData\Local\Programs\Python\Python311
```

**Linux/macOS:**
```bash
# Usar python3 ao invés de python
python3 --version
```

### Problema 2: "Erro ao conectar no MongoDB"

**Windows:**
```powershell
# Verificar se MongoDB está rodando
net start | findstr MongoDB

# Se não estiver:
net start MongoDB
```

**Linux:**
```bash
# Verificar status
sudo systemctl status mongod

# Iniciar se necessário
sudo systemctl start mongod
```

**macOS:**
```bash
# Verificar status
brew services list | grep mongodb

# Iniciar se necessário
brew services start mongodb-community@6.0
```

### Problema 3: "ModuleNotFoundError"

Significa que as dependências não foram instaladas:

```bash
# Windows (dentro da pasta protocolos)
venv\Scripts\activate
pip install -r backend\requirements.txt

# Linux/macOS
source venv/bin/activate
pip install -r backend/requirements.txt
```

### Problema 4: "Porta 8000 já está em uso"

**Windows:**
```powershell
# Encontrar processo usando porta 8000
netstat -ano | findstr :8000

# Matar processo (substitua PID pelo número encontrado)
taskkill /PID <PID> /F
```

**Linux/macOS:**
```bash
# Encontrar processo
lsof -i :8000

# Matar processo
kill -9 <PID>
```

### Problema 5: "Não consigo fazer login"

1. Verifique que está usando as credenciais corretas:
   - Usuário: `admin`
   - Senha: `admin123@`

2. Se esqueceu a senha, recrie o usuário admin:
   ```bash
   # Parar o servidor (Ctrl+C)
   
   # Conectar no MongoDB
   mongosh
   
   # Usar banco de dados
   use protocolos_db
   
   # Deletar usuário admin
   db.usuarios.deleteOne({usuario: "admin"})
   
   # Sair
   exit
   
   # Reiniciar servidor - novo admin será criado
   ```

### Problema 6: Avisos do Pydantic

Se aparecer avisos sobre `@validator` deprecated:

✅ **Já corrigido na versão atual!** Apenas ignore os avisos ou atualize o código do branch.

### Problema 7: Erros 401 ou 422

✅ **Já corrigido na versão atual!** Certifique-se de:
1. Ter feito login no sistema
2. Não ter expirado a sessão
3. Recarregar a página se necessário

---

## ❓ Perguntas Frequentes

### 1. Posso usar MongoDB Atlas (cloud) ao invés do local?

Sim! Edite o arquivo `.env`:

```bash
# Comentar linha do MongoDB local:
# MONGO_URL=mongodb://localhost:27017/

# Adicionar string de conexão do Atlas:
MONGO_URL=mongodb+srv://usuario:senha@cluster.mongodb.net/
```

### 2. Como mudar a porta do servidor?

Edite o arquivo `.env`:

```bash
# Trocar de 8000 para outra porta (exemplo: 3000)
PORT=3000
```

### 3. Como acessar de outros computadores na rede?

1. No `.env`, certifique-se que:
   ```bash
   HOST=0.0.0.0
   ```

2. Libere a porta no firewall:
   
   **Windows:**
   ```powershell
   netsh advfirewall firewall add rule name="Protocolos" dir=in action=allow protocol=TCP localport=8000
   ```
   
   **Linux:**
   ```bash
   sudo ufw allow 8000/tcp
   ```

3. Descubra seu IP local:
   
   **Windows:**
   ```powershell
   ipconfig
   ```
   
   **Linux/macOS:**
   ```bash
   ip addr show  # Linux
   ifconfig      # macOS
   ```

4. Outros computadores acessam via: `http://SEU_IP:8000`

### 4. Como fazer backup do banco de dados?

Use a interface web:
1. Login como admin
2. Vá em "Backup e Restauração"
3. Clique em "Baixar Backup"

Ou via linha de comando:

**Windows:**
```powershell
"C:\Program Files\MongoDB\Server\6.0\bin\mongodump.exe" --db=protocolos_db --out=C:\backup
```

**Linux/macOS:**
```bash
mongodump --db=protocolos_db --out=~/backup
```

### 5. Como atualizar o sistema?

```bash
# Parar o servidor (Ctrl+C)

# Fazer backup do banco (use interface ou comando acima)

# Atualizar código
git pull origin main

# Reinstalar dependências
# Windows:
venv\Scripts\activate
pip install -r backend\requirements.txt

# Linux/macOS:
source venv/bin/activate
pip install -r backend/requirements.txt

# Reiniciar servidor
```

### 6. Posso rodar em produção?

Sim, mas recomendamos:

1. **Trocar senha do admin** para uma senha muito forte
2. **Gerar novas chaves JWT/CSRF** no `.env`:
   ```bash
   python -c "import secrets; print(secrets.token_urlsafe(32))"
   ```
3. **Configurar HTTPS** (certificado SSL)
4. **Configurar firewall** (liberar apenas portas necessárias)
5. **Usar MongoDB Atlas** para backups automáticos
6. **Configurar systemd** (Linux) ou serviço Windows para inicialização automática

Veja `SECURITY_SETUP.md` para detalhes completos de produção.

### 7. Como desinstalar?

**Windows:**
```powershell
# Parar servidor (Ctrl+C)

# Parar MongoDB
net stop MongoDB

# (Opcional) Desinstalar MongoDB via Painel de Controle

# Deletar pasta
cd C:\
rmdir /s /q protocolos
```

**Linux/macOS:**
```bash
# Parar servidor (Ctrl+C)

# Parar MongoDB
sudo systemctl stop mongod  # Linux
brew services stop mongodb-community@6.0  # macOS

# Deletar pasta
cd ~
rm -rf protocolos
```

### 8. Onde estão os logs?

- **Aplicação**: Logs aparecem no terminal onde rodou `iniciar_servidor`
- **MongoDB**: 
  - Windows: `C:\Program Files\MongoDB\Server\6.0\log\mongod.log`
  - Linux: `/var/log/mongodb/mongod.log`
  - macOS: `/usr/local/var/log/mongodb/mongo.log`

### 9. Como criar mais usuários?

1. Login como admin
2. Vá em "Gerenciar Usuários"
3. Clique em "Novo Usuário"
4. Preencha os dados
5. Escolha o tipo (admin ou comum)
6. Salve

### 10. Sistema está lento, o que fazer?

1. **Verificar MongoDB**:
   ```bash
   # Ver uso de CPU/memória
   # Windows: Gerenciador de Tarefas
   # Linux: htop ou top
   # macOS: Activity Monitor
   ```

2. **Limpar dados antigos** via interface web

3. **Aumentar recursos** se estiver em VM/container

4. **Verificar rede** se usando MongoDB Atlas

---

## 📞 Suporte

- **Documentação**: Veja os arquivos `.md` na pasta raiz
- **Issues**: https://github.com/kuaminaji/protocolos/issues
- **Segurança**: Veja `SECURITY_ANALYSIS.md`

---

## ✅ Checklist de Instalação

Use esta lista para verificar se tudo está funcionando:

### Pré-Instalação
- [ ] Python 3.8+ instalado
- [ ] MongoDB instalado e rodando
- [ ] Git instalado (opcional)

### Instalação
- [ ] Repositório clonado
- [ ] Script de instalação executado com sucesso
- [ ] Ambiente virtual criado
- [ ] Dependências instaladas

### Configuração
- [ ] Arquivo `.env` existe
- [ ] Credenciais do admin configuradas
- [ ] MongoDB conectado

### Primeiro Acesso
- [ ] Servidor iniciou sem erros
- [ ] Navegador abre `http://localhost:8000`
- [ ] Login com `admin` / `admin123@` funciona
- [ ] Dashboard carrega corretamente

### Segurança
- [ ] Senha do admin alterada
- [ ] JWT tokens funcionando
- [ ] Sem erros no console do navegador

---

## 🎉 Próximos Passos

Após instalação bem-sucedida:

1. ✅ **Trocar senha do admin**
2. 📖 Ler `README.md` para entender funcionalidades
3. 👥 Criar usuários adicionais
4. 📝 Começar a usar o sistema
5. 🔒 Revisar `SECURITY_SETUP.md` se for para produção

---

**Tempo estimado de instalação**: 10-15 minutos

**Dificuldade**: ⭐⭐☆☆☆ (Fácil)

**Última atualização**: 2026-01-16
