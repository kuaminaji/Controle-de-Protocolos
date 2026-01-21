# 🔐 Configuração de Segurança

## ⚠️ ATENÇÃO - LEIA ANTES DE INICIAR

Este documento descreve as **configurações de segurança obrigatórias** para usar este sistema de forma segura.

## 📋 Pré-requisitos de Segurança

### 1. Configurar Variáveis de Ambiente

**CRÍTICO**: Antes de iniciar o sistema pela primeira vez:

```bash
# 1. Copie o arquivo de exemplo
cp .env.example .env

# 2. Edite o arquivo .env e configure a senha do admin
nano .env  # ou use seu editor preferido
```

**No arquivo .env, configure obrigatoriamente:**

```bash
# Senha forte para o usuário admin inicial
# Requisitos: mínimo 8 caracteres, 1 número, 1 letra
ADMIN_PASSWORD=SuaSenhaForteAqui123

# Opcional: personalizar nome do admin (padrão: admin)
ADMIN_USER=admin
```

### 2. Primeira Inicialização

Ao iniciar o sistema pela primeira vez:

```bash
cd backend
python main.py
```

O sistema irá:
- ✅ Verificar se `ADMIN_PASSWORD` está configurada
- ✅ Criar o usuário admin com a senha fornecida
- ✅ Hashear a senha usando PBKDF2 (260.000 iterações)

**Se ADMIN_PASSWORD não estiver configurada:**
- ❌ O sistema NÃO criará o usuário admin
- ❌ Você verá uma mensagem de erro no log
- ❌ Configure a variável e reinicie o sistema

### 3. Após Primeiro Login

**IMPORTANTE**: Altere a senha do admin imediatamente:

1. Faça login com as credenciais configuradas em `.env`
2. Vá em "Cadastrar Usuário" (apenas admin tem acesso)
3. Edite o usuário admin e altere a senha
4. Use uma senha **ainda mais forte** (12+ caracteres)

## 🛡️ Melhorias de Segurança Implementadas

### Correções Críticas

1. **✅ Credenciais Hardcoded Removidas**
   - Antes: Senha "200482" estava no código-fonte
   - Agora: Senha vem de variável de ambiente obrigatória

2. **✅ Validação de Senha Fortalecida**
   - Mínimo 8 caracteres
   - Obrigatório: pelo menos 1 número e 1 letra
   - Sem fallback para texto plano

3. **✅ Backup Protegido**
   - Endpoint `/api/backup/upload` agora requer autenticação admin
   - Limite de tamanho de arquivo (100MB)
   - Logs de auditoria de operações de backup

4. **✅ Headers de Segurança Melhorados**
   - Content Security Policy (CSP)
   - Permissions Policy
   - Headers anti-XSS e clickjacking

5. **✅ Validação de Input Aprimorada**
   - Limites de tamanho em queries de busca
   - Validação de nome de usuário
   - Proteção contra DoS via input grande

## 🔒 Checklist de Segurança Adicional

### Para Ambiente de Desenvolvimento

- [x] Configurar `.env` com senha forte
- [x] Nunca commitar arquivo `.env`
- [ ] Usar HTTPS localmente (certificado self-signed ok para dev)
- [ ] Testar com diferentes tipos de usuário

### Para Ambiente de Produção

**OBRIGATÓRIO:**
- [ ] HTTPS com certificado válido (Let's Encrypt, etc)
- [ ] Firewall configurado (apenas portas necessárias abertas)
- [ ] MongoDB com autenticação habilitada
- [ ] MongoDB em rede privada (não exposto à internet)
- [ ] Backups automáticos criptografados
- [ ] Logs centralizados (Elasticsearch, CloudWatch, etc)
- [ ] Monitoramento de segurança (Fail2Ban, OSSEC, etc)
- [ ] Rate limiting com Redis
- [ ] Atualizar `HSTS` header no código (descomentar linha)

**RECOMENDADO:**
- [ ] WAF (Web Application Firewall) - CloudFlare, AWS WAF
- [ ] 2FA para usuários admin
- [ ] Política de rotação de senhas
- [ ] Auditoria regular de logs
- [ ] Testes de penetração anuais
- [ ] Plano de resposta a incidentes

## 📖 Issues de Segurança Conhecidas

Veja o arquivo `SECURITY_ANALYSIS.md` para lista completa de:
- Issues corrigidas ✅
- Issues pendentes de correção
- Recomendações de segurança
- Priorização de melhorias

## 🚨 Reportar Vulnerabilidades

Se você descobrir uma vulnerabilidade de segurança:

1. **NÃO** abra uma issue pública
2. Entre em contato diretamente com os mantenedores
3. Forneça detalhes técnicos suficientes para reproduzir
4. Aguarde confirmação antes de divulgar publicamente

## 📚 Recursos Adicionais

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [LGPD - Lei Geral de Proteção de Dados](https://www.gov.br/cidadania/pt-br/acesso-a-informacao/lgpd)
- [FastAPI Security](https://fastapi.tiangolo.com/tutorial/security/)
- [MongoDB Security Checklist](https://docs.mongodb.com/manual/administration/security-checklist/)

---

**Última atualização**: 2026-01-15  
**Versão**: 2.0.0 (Segurança Aprimorada)
