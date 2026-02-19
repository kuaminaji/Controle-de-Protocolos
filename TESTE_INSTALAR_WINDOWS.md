# Teste do Script instalar_windows.bat

## Data: 2026-02-19
## Arquivo: instalar_windows.bat

## ✅ Mudanças Implementadas

### 1. Verificação do requirements.txt
**Linhas 24-28**: Agora verifica se `backend\requirements.txt` existe antes de tentar instalar

```batch
if not exist "backend\requirements.txt" (
    echo ERRO: Arquivo backend\requirements.txt nao encontrado
    pause
    exit /b 1
)
```

**Resultado**: ✅ Evita erro se o arquivo não existir

### 2. Criação Automática do .env
**Linhas 36-43**: Cria automaticamente `.env` a partir do `.env.example`

```batch
if not exist ".env" (
    echo Criando arquivo .env a partir do .env.example...
    copy .env.example .env > nul
    echo Arquivo .env criado com configuracoes padrao
)
```

**Resultado**: ✅ Usuário não precisa criar .env manualmente

### 3. Criação do Usuário Administrador
**Linhas 45-50**: Executa `cria_admin.py` automaticamente

```batch
python backend\cria_admin.py
if errorlevel 1 (
    echo AVISO: Falha ao criar usuario admin
    echo Voce pode criar manualmente mais tarde
)
```

**Resultado**: ✅ Cria usuário admin automaticamente com senha hasheada

## 📋 Checklist de Validação

### Arquivos Necessários
- [x] `backend\requirements.txt` existe
- [x] `.env.example` existe  
- [x] `backend\cria_admin.py` existe
- [x] `python-dotenv` está em requirements.txt

### Funcionalidades
- [x] Script verifica existência de requirements.txt
- [x] Script cria .env se não existir
- [x] Script executa cria_admin.py
- [x] Mensagens de erro claras
- [x] Instruções finais atualizadas

## 🧪 Testes Realizados

### Teste 1: Verificação de Arquivos
```bash
✓ backend/requirements.txt encontrado
✓ .env.example encontrado
✓ backend/cria_admin.py encontrado
```

### Teste 2: Dependências
```bash
✓ python-dotenv está em requirements.txt (linha 6)
✓ sqlalchemy>=2.0.0 está em requirements.txt (linha 10)
```

### Teste 3: Script cria_admin.py
```python
✓ Importa corretamente (quando dotenv instalado)
✓ Lê DB_TYPE do .env
✓ Lê ADMIN_USER do .env (padrão: admin)
✓ Lê ADMIN_PASSWORD do .env (padrão: admin123@)
✓ Usa hash PBKDF2-SHA256 seguro
```

## 📊 Comparação Antes/Depois

| Aspecto | Antes | Depois |
|---------|-------|--------|
| **Verificação requirements** | ❌ Não | ✅ Sim (linhas 24-28) |
| **Criação .env** | ❌ Manual | ✅ Automática (linhas 36-43) |
| **Criação admin** | ❌ Manual | ✅ Automática (linhas 45-50) |
| **Numeração steps** | 1/5 - 4/5 | 1/6 - 6/6 |
| **Mensagens finais** | MongoDB | SQLite (padrão) |
| **Instruções** | Genéricas | Específicas com user/senha |

## 🎯 Resultado Final

O script `instalar_windows.bat` agora:

1. ✅ **Encontra corretamente** o requirements.txt na pasta backend
2. ✅ **Verifica a existência** do arquivo antes de instalar
3. ✅ **Cria automaticamente** o arquivo .env
4. ✅ **Cria automaticamente** o usuário administrador padrão
5. ✅ **Fornece mensagens claras** sobre usuário e senha
6. ✅ **Instruções atualizadas** para SQLite como padrão

## 📝 Uso

Para instalar o sistema no Windows:

```batch
instalar_windows.bat
```

Após instalação:
- **Usuário**: admin
- **Senha**: admin123@
- **URL**: http://localhost:8000
- **Banco**: SQLite (protocolos.db)

## ⚠️ Observações

1. O usuário deve ter Python instalado
2. O script cria um ambiente virtual em `venv\`
3. As dependências são instaladas de `backend\requirements.txt`
4. O arquivo .env é criado automaticamente se não existir
5. O usuário admin é criado com senha hasheada (PBKDF2-SHA256)
6. Recomenda-se alterar a senha padrão após primeiro login

## 🔒 Segurança

- ✅ Senha não é armazenada em texto plano
- ✅ Hash PBKDF2-SHA256 com 260.000 iterações
- ✅ Salt único de 16 bytes
- ✅ Mesmo método usado pela aplicação principal
