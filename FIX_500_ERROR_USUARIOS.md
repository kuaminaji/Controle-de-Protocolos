# Guia de Correção: Erro 500 ao Visualizar Usuários

## Problema
Se você está recebendo erro **500 Internal Server Error** ao tentar visualizar usuários após a instalação, provavelmente é porque os usuários foram criados com senhas em texto plano (sem hash).

## Causa
O script `cria_admin.py` anterior criava usuários com senhas em texto plano, mas a aplicação espera senhas no formato hash PBKDF2-SHA256.

## Solução Rápida

### Opção 1: Recriar o Banco de Dados (Recomendado para instalação nova)

```bash
# 1. Parar o servidor (se estiver rodando)

# 2. Remover banco antigo
cd backend
rm protocolos.db

# 3. Recriar com senha hasheada
python3 cria_admin.py

# 4. Iniciar servidor
python3 main.py
```

### Opção 2: Atualizar Usuários Existentes (Se você tem dados importantes)

```bash
cd backend
python3 << 'EOF'
import sqlite3
import base64
import hashlib
import secrets

# Função de hash (mesma do main.py)
PBKDF2_ALG = "pbkdf2_sha256"
PBKDF2_ITER = 260_000
PBKDF2_SALT_LEN = 16

def hash_password(raw: str) -> str:
    salt = secrets.token_bytes(PBKDF2_SALT_LEN)
    dk = hashlib.pbkdf2_hmac("sha256", raw.encode("utf-8"), salt, PBKDF2_ITER)
    return f"{PBKDF2_ALG}${PBKDF2_ITER}${base64.b64encode(salt).decode()}${base64.b64encode(dk).decode()}"

# Conectar ao banco
conn = sqlite3.connect('protocolos.db')
cursor = conn.cursor()

# Buscar usuários com senha em texto plano
cursor.execute("SELECT id, usuario, senha FROM usuarios")
users = cursor.fetchall()

for user_id, usuario, senha in users:
    # Se senha não começa com "pbkdf2_sha256$", está em texto plano
    if not senha.startswith("pbkdf2_sha256$"):
        print(f"Atualizando senha de: {usuario}")
        senha_hash = hash_password(senha)
        cursor.execute("UPDATE usuarios SET senha = ? WHERE id = ?", (senha_hash, user_id))
        print(f"  ✓ Senha atualizada para hash")

conn.commit()
conn.close()
print("\n✓ Todas as senhas foram atualizadas!")
EOF
```

## Verificação

Para verificar se as senhas estão no formato correto:

```bash
cd backend
sqlite3 protocolos.db "SELECT usuario, substr(senha, 1, 50) FROM usuarios;"
```

**Resultado esperado:**
```
admin|pbkdf2_sha256$260000$...
```

**Resultado incorreto (texto plano):**
```
admin|admin123
```

## Para Instalações Futuras

Use sempre o novo `cria_admin.py` que já faz o hash automaticamente:

```bash
cd backend
python3 cria_admin.py
```

O script agora:
- ✅ Lê configurações do arquivo `.env`
- ✅ Cria senhas com hash PBKDF2-SHA256
- ✅ Funciona com SQLite e MongoDB
- ✅ Não duplica usuários

## Configuração no .env

O script usa as seguintes variáveis:

```env
DB_TYPE=sqlite                  # ou mongodb
SQLITE_DB_PATH=protocolos.db    # caminho do banco SQLite
ADMIN_USER=admin                # nome do usuário admin
ADMIN_PASSWORD=admin123@        # senha do admin (será hasheada)
```

## Ajuda

Se ainda tiver problemas:

1. **Verificar logs:**
   ```bash
   tail -f backend/app.log
   ```

2. **Verificar banco de dados:**
   ```bash
   sqlite3 backend/protocolos.db ".schema usuarios"
   sqlite3 backend/protocolos.db "SELECT * FROM usuarios;"
   ```

3. **Recriar do zero:**
   ```bash
   rm backend/protocolos.db
   python3 backend/cria_admin.py
   ```

## Formato da Senha Hash

A aplicação usa **PBKDF2-SHA256** com:
- 260.000 iterações
- Salt de 16 bytes
- Formato: `pbkdf2_sha256$260000$<salt_base64>$<hash_base64>`

Isso garante segurança mesmo se o banco de dados for comprometido.
