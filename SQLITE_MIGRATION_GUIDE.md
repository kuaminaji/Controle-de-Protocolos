# Guia de Migração: MongoDB → SQLite

## Visão Geral

Este guia explica como migrar sua instalação existente do MongoDB para SQLite, ou como instalar uma nova instância usando SQLite.

## Por que SQLite?

### Vantagens do SQLite:
- ✅ **Sem dependências externas** - Não precisa instalar MongoDB
- ✅ **Mais simples** - Um único arquivo de banco de dados
- ✅ **Fácil backup** - Copie o arquivo `protocolos.db`
- ✅ **Portátil** - Funciona em Windows, Linux, macOS
- ✅ **Menos recursos** - Usa menos memória e CPU
- ✅ **Desenvolvimento local** - Ideal para testes e desenvolvimento

### Quando usar MongoDB:
- 🔄 Alta concorrência (muitos usuários simultâneos)
- 🔄 Grandes volumes de dados (milhões de protocolos)
- 🔄 Replicação e alta disponibilidade necessária
- 🔄 Já está instalado e configurado

## Instalação Nova com SQLite

### 1. Clonar/Baixar o Repositório
```bash
git clone https://github.com/kuaminaji/Controle-de-Protocolos.git
cd Controle-de-Protocolos
```

### 2. Instalar Dependências Python
```bash
cd backend
pip install -r requirements.txt
```

### 3. Configurar Variáveis de Ambiente
Crie o arquivo `.env` na raiz do projeto:
```bash
# Copiar exemplo
cp .env.example .env

# Editar .env
nano .env  # ou use seu editor preferido
```

Configuração mínima para SQLite:
```env
# Banco de Dados
DB_TYPE=sqlite
SQLITE_DB_PATH=protocolos.db

# Credenciais Admin (primeira inicialização)
ADMIN_USER=admin
ADMIN_PASSWORD=SuaSenhaForte123!

# Segurança (gere chaves únicas!)
JWT_SECRET_KEY=sua_chave_secreta_jwt_aqui
CSRF_SECRET_KEY=sua_chave_secreta_csrf_aqui
```

**Gerar chaves secretas:**
```bash
python3 -c "import secrets; print('JWT_SECRET_KEY=' + secrets.token_urlsafe(32))"
python3 -c "import secrets; print('CSRF_SECRET_KEY=' + secrets.token_urlsafe(32))"
```

### 4. Iniciar o Servidor
```bash
# No diretório backend
python3 main.py

# OU usando uvicorn
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 5. Acessar a Aplicação
Abra o navegador em: `http://localhost:8000`

## Migração de MongoDB para SQLite

### Opção 1: Exportar e Importar Dados

#### Passo 1: Fazer Backup dos Dados do MongoDB
```bash
# Com MongoDB rodando
cd backend
python3 << 'EOF'
import os
os.environ['DB_TYPE'] = 'mongodb'
os.environ['MONGO_URL'] = 'mongodb://localhost:27017/'
os.environ['DB_NAME'] = 'protocolos_db'

from pymongo import MongoClient
import json
from datetime import datetime

client = MongoClient(os.getenv('MONGO_URL'))
db = client[os.getenv('DB_NAME')]

# Exportar cada coleção
collections = ['protocolos', 'usuarios', 'categorias', 'notificacoes', 'filtros', 'protocolos_excluidos']

backup_data = {}
for coll_name in collections:
    print(f"Exportando {coll_name}...")
    docs = list(db[coll_name].find())
    
    # Converter ObjectId para string
    for doc in docs:
        doc['_id'] = str(doc['_id'])
        # Converter datetime para string
        for key, value in doc.items():
            if isinstance(value, datetime):
                doc[key] = value.isoformat()
    
    backup_data[coll_name] = docs
    print(f"  ✓ {len(docs)} documentos exportados")

# Salvar em arquivo JSON
with open('mongodb_backup.json', 'w', encoding='utf-8') as f:
    json.dump(backup_data, f, ensure_ascii=False, indent=2)

print("\n✓ Backup salvo em mongodb_backup.json")
EOF
```

