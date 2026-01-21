# 🧭 Guia MongoDB Compass - Criar Usuário Admin

Este guia explica como criar o primeiro usuário administrador manualmente usando o MongoDB Compass.

## 📋 Pré-requisitos

1. **MongoDB instalado e rodando** (local ou Atlas)
2. **MongoDB Compass instalado** - [Download aqui](https://www.mongodb.com/products/compass)
3. Arquivo `mongodb_compass_admin_user.json` (incluído no repositório)

---

## 🔧 Passo a Passo

### 1️⃣ Abrir MongoDB Compass

**Windows:**
- Abra o MongoDB Compass no menu Iniciar

**Linux/macOS:**
- Execute `mongodb-compass` no terminal ou abra pela lista de aplicativos

### 2️⃣ Conectar ao MongoDB

**Conexão Local (padrão):**
```
mongodb://localhost:27017
```

**Conexão MongoDB Atlas (nuvem):**
```
mongodb+srv://<usuario>:<senha>@<cluster>.mongodb.net/
```

1. Cole a string de conexão no campo "New Connection"
2. Clique em **"Connect"**

### 3️⃣ Criar o Banco de Dados

Se o banco `protocolos_db` não existir:

1. Clique em **"CREATE DATABASE"** (botão verde)
2. Preencha:
   - **Database Name**: `protocolos_db`
   - **Collection Name**: `usuarios`
3. Clique em **"Create Database"**

### 4️⃣ Navegar até a Coleção de Usuários

1. No painel esquerdo, expanda o banco `protocolos_db`
2. Clique na coleção **`usuarios`**

### 5️⃣ Importar o Usuário Admin

#### Opção A: Importar do JSON (Recomendado)

1. Clique no botão **"ADD DATA"** (verde, no topo)
2. Selecione **"Import JSON or CSV file"**
3. Clique em **"Select File"**
4. Navegue até a pasta do projeto e selecione:
   ```
   mongodb_compass_admin_user.json
   ```
5. Clique em **"Import"**
6. ✅ **Sucesso!** O usuário admin foi criado

#### Opção B: Inserir Manualmente

1. Clique no botão **"ADD DATA"** (verde, no topo)
2. Selecione **"Insert Document"**
3. **Delete o conteúdo padrão** e cole o seguinte JSON:

```json
{
  "usuario": "admin",
  "senha": "pbkdf2:sha256:260000$sY0bBucM8tE06qUBofxKriABIOs4PcTjQj5L8MQEXQ==$vJinhzmY7u2MPMYGex2Y7aEPLNsS+MDSqfavsbcmENI=",
  "tipo": "admin"
}
```

4. Clique em **"Insert"**
5. ✅ **Sucesso!** O usuário admin foi criado

### 6️⃣ Verificar o Usuário

Na tela da coleção `usuarios`, você deve ver:

```json
{
  "_id": ObjectId("..."),
  "usuario": "admin",
  "senha": "pbkdf2_sha256$260000$...",
  "tipo": "admin"
}
```

> **Nota:** A senha está no formato PBKDF2 com 260,000 iterações (formato: `pbkdf2_sha256$iterations$salt_base64$hash_base64`)

---

## 🔐 Credenciais Padrão

Após importar o arquivo JSON, as credenciais são:

- **Usuário**: `admin`
- **Senha**: `admin123@`

> ⚠️ **IMPORTANTE**: Altere a senha após o primeiro login!

---

## 🚀 Iniciar a Aplicação

Agora que o usuário admin existe, você pode iniciar o servidor:

**Windows:**
```batch
cd protocolos
iniciar_servidor.bat
```

**Linux/macOS:**
```bash
cd protocolos
./iniciar_servidor.sh
```

**Acesse:** http://localhost:8000

**Login:**
- Usuário: `admin`
- Senha: `admin123@`

---

## 🔄 Formato da Senha

A senha no MongoDB está no formato PBKDF2 (usado pela aplicação):

```
pbkdf2_sha256$260000$<salt_base64>$<hash_base64>
```

Onde:
- `pbkdf2_sha256` = algoritmo de hash
- `260000` = número de iterações (PBKDF2_ITER)
- `<salt_base64>` = salt aleatório de 32 bytes em Base64
- `<hash_base64>` = hash da senha em Base64

**Não tente modificar manualmente!** Use a interface web para trocar a senha.

---

## 🛠️ Solução de Problemas

### ❌ "Erro ao conectar ao MongoDB"

**Solução:**
1. Verifique se o MongoDB está rodando:
   ```powershell
   # Windows
   Get-Service MongoDB
   
   # Linux/macOS
   sudo systemctl status mongod
   ```
2. Tente reiniciar o serviço:
   ```powershell
   # Windows
   Restart-Service MongoDB
   
   # Linux/macOS
   sudo systemctl restart mongod
   ```

### ❌ "Banco de dados não aparece"

**Solução:**
- Bancos vazios não aparecem no MongoDB Compass
- Crie a coleção `usuarios` primeiro (passo 3)

### ❌ "Duplicated key error"

**Solução:**
- O usuário `admin` já existe
- Para resetar:
  1. Clique no documento do admin na coleção `usuarios`
  2. Clique no ícone de **lixeira** (Delete Document)
  3. Confirme a exclusão
  4. Reimporte o JSON

### ❌ "Login não funciona após importar"

**Verificações:**
1. Certifique-se que o campo `senha` está **exatamente** como no JSON
2. Verifique se não há espaços extras no JSON
3. O tipo deve ser `"admin"` (com aspas)
4. Reinicie o servidor após criar o usuário

---

## 📝 Criar Outros Usuários

Para criar usuários adicionais:

1. **Use a interface web** (recomendado):
   - Acesse http://localhost:8000
   - Faça login como admin
   - Vá em "Gerenciar Usuários"
   - Clique em "Novo Usuário"

2. **Ou use o MongoDB Compass**:
   - Substitua `"admin"` por outro nome de usuário
   - A senha deve ser hasheada (use a aplicação para gerar)
   - Tipo pode ser `"admin"` ou `"usuario"`

---

## 🔗 Links Úteis

- [MongoDB Compass Download](https://www.mongodb.com/products/compass)
- [MongoDB Compass Documentation](https://www.mongodb.com/docs/compass/current/)
- [Guia de Instalação Completo](GUIA_INSTALACAO_WINDOWS.md)
- [Configuração de Segurança](SECURITY_SETUP.md)

---

## ✅ Checklist Final

Após criar o usuário admin no MongoDB Compass:

- [ ] Usuário `admin` criado na coleção `usuarios`
- [ ] Campo `tipo` está como `"admin"`
- [ ] Campo `senha` está no formato correto (começa com `pbkdf2:sha256:`)
- [ ] Servidor iniciado com sucesso
- [ ] Login funcionando com `admin` / `admin123@`
- [ ] Senha alterada após primeiro login

---

**Dúvidas?** Consulte o [FAQ no guia de instalação](GUIA_INSTALACAO_WINDOWS.md#-faq-perguntas-frequentes) ou abra uma issue no GitHub.
