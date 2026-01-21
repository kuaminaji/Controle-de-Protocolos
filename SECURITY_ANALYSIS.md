# Análise de Segurança - Sistema de Gestão de Protocolos

## 🔴 ISSUES CRÍTICOS (Ação Imediata Necessária)

### 1. Credenciais Admin Hardcoded (CRÍTICO)
**Localização:** `backend/main.py:268-271`

**Problema:**
```python
usuarios_coll.insert_one({
    "usuario": "Edvaldo",
    "senha": hash_password("200482"),
    "tipo": "admin"
})
```

**Risco:** Qualquer pessoa com acesso ao código-fonte pode obter acesso admin completo ao sistema.

**Correção Recomendada:**
- Remover credenciais hardcoded
- Gerar senha inicial aleatória via variável de ambiente
- Forçar alteração de senha no primeiro login
- Implementar setup wizard no primeiro acesso

---

### 2. Ausência de Autenticação Real (CRÍTICO)
**Localização:** Frontend `app.js` linhas 58-85 e múltiplos endpoints backend

**Problema:**
```javascript
// Frontend armazena "sessão" no sessionStorage sem validação
function salvarSessao(usuario, tipo) {
  sessionStorage.setItem("sessao", JSON.stringify({ usuario, tipo }));
}
```

**Riscos:**
- SessionStorage é acessível via JavaScript (vulnerável a XSS)
- Backend aceita identidade do usuário via parâmetros Query/Body sem verificação
- Nenhum token JWT ou cookie seguro
- Nenhuma proteção CSRF
- Exemplo: `excluir_usuario(usuario: str, logado: str = Query(...))` - apenas compara strings!

**Correção Recomendada:**
- Implementar autenticação JWT
- Usar cookies HTTP-only e Secure
- Adicionar tokens CSRF
- Middleware de autenticação em TODOS os endpoints protegidos

---

### 3. Backup Sem Autenticação (CRÍTICO)
**Localização:** `backend/main.py:1071-1107`

**Problema:**
```python
@app.post("/api/backup/upload")
async def restaurar_backup(file: UploadFile = File(...)):
    # SEM verificação de autenticação!
    content = await file.read()
    data = bson_loads(content.decode("utf-8"))
    _restore_backup_data(data)  # Restaura TODOS os dados cegamente
```

**Riscos:**
- Qualquer pessoa pode fazer upload de backup malicioso
- Pode sobrescrever completamente o banco de dados
- Endpoint `/api/backup/upload/protected` também vulnerável (usuário via Query param)

**Correção Recomendada:**
- Requerer autenticação JWT em TODAS operações de backup
- Validar estrutura do arquivo de backup
- Implementar limites de tamanho
- Adicionar checksum/verificação de integridade
- Logs de auditoria

---

### 4. XSS via innerHTML (ALTO RISCO)
**Localização:** `frontend/app.js` - centenas de instâncias

**Problema:**
```javascript
// Linha 3209-3211
const protoData = encodeURIComponent(JSON.stringify(p));
return `
  <tr ... data-proto="${protoData}" data-numero="${esc(p.numero)}">
```

**Riscos:**
- Uso extensivo de `innerHTML` com dados do usuário
- Escape inconsistente - algumas áreas usam `esc()`, outras não
- Data attributes não escapados para contexto HTML
- Possível roubo de sessão, injeção de scripts maliciosos

**Correção Recomendada:**
- Usar `textContent` ao invés de `innerHTML` sempre que possível
- Implementar biblioteca de sanitização (DOMPurify)
- Escapar TODOS os dados de usuário antes de inserir no HTML
- Implementar Content Security Policy (CSP)

---

### 5. Rate Limiting Fraco (ALTO RISCO)
**Localização:** `backend/main.py:338-402`

**Problema:**
```python
login_attempts = {}  # Dict em memória - perdido ao reiniciar!

