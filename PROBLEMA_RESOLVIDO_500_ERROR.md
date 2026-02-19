# ✅ PROBLEMA RESOLVIDO: Erro 500 ao Visualizar Usuários

## Resumo da Correção

O erro **500 Internal Server Error** ao tentar visualizar usuários após a instalação foi causado por senhas armazenadas em **texto plano** no banco de dados, quando a aplicação esperava senhas no formato **hash PBKDF2-SHA256**.

## ✅ Soluções Implementadas

### 1. Script `cria_admin.py` Corrigido ✅

**Arquivo:** `backend/cria_admin.py`

**Mudanças:**
- ✅ Agora usa hash PBKDF2-SHA256 (mesmo formato da aplicação)
- ✅ Lê configurações do arquivo `.env`
- ✅ Suporta SQLite e MongoDB
- ✅ Não cria duplicatas
- ✅ Mostra formato do hash para verificação

**Uso:**
```bash
cd backend
python3 cria_admin.py
```

**Saída:**
```
============================================================
CRIAÇÃO DE USUÁRIO ADMINISTRADOR
============================================================
Banco de dados: SQLITE
Usuário: admin
Senha: admin123@
============================================================

[SQLite] ✓ Usuário 'admin' criado com sucesso!
[SQLite]   Senha: admin123@
[SQLite]   Senha hash: pbkdf2_sha256$260000$...
```

### 2. Script de Correção `fix_passwords.py` ✅

**Arquivo:** `backend/fix_passwords.py`

Para usuários que já têm banco de dados com senhas em texto plano.

**Uso:**
```bash
cd backend
python3 fix_passwords.py
```

**Funcionalidades:**
- Detecta senhas em texto plano
- Converte para formato hash
- Pede confirmação antes de alterar
- Mostra progresso detalhado
- Mantém integridade dos dados

### 3. Guia de Correção ✅

**Arquivo:** `FIX_500_ERROR_USUARIOS.md`

Guia completo com:
- Explicação do problema
- Duas opções de correção
- Comandos de verificação
- Prevenção para futuro
- Exemplos de código

## 🎯 Para Resolver Seu Problema

### Opção A: Instalação Nova (Sem Dados Importantes)

```bash
# 1. Parar servidor (se rodando)

# 2. Remover banco antigo
cd backend
rm protocolos.db

# 3. Criar novo banco com senhas hasheadas
python3 cria_admin.py

# 4. Iniciar servidor
python3 main.py

# 5. Acessar: http://localhost:8000
# Login: admin / admin123@
```

### Opção B: Corrigir Banco Existente (Preservar Dados)

```bash
# 1. Parar servidor

# 2. Fazer backup (recomendado)
cd backend
cp protocolos.db protocolos_backup.db

# 3. Executar script de correção
python3 fix_passwords.py
# Responda 's' para confirmar alterações

# 4. Reiniciar servidor
python3 main.py
```

## 🔍 Verificação

### Verificar se senhas estão hasheadas:

```bash
cd backend
sqlite3 protocolos.db "SELECT usuario, substr(senha, 1, 50) FROM usuarios;"
```

**Resultado esperado (correto):**
```
admin|pbkdf2_sha256$260000$...
```

**Resultado incorreto (problema):**
```
admin|admin123
```

## 📊 Formato da Senha Hash

As senhas agora usam **PBKDF2-SHA256**:
- **260.000 iterações** (segurança alta)
- **Salt aleatório** de 16 bytes
- **Formato:** `pbkdf2_sha256$260000$<salt_base64>$<hash_base64>`

Exemplo:
```
pbkdf2_sha256$260000$b38PQssStgc/1hOskGwcSQ==$CkCRu8FG...
```

## 🛡️ Segurança

### Por Que Hash?

**Texto Plano (INSEGURO):**
```
admin|admin123
```
❌ Se banco for comprometido, senhas ficam expostas

**Hash PBKDF2 (SEGURO):**
```
admin|pbkdf2_sha256$260000$...
```
✅ Mesmo com banco comprometido, impossível recuperar senha original

### Como Funciona?

1. **Salt único** por senha (previne rainbow tables)
2. **260.000 iterações** (torna brute force inviável)
3. **Hash irreversível** (não pode ser desfeito)
4. **Verificação** compara hash da senha digitada com hash armazenado

## 📝 Configuração (.env)

O `cria_admin.py` usa estas variáveis:

```env
# Tipo de banco de dados
DB_TYPE=sqlite                  # ou mongodb

# Caminho do banco SQLite
SQLITE_DB_PATH=protocolos.db

# Credenciais do admin
ADMIN_USER=admin
ADMIN_PASSWORD=admin123@        # Será hasheada automaticamente

# MongoDB (se usar)
MONGO_URL=mongodb://localhost:27017/
DB_NAME=protocolos_db
```

## 🚀 Prevenção Futura

Para evitar este problema novamente:

1. **Sempre use** `cria_admin.py` atualizado
2. **Configure** `.env` antes de criar usuários
3. **Nunca insira** senhas diretamente no banco
4. **Verifique** formato da senha após criação
5. **Faça backup** antes de qualquer alteração

## ✅ Checklist de Resolução

- [ ] Fazer backup do banco de dados atual
- [ ] Escolher opção A (recriar) ou B (corrigir)
- [ ] Executar comando apropriado
- [ ] Verificar senhas estão hasheadas
- [ ] Reiniciar servidor
- [ ] Testar login
- [ ] Alterar senha padrão após login

## 📚 Arquivos Relacionados

1. **`backend/cria_admin.py`** - Script para criar admin (corrigido)
2. **`backend/fix_passwords.py`** - Script para corrigir senhas existentes
3. **`FIX_500_ERROR_USUARIOS.md`** - Guia detalhado de correção
4. **`.env`** - Configuração da aplicação

## 🆘 Suporte

Se ainda tiver problemas:

1. **Verificar logs:**
   ```bash
   tail -f backend/app.log
   ```

2. **Verificar banco:**
   ```bash
   sqlite3 backend/protocolos.db ".tables"
   sqlite3 backend/protocolos.db "SELECT * FROM usuarios;"
   ```

3. **Limpar e recomeçar:**
   ```bash
   rm backend/protocolos.db
   python3 backend/cria_admin.py
   python3 backend/main.py
   ```

## 🎉 Problema Resolvido!

Com estas mudanças:
- ✅ Senhas são sempre hasheadas corretamente
- ✅ Aplicação não dá mais erro 500
- ✅ Segurança melhorada significativamente
- ✅ Processo de instalação simplificado
- ✅ Ferramentas para correção disponíveis

---

**Data da Correção:** 19 de Fevereiro de 2026
**Status:** ✅ Resolvido e Testado
**Compatibilidade:** SQLite e MongoDB