#### Passo 2: Importar para SQLite
```bash
# Atualizar .env para SQLite
sed -i 's/DB_TYPE=mongodb/DB_TYPE=sqlite/' .env

# OU editar manualmente
echo "DB_TYPE=sqlite" > .env
echo "SQLITE_DB_PATH=protocolos.db" >> .env

# Importar dados
python3 << 'EOF'
import os
os.environ['DB_TYPE'] = 'sqlite'
os.environ['SQLITE_DB_PATH'] = 'protocolos.db'

import json
from datetime import datetime
from db_adapter import get_db_collections

# Carregar backup
with open('mongodb_backup.json', 'r', encoding='utf-8') as f:
    backup_data = json.load(f)

# Obter collections do SQLite
collections_dict = get_db_collections()

# Importar cada coleção
collection_map = {
    'protocolos': 'protocolos_coll',
    'usuarios': 'usuarios_coll',
    'categorias': 'categorias_coll',
    'notificacoes': 'notificacoes_coll',
    'filtros': 'filtros_coll',
    'protocolos_excluidos': 'protocolos_excluidos_coll'
}

for coll_name, coll_key in collection_map.items():
    if coll_name in backup_data:
        print(f"Importando {coll_name}...")
        coll = collections_dict[coll_key]
        docs = backup_data[coll_name]
        
        for doc in docs:
            # Remover _id do MongoDB (SQLite gerará novo)
            if '_id' in doc:
                del doc['_id']
            
            # Converter strings ISO para datetime onde necessário
            for key, value in doc.items():
                if isinstance(value, str) and 'dt' in key:
                    try:
                        doc[key] = datetime.fromisoformat(value)
                    except:
                        pass
            
            try:
                coll.insert_one(doc)
            except Exception as e:
                print(f"  ⚠ Erro ao importar documento: {e}")
        
        print(f"  ✓ {len(docs)} documentos importados")

print("\n✓ Migração concluída!")
EOF
```

### Opção 2: Começar do Zero com SQLite

Se preferir começar com banco de dados limpo:

1. **Renomear/remover banco MongoDB** (opcional):
   ```bash
   # Apenas ajuste .env para usar SQLite
   DB_TYPE=sqlite
   SQLITE_DB_PATH=protocolos.db
   ```

2. **Iniciar servidor** - Criará novo banco SQLite vazio:
   ```bash
   python3 main.py
   ```

3. **Login** com usuário admin criado automaticamente

## Estrutura do Banco de Dados SQLite

### Tabelas Criadas Automaticamente:

1. **usuarios** - Usuários do sistema
   - id (PK), usuario (unique), senha, tipo, bloqueado

2. **protocolos** - Protocolos (registro principal)
   - Todos os campos do protocolo
   - Campos de exigências (exig1, exig2, exig3)
   - Histórico em formato JSON
   - Índices para busca rápida

3. **categorias** - Categorias/Setores
   - id (PK), nome (unique), descricao

4. **notificacoes** - Notificações
   - id (PK), usuario, mensagem, tipo, lida, data_criacao

5. **filtros** - Filtros salvos
   - id (PK), usuario, nome, filtros (JSON)

6. **protocolos_excluidos** - Auditoria de exclusões
   - id (PK), numero, admin_responsavel, protocolo_original (JSON)

### Localização do Arquivo

Por padrão: `backend/protocolos.db`

Você pode configurar outro local no `.env`:
```env
SQLITE_DB_PATH=/caminho/completo/para/banco.db
```

## Backup e Restauração

### Backup (SQLite)
```bash
# Opção 1: Copiar arquivo
cp backend/protocolos.db backup_$(date +%Y%m%d).db

# Opção 2: Usando SQLite CLI
sqlite3 backend/protocolos.db ".backup backup_$(date +%Y%m%d).db"

# Opção 3: Usar interface web
# http://localhost:8000 -> Menu -> Backup & Restaurar
```

### Restauração (SQLite)
```bash
# Parar servidor
# Copiar backup de volta
cp backup_20260219.db backend/protocolos.db
# Reiniciar servidor
```

## Comparação de Performance

### SQLite (Recomendado para):
- ✅ Até 50 usuários simultâneos
- ✅ Até 100.000 protocolos
- ✅ Instalações single-server
- ✅ Desenvolvimento e testes
- ✅ Ambientes com recursos limitados

### MongoDB (Recomendado para):
- 🔄 Mais de 50 usuários simultâneos
- 🔄 Mais de 100.000 protocolos
- 🔄 Múltiplos servidores (replicação)
- 🔄 Alta disponibilidade necessária
- 🔄 Sharding e escalabilidade horizontal

## Troubleshooting

### Erro: "database is locked"
```bash
# SQLite está sendo acessado por outro processo
# Solução: Feche todos os processos que usam o banco
# ou aumente o timeout nas configurações
```

### Erro: "module not found: sqlalchemy"
```bash
# Instalar dependência
pip install 'sqlalchemy>=2.0.0'
```

### Banco não inicializa
```bash
# Verificar .env
cat .env | grep DB_TYPE

# Verificar permissões
ls -l backend/protocolos.db

# Verificar logs
tail -f backend/app.log
```

### Migração falhou parcialmente
```bash
# Remover banco SQLite e tentar novamente
rm backend/protocolos.db
# Executar script de migração novamente
```

## Suporte

Para mais informações, consulte:
- `README.md` - Documentação geral
- `INSTALLATION_GUIDE.md` - Guia de instalação completo
- `PROFESSIONAL_IMPROVEMENTS.md` - Melhorias futuras

## Notas Importantes

1. **Não usar SQLite em produção com NFS/Rede** - O arquivo deve estar em disco local
2. **Fazer backups regulares** - SQLite é um arquivo único, fácil de perder
3. **Performance** - Para ambientes de alta carga, MongoDB ainda é recomendado
4. **Migração reversível** - Você pode voltar para MongoDB a qualquer momento alterando `.env`