@app.post("/api/login")
def login(usuario: str = Body(...), senha: str = Body(...)):
    ip = request.client.host  # IP pode ser falsificado via proxy
    key = f"{usuario}:{ip}"
    if login_attempts.get(key, 0) >= LOGIN_MAX_ATTEMPTS:
        raise HTTPException(status_code=403, ...)
```

**Riscos:**
- Armazenamento volátil (perdido no restart)
- Baseado em IP (facilmente contornável via proxy/VPN)
- Sem exponential backoff
- Sem bloqueio persistente de conta

**Correção Recomendada:**
- Usar Redis para rate limiting persistente
- Implementar exponential backoff
- Bloquear conta após N tentativas falhadas
- Adicionar notificação de tentativas suspeitas

---

## 🟠 ISSUES DE ALTO RISCO

### 6. Mass Assignment / Privilege Escalation
**Localização:** `backend/main.py:735-868`

**Problema:**
- Função `editar_protocolo()` aceita dicionário arbitrário do cliente
- Campos como `responsavel` e `ultima_alteracao_nome` podem ser falsificados
- Validação mínima de tipos de campos

**Correção:**
- Usar modelos Pydantic estritos para input
- Whitelist de campos permitidos para atualização
- Verificar identidade do usuário da sessão autenticada, não do input

---

### 7. Command Injection / Path Traversal
**Localização:** `backend/main.py:1014-1053`

**Problema:**
- Backup completo inclui todo workspace (código-fonte, configs, credenciais)
- Sem proteção contra symlink attacks
- Abordagem blacklist (fraca) para exclusão de arquivos

**Correção:**
- Whitelist apenas diretórios/arquivos necessários
- Verificar ausência de symlinks fora do workspace
- Criptografar backups
- Não incluir código-fonte ou configs em backups

---

### 8. Fallback de Senha em Texto Plano
**Localização:** `backend/main.py:236-263`

**Problema:**
```python
def verify_password(raw: str, stored: str) -> bool:
    # ... bcrypt handling ...
    return raw == stored  # FALLBACK EM TEXTO PLANO!
```

**Riscos:**
- Se bcrypt não disponível, compara senhas em texto plano
- Senhas digitadas via `prompt()` no frontend (visíveis na memória)
- Sem requisitos de complexidade de senha

**Correção:**
- Remover fallback de texto plano
- Requerer senha mínima de 12 caracteres
- Aplicar regras de complexidade
- Sempre usar HTTPS
- Implementar reset de senha seguro

---

## 🟡 ISSUES DE MÉDIO RISCO

### 9. Information Disclosure - Logging Excessivo
**Localização:** `backend/main.py:323-335`

**Problema:**
- Logs contêm detalhes completos de exceções
- Arquivo `app.log` pode conter informações sensíveis
- Sem rotação ou limites de tamanho de log
- Frontend mostra mensagens de erro brutas

**Correção:**
- Log de erros sensíveis apenas em local seguro
- Implementar rotação de logs
- Não expor detalhes de erro ao cliente
- Sanitizar mensagens de erro

---

### 10. Sem Validação em Operações Admin
**Localização:** `backend/main.py:1325-1348`

**Problema:**
- `/api/admin/zerar-app` não tem confirmação dupla
- Frontend usa `prompt()` para senha (visível a shoulder surfers)
- Sem log de auditoria de ações admin
- Sem rate limiting neste endpoint

**Correção:**
- Requerer confirmação por email
- Implementar 2FA para operações admin
- Log de ações admin com timestamp
- Adicionar mecanismo de recuperação

---

### 11. Falta de Criptografia
**Problema:**
- Arquivos de backup não criptografados
- String de conexão MongoDB visível em logs
- CPFs armazenados em texto plano no banco
- Respostas de API contêm dados sensíveis completos

**Correção:**
- Criptografar backups com AES-256
- Usar string de conexão apenas de variável de ambiente
- Criptografar CPF em repouso (opcional, depende de compliance)
- Implementar criptografia em nível de campo

---

### 12. Verificações de Autorização Insuficientes
**Localização:** Múltiplos endpoints

**Exemplos:**
- `/api/protocolo/atencao` - sem verificação de auth
- `/api/protocolo/exigencias-pendentes` - sem verificação de auth
- `/api/notificacoes` - verifica apenas parâmetro Query `usuario`

**Correção:**
- Adicionar dependência de autenticação em todos endpoints
- Verificar permissões do usuário, não apenas presença
- Implementar controle de acesso baseado em papéis (RBAC)

---

## 🔵 ISSUES DE BAIXO-MÉDIO RISCO

### 13. Headers de Segurança Faltando
**Localização:** `backend/main.py:309-316`

**Faltando:**
- `Content-Security-Policy` - permite scripts `'unsafe-inline'`
- `Strict-Transport-Security` - sem enforcement de HTTPS
- Configuração CORS explícita

**Correção:**
- Adicionar CSP header abrangente
- Habilitar HSTS (mínimo 31536000 segundos)
- Implementar CORS explicitamente
- Adicionar header `Permissions-Policy`

---

### 14. Redirects Não Validados
**Localização:** `frontend/app.js:611`

**Problema:**
```javascript
window.location.replace(url.toString());  // Redirect controlado pelo usuário
```

**Correção:**
- Validar que URL é same-origin antes de redirect
- Usar abordagem whitelist

---

### 15. Vazamento de Informação em Respostas
**Localização:** `backend/main.py:342-346`

**Problema:**
```python
@app.get("/api/usuarios")
def listar_usuarios():
    users = list(usuarios_coll.find({}, {"senha": 0}))  # Todos usuários expostos!
