# Sistema de Gestão de Protocolos - Versão SQLite

## 🎉 Novidade: Suporte a SQLite!

O sistema agora suporta **SQLite** como alternativa ao MongoDB, tornando a instalação muito mais simples!

## 📋 Índice

- [O que Mudou?](#o-que-mudou)
- [Instalação Rápida (SQLite)](#instalação-rápida-sqlite)
- [Migração de MongoDB](#migração-de-mongodb)
- [Configuração](#configuração)
- [Funcionalidades](#funcionalidades)
- [Backup e Restauração](#backup-e-restauração)
- [FAQ](#faq)

## O que Mudou?

### ✅ Adicionado:
- **Suporte completo a SQLite** - Banco de dados em arquivo único
- **Adaptador de banco de dados** - Interface unificada para MongoDB e SQLite
- **Migração automática** - Script para migrar dados de MongoDB para SQLite
- **Configuração simples** - Uma variável de ambiente escolhe o banco

### ✨ Mantido:
- **Todas as funcionalidades** - Zero perda de recursos
- **Interface igual** - Frontend não mudou
- **API igual** - Todos os endpoints funcionam
- **Suporte MongoDB** - Ainda pode usar MongoDB se preferir

## Instalação Rápida (SQLite)

### Pré-requisitos
- Python 3.8 ou superior
- pip (gerenciador de pacotes Python)

### Passo 1: Baixar o Código
```bash
git clone https://github.com/kuaminaji/Controle-de-Protocolos.git
cd Controle-de-Protocolos
```

### Passo 2: Instalar Dependências
```bash
cd backend
pip install -r requirements.txt
```

### Passo 3: Configurar
```bash
# Copiar arquivo de exemplo
cp ../.env.example ../.env

# Editar configuração
nano ../.env  # ou use notepad/gedit/vim
```

Configuração mínima:
```env
DB_TYPE=sqlite
SQLITE_DB_PATH=protocolos.db
ADMIN_USER=admin
ADMIN_PASSWORD=SuaSenhaForte123!
```

### Passo 4: Iniciar
```bash
python3 main.py
```

### Passo 5: Acessar
Abra o navegador em: `http://localhost:8000`

**Pronto! 🎉**

## Migração de MongoDB

Se você já usa o sistema com MongoDB e quer migrar para SQLite:

### Opção 1: Usar Script de Migração (Recomendado)

```bash
# Na raiz do projeto
python3 migrate_to_sqlite.py full \
    --mongo-url mongodb://localhost:27017/ \
    --db-name protocolos_db \
    --sqlite backend/protocolos.db
```

### Opção 2: Migração Manual

Veja o guia completo em: [SQLITE_MIGRATION_GUIDE.md](SQLITE_MIGRATION_GUIDE.md)

## Configuração

### Variáveis de Ambiente (.env)

#### Banco de Dados SQLite (Padrão)
```env
DB_TYPE=sqlite
SQLITE_DB_PATH=protocolos.db
```

#### Banco de Dados MongoDB (Opcional)
```env
DB_TYPE=mongodb
MONGO_URL=mongodb://localhost:27017/
DB_NAME=protocolos_db
```

#### Segurança (Obrigatório)
```env
ADMIN_USER=admin
ADMIN_PASSWORD=SuaSenhaForte123!
JWT_SECRET_KEY=<gere uma chave aleatória>
CSRF_SECRET_KEY=<gere uma chave aleatória>
```

**Gerar chaves:**
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

## Funcionalidades

Todas as funcionalidades existentes estão preservadas:

### ✅ Gestão de Protocolos
- Criar, editar, buscar, excluir protocolos
- Validação de CPF
- Categorização por setores
- Histórico de alterações completo
- Status: Pendente, Em andamento, Concluído, Exigência

### ✅ Exigências
- Até 3 exigências por protocolo
- Controle de datas de retirada e reapresentação
- Bloqueio de edição após inserção (apenas admin)

### ✅ Usuários e Permissões
- Tipos: Admin e Escrevente
- Autenticação segura (PBKDF2)
- Controle de acesso por tipo

### ✅ Auditoria
- Registro de todas alterações
- Auditoria de exclusões definitivas
- Consulta de protocolos excluídos
- Exportação CSV

### ✅ Notificações
- Alertas de protocolos atrasados (>30 dias)
- Notificações por exigências pendentes
- Atualização automática

### ✅ Integração WhatsApp
- Envio de status por WhatsApp
- Templates por status
- Registro de envios

### ✅ Filtros e Buscas
- Busca avançada com múltiplos critérios
- Filtros salvos por usuário
- Ordenação e paginação

### ✅ Categorias Dinâmicas
- Cadastro de categorias/setores
- Admin pode adicionar/editar/remover

### ✅ Backup e Restauração
- Backup completo do banco
- Restauração via interface web
- Backup completo do sistema (.zip)

## Backup e Restauração

### SQLite

**Backup simples:**
```bash
cp backend/protocolos.db backup_$(date +%Y%m%d).db
```

**Restauração:**
```bash
cp backup_20260219.db backend/protocolos.db
```

**Via Interface Web:**
1. Acesse: http://localhost:8000
2. Menu → Backup & Restaurar
3. Clique em "⬇️ Baixar Backup (BD)"

### MongoDB

Use os comandos tradicionais do MongoDB:
```bash
mongodump --db protocolos_db --out backup/
mongorestore backup/protocolos_db/
```

## Estrutura de Arquivos

```
Controle-de-Protocolos/
├── backend/
│   ├── main.py                 # Aplicação principal
│   ├── main_mongodb.py         # Backup versão MongoDB
│   ├── db_sqlite.py            # Camada SQLite
│   ├── db_adapter.py           # Adaptador unificado
│   ├── requirements.txt        # Dependências Python
│   └── protocolos.db          # Banco SQLite (criado automaticamente)
├── frontend/
│   ├── index.html             # Interface web
│   ├── app.js                 # JavaScript
│   └── ...
├── .env                        # Configuração (criar a partir do .env.example)
├── .env.example               # Exemplo de configuração
├── migrate_to_sqlite.py       # Script de migração
├── SQLITE_MIGRATION_GUIDE.md  # Guia de migração
└── README_SQLITE.md           # Este arquivo
```

## FAQ

### 1. SQLite é suficiente para minha empresa?

**Sim, se:**
- Até 50 usuários simultâneos
- Até 100.000 protocolos
- Instalação em servidor único
- Rede local ou poucos acessos remotos

**Use MongoDB se:**
- Mais de 50 usuários simultâneos
- Mais de 100.000 protocolos
- Múltiplos servidores (alta disponibilidade)
- Sharding ou replicação necessária

### 2. Posso voltar para MongoDB depois?

**Sim!** Basta:
1. Alterar `.env`: `DB_TYPE=mongodb`
2. Configurar `MONGO_URL` e `DB_NAME`
3. Reiniciar servidor

### 3. SQLite é seguro?

**Sim!** SQLite é:
- Usado por milhões de aplicações
- Banco de dados mais usado no mundo
- Testado e confiável
- Suporta transações ACID

**Cuidados:**
- Fazer backups regulares
- Não usar em sistema de arquivos de rede (NFS)
- Manter arquivo em disco local

### 4. Performance: SQLite vs MongoDB?

**SQLite é mais rápido para:**
- Leituras simples
- Instalações pequenas/médias
- Queries diretas

**MongoDB é mais rápido para:**
- Muitas escritas simultâneas
- Agregações complexas
- Datasets muito grandes
- Replicação e sharding

### 5. Como fazer backup automático?

**Linux/macOS:**
```bash
# Adicionar ao crontab (diário às 2h)
0 2 * * * cp /caminho/protocolos.db /backup/protocolos_$(date +\%Y\%m\%d).db
```

**Windows (Task Scheduler):**
```batch
copy C:\caminho\protocolos.db C:\backup\protocolos_%date:~-4,4%%date:~-7,2%%date:~-10,2%.db
```

### 6. Perco alguma funcionalidade com SQLite?

**Não!** Todas as funcionalidades foram preservadas:
- ✅ Todos os endpoints da API
- ✅ Toda a interface web
- ✅ Todos os recursos de auditoria
- ✅ Todas as validações
- ✅ Todo o sistema de notificações

### 7. Posso usar ambos (MongoDB e SQLite)?

Não simultaneamente, mas você pode:
- Ter instalações separadas (uma com cada banco)
- Alternar entre bancos mudando `.env`
- Manter backup em um formato e produção em outro

### 8. Onde fica o arquivo do banco SQLite?

Por padrão: `backend/protocolos.db`

Você pode mudar em `.env`:
```env
SQLITE_DB_PATH=/caminho/completo/para/banco.db
```

### 9. SQLite funciona no Windows?

**Sim!** SQLite funciona em:
- ✅ Windows
- ✅ Linux
- ✅ macOS
- ✅ Qualquer sistema com Python

### 10. Como visualizar/editar o banco SQLite?

**Ferramentas:**
- [DB Browser for SQLite](https://sqlitebrowser.org/) (GUI, gratuito)
- [DBeaver](https://dbeaver.io/) (Universal, gratuito)
- sqlite3 (CLI, incluído no Python)

**Via CLI:**
```bash
sqlite3 backend/protocolos.db
# No prompt do SQLite:
.tables           # Listar tabelas
.schema usuarios  # Ver estrutura
SELECT * FROM usuarios;  # Consultar
.quit             # Sair
```

## Suporte

### Documentação Adicional
- [INSTALLATION_GUIDE.md](INSTALLATION_GUIDE.md) - Instalação completa
- [SQLITE_MIGRATION_GUIDE.md](SQLITE_MIGRATION_GUIDE.md) - Guia de migração
- [PROFESSIONAL_IMPROVEMENTS.md](PROFESSIONAL_IMPROVEMENTS.md) - Melhorias futuras

### Problemas Comuns

**"Module not found: sqlalchemy"**
```bash
pip install 'sqlalchemy>=2.0.0'
```

**"Database is locked"**
- Feche todas as conexões ao banco
- Verifique se há processos travados

**Migração falhou**
- Verifique logs em `backend/app.log`
- Tente migração manual (ver guia)

## Licença

Este projeto mantém a licença original do repositório.

## Créditos

- **Versão SQLite**: Desenvolvida com SQLAlchemy ORM
- **Versão Original**: Sistema completo de gestão de protocolos
- **Comunidade**: Contribuições e feedback sempre bem-vindos!

---

**Desenvolvido com ❤️ para simplificar a gestão de protocolos**
