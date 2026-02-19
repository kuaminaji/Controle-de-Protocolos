# ✅ CORREÇÃO: instalar_windows.bat

## 🎯 Problema Resolvido

O script `instalar_windows.bat` foi corrigido para:
1. ✅ **Encontrar corretamente** o `requirements.txt` dentro da pasta `backend`
2. ✅ **Criar automaticamente** o usuário administrador padrão

---

## 📝 O Que Foi Mudado

### ANTES (❌ Problemas)
```batch
echo [1/5] Criando ambiente virtual...
# ...
echo [4/5] Instalando dependencias...
pip install -r backend\requirements.txt
# Sem verificação se o arquivo existe
# Sem criação de .env
# Sem criação do usuário admin
```

### DEPOIS (✅ Corrigido)
```batch
echo [1/6] Criando ambiente virtual...
# ...
echo [4/6] Instalando dependencias do backend...
if not exist "backend\requirements.txt" (
    echo ERRO: Arquivo backend\requirements.txt nao encontrado
    pause
    exit /b 1
)
pip install -r backend\requirements.txt

echo [5/6] Configurando arquivo .env...
if not exist ".env" (
    copy .env.example .env > nul
)

echo [6/6] Criando usuario administrador padrao...
python backend\cria_admin.py
```

---

## 🔧 Novas Funcionalidades

### 1️⃣ Verificação de Arquivo
**Adicionado nas linhas 24-28**

```batch
if not exist "backend\requirements.txt" (
    echo ERRO: Arquivo backend\requirements.txt nao encontrado
    pause
    exit /b 1
)
```

**Benefício**: Evita erro confuso se o arquivo não existir

---

### 2️⃣ Criação Automática do .env
**Adicionado nas linhas 36-43**

```batch
echo [5/6] Configurando arquivo .env...
if not exist ".env" (
    echo Criando arquivo .env a partir do .env.example...
    copy .env.example .env > nul
    echo Arquivo .env criado com configuracoes padrao
) else (
    echo Arquivo .env ja existe
)
```

**Benefício**: Usuário não precisa criar .env manualmente

---

### 3️⃣ Criação do Usuário Admin
**Adicionado nas linhas 45-50**

```batch
echo [6/6] Criando usuario administrador padrao...
python backend\cria_admin.py
if errorlevel 1 (
    echo AVISO: Falha ao criar usuario admin
    echo Voce pode criar manualmente mais tarde com: python backend\cria_admin.py
)
```

**Benefício**: Sistema pronto para uso após instalação

---

## 📊 Fluxo de Instalação

```
┌─────────────────────────────────────────────────┐
│  INSTALAÇÃO WINDOWS - FLUXO COMPLETO           │
└─────────────────────────────────────────────────┘

[1/6] Criar ambiente virtual
      ↓
[2/6] Ativar ambiente virtual  
      ↓
[3/6] Atualizar pip
      ↓
[4/6] Instalar dependências             ← VERIFICAÇÃO ADICIONADA ✅
      - Verifica se backend\requirements.txt existe
      - Instala pacotes Python necessários
      ↓
[5/6] Configurar .env                   ← NOVO ✅
      - Cria .env a partir do .env.example
      - Define DB_TYPE=sqlite
      - Define credenciais padrão
      ↓
[6/6] Criar usuário administrador       ← NOVO ✅
      - Executa backend\cria_admin.py
      - Cria usuário: admin
      - Senha: admin123@ (hasheada)
      ↓
✅ INSTALAÇÃO CONCLUÍDA!
```

---

## 🎉 Resultado Final

### Mensagem de Sucesso
```
========================================
Instalacao concluida com sucesso!
========================================

Usuario administrador criado:
  Usuario: admin
  Senha: admin123@ (altere apos primeiro login!)

Proximos passos:
1. Execute: iniciar_servidor.bat
2. Acesse: http://localhost:8000
3. Faca login e altere a senha padrao

Nota: O sistema esta configurado para usar SQLite por padrao
```

---

## 🔐 Segurança

### Hash de Senha
O usuário admin é criado com senha **hasheada** usando:

- **Algoritmo**: PBKDF2-SHA256
- **Iterações**: 260.000
- **Salt**: 16 bytes aleatórios
- **Formato**: `pbkdf2_sha256$260000$<salt>$<hash>`

**Exemplo**:
```
Senha digitada: admin123@
Armazenada no banco: pbkdf2_sha256$260000$b38PQssStgc/1hOskGwcSQ==$CkCR...
```

---

## 📋 Checklist de Instalação

Quando você executar `instalar_windows.bat`, o sistema irá:

- [ ] ✅ Criar ambiente virtual Python
- [ ] ✅ Ativar ambiente virtual
- [ ] ✅ Atualizar pip
- [ ] ✅ Verificar se backend\requirements.txt existe
- [ ] ✅ Instalar todas as dependências
- [ ] ✅ Criar arquivo .env (se não existir)
- [ ] ✅ Criar usuário admin com senha hasheada
- [ ] ✅ Mostrar credenciais de acesso
- [ ] ✅ Dar instruções de próximos passos

---

## 💻 Como Usar

### Windows
```batch
# 1. Abrir prompt de comando (cmd)
# 2. Navegar até a pasta do projeto
cd caminho\para\Controle-de-Protocolos

# 3. Executar instalação
instalar_windows.bat

# 4. Aguardar conclusão (1-3 minutos)

# 5. Iniciar servidor
iniciar_servidor.bat

# 6. Acessar navegador
http://localhost:8000
```

### Credenciais Padrão
- **Usuário**: `admin`
- **Senha**: `admin123@`
- **⚠️ IMPORTANTE**: Altere a senha após o primeiro login!

---

## 🆘 Solução de Problemas

### Erro: "Python não encontrado"
**Solução**: Instale Python 3.8+ e adicione ao PATH

### Erro: "backend\requirements.txt não encontrado"
**Solução**: Execute o script da pasta raiz do projeto (onde está o .bat)

### Erro: "Falha ao criar usuario admin"
**Solução**: Execute manualmente: `python backend\cria_admin.py`

### .env não foi criado
**Solução**: Copie manualmente: `copy .env.example .env`

---

## 📚 Arquivos Relacionados

- `instalar_windows.bat` - Script de instalação (corrigido)
- `backend\requirements.txt` - Dependências Python
- `backend\cria_admin.py` - Criação do usuário admin
- `.env.example` - Template de configuração
- `iniciar_servidor.bat` - Inicia o servidor

---

## ✨ Melhorias Implementadas

| # | Melhoria | Antes | Depois |
|---|----------|-------|--------|
| 1 | Verificação de requirements | ❌ | ✅ |
| 2 | Criação de .env | ❌ | ✅ |
| 3 | Criação de admin | ❌ | ✅ |
| 4 | Mensagens claras | ⚠️ | ✅ |
| 5 | Steps numerados | 1-4/5 | 1-6/6 |
| 6 | Instruções SQLite | ❌ | ✅ |

---

**Status**: ✅ **CORRIGIDO E TESTADO**

**Data**: 19 de Fevereiro de 2026

**Versão**: 2.0 (com criação automática de usuário)
