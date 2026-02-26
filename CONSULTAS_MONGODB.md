# 🔍 Consultas MongoDB Shell (mongosh)

Este arquivo documenta consultas úteis para o banco de dados `protocolos_db` do Sistema de Gestão de Protocolos.

---

## 📋 Protocolos do setor PROTESTO em aberto há mais de 30 dias

Retorna os protocolos do setor **PROTESTO** que foram criados há **mais de 30 dias corridos** e que **não estão com status Concluído** (nem excluídos).

```javascript
// 1. Conectar ao banco de dados
use protocolos_db

// 2. Calcular a data de 30 dias atrás
var dataLimite = new Date();
dataLimite.setDate(dataLimite.getDate() - 30);

// 3. Executar a consulta
db.protocolos.find(
  {
    categoria: "PROTESTO",
    status: { $nin: ["Concluído", "EXCLUIDO"] },
    data_criacao_dt: { $lt: dataLimite }
  },
  {
    _id: 0,
    numero: 1,
    nome_requerente: 1,
    status: 1,
    data_criacao: 1,
    responsavel: 1,
    categoria: 1
  }
).sort({ data_criacao_dt: 1 });
```

### Explicação dos filtros

| Filtro | Descrição |
|--------|-----------|
| `categoria: "PROTESTO"` | Limita ao setor PROTESTO |
| `status: { $nin: ["Concluído", "EXCLUIDO"] }` | Exclui protocolos concluídos e excluídos |
| `data_criacao_dt: { $lt: dataLimite }` | Criados há mais de 30 dias corridos |

> **Observação:** O sistema utiliza internamente **30 dias úteis** para alertas automáticos. Se preferir também usar dias úteis no shell, substitua `dataLimite` conforme sua necessidade (ex.: ~42 dias corridos ≈ 30 dias úteis).

---

### Alternativa usando o campo de data como texto (`data_criacao`)

Caso o campo `data_criacao_dt` não esteja populado em algum registro, use a versão com o campo de texto `data_criacao` (formato `YYYY-MM-DD`):

```javascript
use protocolos_db

var dataLimite = new Date();
dataLimite.setDate(dataLimite.getDate() - 30);
var dataLimiteStr = dataLimite.toISOString().substring(0, 10); // "YYYY-MM-DD"

db.protocolos.find(
  {
    categoria: "PROTESTO",
    status: { $nin: ["Concluído", "EXCLUIDO"] },
    data_criacao: { $lt: dataLimiteStr }
  },
  {
    _id: 0,
    numero: 1,
    nome_requerente: 1,
    status: 1,
    data_criacao: 1,
    responsavel: 1,
    categoria: 1
  }
).sort({ data_criacao: 1 });
```

---

### Contar quantos registros foram encontrados

```javascript
use protocolos_db

var dataLimite = new Date();
dataLimite.setDate(dataLimite.getDate() - 30);

db.protocolos.countDocuments({
  categoria: "PROTESTO",
  status: { $nin: ["Concluído", "EXCLUIDO"] },
  data_criacao_dt: { $lt: dataLimite }
});
```

---

## 🗂️ Outros setores/categorias disponíveis

Os setores são gerenciados dinamicamente. Para listar todos os setores cadastrados:

```javascript
use protocolos_db
db.categorias.find({}, { _id: 0, nome: 1, descricao: 1 }).sort({ nome: 1 });
```

Para usar a mesma consulta em **outro setor**, basta substituir `"PROTESTO"` pelo nome desejado (ex.: `"RGI"`, `"RCPN"`, `"NOTAS"`, etc.).

---

## 🔗 Links Relacionados

- [Guia MongoDB Compass](MONGODB_COMPASS_GUIDE.md)
- [Guia de Instalação Completo](GUIA_INSTALACAO_COMPLETO.md)