```

**Riscos:**
- Lista todos usuários publicamente
- Habilita ataques de enumeração de usuários

**Correção:**
- Requerer autenticação para listar usuários
- Não expor `tipo` (admin/escrevente) publicamente

---

### 16. ReDoS / Issues de Performance
**Localização:** `backend/main.py:577`

**Problema:**
- Sem limite no tamanho da string de busca
- Buscas case-insensitive em campos não indexados
- Pode casar milhões de documentos

**Correção:**
- Limitar query de busca a 255 caracteres
- Criar índices apropriados para busca de texto
- Considerar usar índice de busca full-text

---

## 📋 Priorização de Correções

### Prioridade 1 (Imediato - Esta Semana)
1. ✅ Remover credenciais admin hardcoded
2. ✅ Implementar autenticação JWT real
3. ✅ Adicionar autenticação em endpoints de backup
4. ✅ Corrigir XSS críticos via innerHTML

### Prioridade 2 (Alto - Próximas 2 Semanas)
5. Implementar tokens CSRF
6. Rate limiting persistente com Redis
7. Remover fallback de senha em texto plano
8. Adicionar validação estrita de input (Pydantic models)

### Prioridade 3 (Médio - Próximo Mês)
9. Criptografia de backups
10. Implementar RBAC completo
11. Adicionar CSP e outros security headers
12. Logs de auditoria para operações admin

### Prioridade 4 (Contínuo)
13. Testes de penetração
14. Code review de segurança regular
15. Monitoramento e alertas de segurança
16. Treinamento de equipe em práticas seguras

---

## 🛡️ Recomendações Adicionais

### Desenvolvimento
- Implementar SAST (Static Application Security Testing)
- Usar dependabot para atualização de dependências
- Implementar pre-commit hooks para verificação de segredos

### Deployment
- Sempre usar HTTPS em produção
- Implementar WAF (Web Application Firewall)
- Isolar banco de dados em rede privada
- Implementar backup automático criptografado

### Monitoramento
- Implementar SIEM para detecção de intrusão
- Monitorar tentativas de login falhadas
- Alertas para operações admin críticas
- Logs centralizados e imutáveis

### Compliance
- Revisar conformidade com LGPD (Lei Geral de Proteção de Dados)
- Implementar políticas de retenção de dados
- Auditorias de segurança regulares
- Plano de resposta a incidentes

---

**Última atualização:** 2026-01-15  
**Responsável:** Security Review Team  
**Status:** Análise Inicial Completa - Aguardando Implementação
