# -*- coding: utf-8 -*-
# Arquivo principal da aplicação - versão com categorias dinâmicas (setores) e reset admin
import time
import os
import base64
import secrets
import hashlib
import hmac
import logging
import asyncio
from datetime import datetime, timedelta, timezone
from typing import Optional, List, Dict, Any, Tuple
from contextlib import asynccontextmanager
import re
import json
from functools import lru_cache
import io
import zipfile
from io import BytesIO
from datetime import datetime as _dt

try:
    import bcrypt  # type: ignore
except ImportError:
    bcrypt = None
from bson import ObjectId
from bson.json_util import dumps as bson_dumps, loads as bson_loads
from fastapi import FastAPI, HTTPException, Query, Body, Request, Depends, UploadFile, File, status
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, field_validator, ValidationError
from pymongo import MongoClient, errors
from pymongo.collection import Collection
from pymongo import ASCENDING, DESCENDING

# ====================== [BLOCO 2: CONFIGURAÇÃO DE LOGGING] ======================
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('app.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# ====================== [BLOCO 3: CONEXÃO E INICIALIZAÇÃO MONGODB] ======================
def criar_cliente_mongodb(uri: str, max_retries=30, delay=2):
    if uri.startswith("mongomock://"):
        try:
            import mongomock  # type: ignore
        except Exception as e:
            raise Exception("Para usar mongomock, instale com: pip install mongomock") from e
        logger.info("[MongoDB] Usando mongomock (memória)")
        return mongomock.MongoClient()
    for attempt in range(1, max_retries + 1):
        try:
            client = MongoClient(uri, serverSelectionTimeoutMS=3000)
            client.admin.command('ping')
            logger.info(f"[MongoDB] Conectado na tentativa {attempt}")
            return client
        except errors.ServerSelectionTimeoutError as e:
            logger.warning(f"[MongoDB] Falha ao conectar (tentativa {attempt}/{max_retries}): {e}")
            time.sleep(delay)
    raise Exception(f"Não foi possível conectar ao MongoDB após {max_retries} tentativas.")

# ====================== [BLOCO 4: MODELOS E VALIDAÇÕES] ======================
def apenas_digitos(s: str) -> str:
    return "".join(ch for ch in s if ch.isdigit())

def validar_cpf(cpf: str) -> bool:
    cpf = apenas_digitos(cpf)
    if len(cpf) != 11:
        return False
    if cpf == cpf[0] * 11:
        return False
    soma = sum(int(cpf[i]) * (10 - i) for i in range(9))
    d1 = 0 if (soma % 11) < 2 else 11 - (soma % 11)
    soma = sum(int(cpf[i]) * (11 - i) for i in range(10))
    d2 = 0 if (soma % 11) < 2 else 11 - (soma % 11)
    return cpf[-2:] == f"{d1}{d2}"

DEFAULT_CATEGORIAS = {"RGI", "RCPN", "RCPJ", "RTD", "PROTESTO", "NOTAS"}

def get_allowed_categorias() -> set:
    try:
        names = categorias_coll.distinct("nome")
        dyn = set([n for n in names if n])
        return set(DEFAULT_CATEGORIAS) | dyn
    except Exception:
        return set(DEFAULT_CATEGORIAS)

class ProtocoloModel(BaseModel):
    numero: str = Field(..., min_length=5, max_length=10, description="Número do protocolo, 5-10 dígitos numéricos.")
    nome_requerente: str = Field(..., max_length=60)
    sem_cpf: bool = Field(default=False, description="Flag indicating client without CPF")
    cpf: str = Field(default="", min_length=0, max_length=14)  # Made optional
    whatsapp: str = Field(default="", max_length=20)
    titulo: str = Field(..., max_length=120)
    nome_parte_ato: str = Field(default="", max_length=120)
    outras_infos: str = Field(default="", max_length=120)
    data_criacao: str
    status: str
    categoria: str
    responsavel: str = Field(..., max_length=60)
    observacoes: str = Field(default="", max_length=8240)
    editavel: bool = True
    ultima_alteracao_nome: str = ""
    ultima_alteracao_data: str = ""
    retirado_por: str = ""
    data_retirada: str = ""
    whatsapp_enviado_em: str = Field(default="", max_length=30, description="Data/hora do último envio WhatsApp")
    whatsapp_enviado_por: str = Field(default="", max_length=60, description="Usuário que enviou última mensagem WhatsApp")
    exig1_retirada_por: str = Field(default="", max_length=60)
    exig1_data_retirada: str = Field(default="", max_length=10)
    exig1_reapresentada_por: str = Field(default="", max_length=60)
    exig1_data_reapresentacao: str = Field(default="", max_length=10)
    exig2_retirada_por: str = Field(default="", max_length=60)
    exig2_data_retirada: str = Field(default="", max_length=10)
    exig2_reapresentada_por: str = Field(default="", max_length=60)
    exig2_data_reapresentacao: str = Field(default="", max_length=10)
    exig3_retirada_por: str = Field(default="", max_length=60)
    exig3_data_retirada: str = Field(default="", max_length=10)
    exig3_reapresentada_por: str = Field(default="", max_length=60)
    exig3_data_reapresentacao: str = Field(default="", max_length=10)
    
    @field_validator('numero')
    @classmethod
    def numero_valido(cls, v):
        if not v.isdigit() or not (5 <= len(v) <= 10):
            raise ValueError("Número do protocolo deve conter entre 5 e 10 dígitos.")
        return v
    
    @field_validator('cpf')
    @classmethod
    def cpf_valido(cls, v, info):
        # Allow empty CPF when sem_cpf flag is True
        if info.data.get('sem_cpf', False) and not v:
            return v
        if not validar_cpf(v):
            raise ValueError("CPF inválido. Informe um CPF válido.")
        return v
    
    @field_validator('status')
    @classmethod
    def status_valido(cls, v):
        allowed = {"Pendente", "Em andamento", "Concluído", "Exigência", "EXCLUIDO"}
        if v not in allowed:
            raise ValueError("Status inválido.")
        return v
    
    @field_validator('categoria')
    @classmethod
    def categoria_valida(cls, v):
        allowed = get_allowed_categorias()
        if v not in allowed:
            raise ValueError("Categoria inválida.")
        return v
    
    @field_validator('data_criacao')
    @classmethod
    def data_criacao_valida(cls, v):
        try:
            data = datetime.strptime(v, "%Y-%m-%d").replace(tzinfo=timezone.utc)
            agora = datetime.now(timezone.utc)
            if data > agora:
                raise ValueError("Data não pode ser futura")
            return v
        except ValueError:
            raise ValueError("Data inválida. Use YYYY-MM-DD.")

class UsuarioModel(BaseModel):
    usuario: str
    senha: str
    tipo: str

class CategoriaModel(BaseModel):
    nome: str = Field(..., min_length=1, max_length=60)
    descricao: Optional[str] = Field(default="", max_length=240)

    @field_validator('nome')
    @classmethod
    def nome_strip(cls, v):
        v2 = v.strip()
        if not v2:
            raise ValueError("Nome inválido")
        return v2

# ====================== [BLOCO 5: CONFIGURAÇÃO DO BANCO E ÍNDICES] ======================
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017/")
DB_NAME = os.getenv("DB_NAME", "protocolos_db")
client = criar_cliente_mongodb(MONGO_URL)
db = client[DB_NAME]
protocolos_coll: Collection = db["protocolos"]
usuarios_coll: Collection = db["usuarios"]
filtros_coll: Collection = db["filtros"]
notificacoes_coll: Collection = db["notificacoes"]
categorias_coll: Collection = db["categorias"]

def create_indexes():
    try:
        usuarios_coll.create_index("usuario", unique=True)
    except Exception as e:
        logger.warning(f"[MongoDB] Aviso ao criar índice de usuário: {e}")
    try:
        protocolos_coll.create_index("numero", unique=True)
    except Exception as e:
        logger.warning(f"[MongoDB] Aviso ao criar índice de protocolo.numero: {e}")
    try:
        protocolos_coll.create_index([("cpf", 1)])
        protocolos_coll.create_index([("status", 1)])
        protocolos_coll.create_index([("categoria", 1)])
        protocolos_coll.create_index([("data_criacao_dt", 1)])
        protocolos_coll.create_index([("data_retirada_dt", 1)])
        protocolos_coll.create_index([("nome_parte_ato", 1)])
        protocolos_coll.create_index([("exig1_data_retirada_dt", 1)])
        protocolos_coll.create_index([("exig1_data_reapresentacao_dt", 1)])
        protocolos_coll.create_index([("exig2_data_retirada_dt", 1)])
        protocolos_coll.create_index([("exig2_data_reapresentacao_dt", 1)])
        protocolos_coll.create_index([("exig3_data_retirada_dt", 1)])
        protocolos_coll.create_index([("exig3_data_reapresentacao_dt", 1)])
        protocolos_coll.create_index([("categoria", 1), ("status", 1), ("data_criacao_dt", -1)])
        protocolos_coll.create_index([("status", 1), ("data_criacao_dt", -1)])
        protocolos_coll.create_index([("categoria", 1), ("data_criacao_dt", -1)])
    except Exception as e:
        logger.warning(f"[MongoDB] Aviso ao criar índices auxiliares: {e}")

    try:
        categorias_coll.create_index("nome", unique=True)
    except Exception as e:
        logger.warning(f"[MongoDB] Aviso ao criar índice de categorias: {e}")

# ====================== [BLOCO 6: GESTÃO DE SENHAS] ======================
PBKDF2_ALG = "pbkdf2_sha256"
PBKDF2_ITER = 260_000
PBKDF2_SALT_LEN = 16

def hash_password(raw: str) -> str:
    salt = secrets.token_bytes(PBKDF2_SALT_LEN)
    dk = hashlib.pbkdf2_hmac("sha256", raw.encode("utf-8"), salt, PBKDF2_ITER)
    return f"{PBKDF2_ALG}${PBKDF2_ITER}${base64.b64encode(salt).decode()}${base64.b64encode(dk).decode()}"

def is_pbkdf2_hash(value: str) -> bool:
    return isinstance(value, str) and value.startswith(f"{PBKDF2_ALG}$")

def is_bcrypt_hash(value: str) -> bool:
    return isinstance(value, str) and value.startswith("$2")

def verify_password(raw: str, stored: str) -> bool:
    if is_pbkdf2_hash(stored):
        try:
            _alg, iter_s, salt_b64, hash_b64 = stored.split("$", 3)
            iterations = int(iter_s)
            salt = base64.b64decode(salt_b64)
            expected = base64.b64decode(hash_b64)
            candidate = hashlib.pbkdf2_hmac("sha256", raw.encode("utf-8"), salt, iterations)
            return hmac.compare_digest(candidate, expected)
        except Exception:
            return False
    if is_bcrypt_hash(stored) and bcrypt:
        try:
            return bcrypt.checkpw(raw.encode("utf-8"), stored.encode("utf-8"))
        except Exception:
            return False
    return raw == stored

def inicializa_admin():
    if usuarios_coll.count_documents({}) == 0:
        try:
            usuarios_coll.insert_one({
                "usuario": "Edvaldo",
                "senha": hash_password("200482"),
                "tipo": "admin"
            })
            logger.info("[Init] Usuário admin padrão criado (altere a senha!).")
        except Exception as e:
            logger.error(f"[Init] Falha ao criar admin padrão: {e}")

def now_str():
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

# ====================== [BLOCO 7: INICIALIZAÇÃO] ======================
create_indexes()
inicializa_admin()

# ====================== [BLOCO 7.5: AUTOMATIC DAILY NOTIFICATION SYSTEM] ======================
# Constants for automatic notification system
MAX_PROTOCOLS_IN_NOTIFICATION = 20  # Maximum number of protocol numbers to show in notification message
NOTIFICATION_CHECK_HOUR_UTC = 8     # Hour (UTC) when automatic checks should run
NOTIFICATION_CHECK_INTERVAL_SECONDS = 3600  # Check every hour (3600 seconds)
ERROR_RETRY_INTERVAL_SECONDS = 60   # Wait 60 seconds before retrying after an error

async def verificar_atrasos_automatico():
    """
    Função automática que verifica atrasos diariamente sem necessidade de autenticação.
    É executada por uma task assíncrona em background uma vez por dia.
    
    Regras de negócio:
    - Verifica protocolos com status 'Em andamento' com mais de 30 dias úteis
    - Cria notificações para todos os usuários administradores
    - Respeita limite de uma notificação por dia por admin (anti-spam)
    """
    try:
        logger.info("[AutoNotif] Executando verificação automática de atrasos...")
        agora = datetime.now(timezone.utc)
        limiar_30_uteis = subtract_business_days(agora, 30)

        filtro = {
            "status": "Em andamento",
            "data_criacao_dt": {"$lte": limiar_30_uteis},
        }

        atrasados = list(protocolos_coll.find(
            filtro,
            {"numero": 1, "categoria": 1, "nome_requerente": 1, "data_criacao": 1}
        ))
        total_atrasados = len(atrasados)

        if total_atrasados == 0:
            logger.info("[AutoNotif] Nenhum protocolo em atraso encontrado.")
            return

        # Admins que recebem
        admins = list(usuarios_coll.find({"tipo": "admin"}, {"usuario": 1}))
        admin_names = [a.get("usuario") for a in admins if a.get("usuario")]

        if not admin_names:
            logger.warning("[AutoNotif] Nenhum administrador encontrado para notificar.")
            return

        # Mensagem resumo
        lista_nums = ", ".join([p.get("numero", "") for p in atrasados[:MAX_PROTOCOLS_IN_NOTIFICATION] if p.get("numero")])
        sufixo = f" (e mais {total_atrasados - MAX_PROTOCOLS_IN_NOTIFICATION})" if total_atrasados > MAX_PROTOCOLS_IN_NOTIFICATION else ""
        msg = f"⚠️ Verificação automática: {total_atrasados} protocolo(s) 'Em andamento' com +30 dias úteis. Exemplos: {lista_nums}{sufixo}"

        # Janela do "dia atual UTC"
        inicio_dia = agora.replace(hour=0, minute=0, second=0, microsecond=0)
        fim_dia = inicio_dia + timedelta(days=1)

        created = 0
        skipped = 0

        for admin_user in admin_names:
            ja_hoje = notificacoes_coll.find_one({
                "usuario": admin_user,
                "tipo": "alerta_atrasos",
                "data_criacao_dt": {"$gte": inicio_dia, "$lt": fim_dia}
            })

            if ja_hoje:
                skipped += 1
                continue

            notificacoes_coll.insert_one({
                "usuario": admin_user,
                "mensagem": msg,
                "tipo": "alerta_atrasos",
                "lida": False,
                "data_criacao": now_str(),
                "data_criacao_dt": agora
            })
            created += 1

        logger.info(f"[AutoNotif] Concluído. Atrasados: {total_atrasados}, Notificações criadas: {created}, Ignoradas: {skipped}")
    except Exception as e:
        logger.error(f"[AutoNotif] Erro ao verificar atrasos: {e}")

async def daily_notification_task():
    """
    Task assíncrona que executa a verificação de atrasos uma vez por dia.
    Verifica a cada hora se já é um novo dia UTC e ainda não executou hoje.
    Executa imediatamente na primeira vez se já passou do horário configurado.
    """
    last_run_date = None
    
    # Check immediately on startup if it's already past the configured hour
    agora = datetime.now(timezone.utc)
    hoje = agora.date()
    if agora.hour >= NOTIFICATION_CHECK_HOUR_UTC:
        await verificar_atrasos_automatico()
        last_run_date = hoje
        logger.info(f"[AutoNotif] Próxima execução agendada para {hoje + timedelta(days=1)}")
    
    while True:
        try:
            await asyncio.sleep(NOTIFICATION_CHECK_INTERVAL_SECONDS)  # Verifica periodicamente
            agora = datetime.now(timezone.utc)
            hoje = agora.date()
            
            # Se é um novo dia e ainda não executamos hoje
            if last_run_date != hoje:
                # Executar às hora configurada (ou na primeira verificação do dia após essa hora)
                if agora.hour >= NOTIFICATION_CHECK_HOUR_UTC:
                    await verificar_atrasos_automatico()
                    last_run_date = hoje
                    logger.info(f"[AutoNotif] Próxima execução agendada para {hoje + timedelta(days=1)}")
        except asyncio.CancelledError:
            logger.info("[AutoNotif] Task de notificações automáticas cancelada.")
            raise  # Re-raise to properly propagate cancellation
        except Exception as e:
            logger.error(f"[AutoNotif] Erro no loop de notificações: {e}")
            await asyncio.sleep(ERROR_RETRY_INTERVAL_SECONDS)  # Espera antes de tentar novamente

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Gerencia o ciclo de vida da aplicação."""
    # Startup
    logger.info("[App] Iniciando sistema de notificações automáticas...")
    task = asyncio.create_task(daily_notification_task())
    
    yield
    
    # Shutdown
    logger.info("[App] Encerrando sistema de notificações automáticas...")
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass

# ====================== [BLOCO 8: APP FASTAPI E MIDDLEWARES] ======================
app = FastAPI(
    title="Sistema de Gestão de Protocolos",
    version="2.0.1",
    lifespan=lifespan
)

FRONTEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../frontend"))
if not os.path.isdir(FRONTEND_DIR):
    FRONTEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "static"))
try:
    app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")
except Exception:
    pass

@app.get("/")
def root():
    index_path = os.path.join(FRONTEND_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": "Sistema de Gestão de Protocolos - Frontend não disponível."}

@app.get("/docs")
def redirect_docs():
    index_path = os.path.join(FRONTEND_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": "Docs page redirected to frontend index."}

@app.get("/favicon.ico")
def get_favicon():
    """Serve favicon at root path for browser requests."""
    favicon_path = os.path.join(FRONTEND_DIR, "static", "favicon.ico")
    if os.path.exists(favicon_path):
        return FileResponse(favicon_path, media_type="image/x-icon")
    # Fallback to svg if ico doesn't exist
    favicon_svg = os.path.join(FRONTEND_DIR, "static", "favicon.svg")
    if os.path.exists(favicon_svg):
        return FileResponse(favicon_svg, media_type="image/svg+xml")
    raise HTTPException(status_code=404, detail="Favicon not found")

@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    # Add CSP header to allow external fonts and data URIs for fonts
    csp_directives = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
        "style-src 'self' 'unsafe-inline' https://use.typekit.net",
        "font-src 'self' data: https://use.typekit.net",
        "img-src 'self' data: https:",
        "connect-src 'self' https://cdn.jsdelivr.net"
    ]
    response.headers["Content-Security-Policy"] = "; ".join(csp_directives)
    return response

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    logger.info(f"{request.method} {request.url.path} - Status: {response.status_code} - Tempo: {process_time:.2f}s")
    return response

# ====================== [BLOCO 9: TRATAMENTO GLOBAL DE ERROS] ======================
@app.exception_handler(ValidationError)
async def validation_exception_handler(request: Request, exc: ValidationError):
    logger.warning(f"Erro de validação em {request.url}: {exc.errors()}")
    return JSONResponse(status_code=422, content={"detail": "Dados inválidos", "errors": exc.errors()})

@app.exception_handler(500)
async def internal_exception_handler(request: Request, exc: Exception):
    logger.error(f"Erro interno em {request.url}: {str(exc)}")
    return JSONResponse(status_code=500, content={"detail": "Erro interno do servidor"})

# ====================== [BLOCO 10: API DE USUÁRIOS] ======================
login_attempts = {}

@app.get("/api/usuarios")
def listar_usuarios():
    users = list(usuarios_coll.find({}, {"senha": 0}))
    for u in users:
        u["id"] = str(u["_id"])
        del u["_id"]
    return users

@app.get("/api/usuarios/nomes")
def listar_usuarios_nomes():
    """
    Endpoint público para listar apenas os nomes de usuários ativos (não bloqueados).
    Usado na tela de login para popular o dropdown de seleção.
    Filtra usuários bloqueados para que não apareçam na tela de login.
    """
    try:
        # Filter out blocked users
        users = list(usuarios_coll.find(
            {"bloqueado": {"$ne": True}},  # Only users that are not blocked
            {"usuario": 1, "_id": 0}
        ))
        nomes = [u.get("usuario") for u in users if u.get("usuario")]
        return nomes
    except Exception as e:
        logger.error(f"Erro ao listar nomes de usuários: {e}")
        raise HTTPException(status_code=500, detail="Erro ao listar usuários")

@app.post("/api/usuario")
def cadastrar_usuario(usuario: UsuarioModel):
    if usuarios_coll.find_one({"usuario": usuario.usuario}):
        raise HTTPException(status_code=400, detail="Usuário já existe.")
    doc = usuario.model_dump()
    doc["senha"] = hash_password(doc["senha"])
    try:
        usuarios_coll.insert_one(doc)
        logger.info(f"Usuário {usuario.usuario} criado")
        return {"ok": True}
    except errors.DuplicateKeyError:
        raise HTTPException(status_code=400, detail="Usuário já existe.")

@app.put("/api/usuario/{usuario_antigo}")
def editar_usuario(usuario_antigo: str, data: dict = Body(...)):
    usuario_novo = data.get("usuario", "").strip()
    senha_nova = data.get("senha", "").strip()
    tipo_novo = data.get("tipo", "")
    if not usuario_novo or not tipo_novo:
        raise HTTPException(status_code=400, detail="Dados obrigatórios ausentes.")
    if usuario_antigo != usuario_novo and usuarios_coll.find_one({"usuario": usuario_novo}):
        raise HTTPException(status_code=400, detail="Nome de usuário já existe.")
    update = {"usuario": usuario_novo, "tipo": tipo_novo}
    if senha_nova:
        update["senha"] = hash_password(senha_nova)
    res = usuarios_coll.update_one({"usuario": usuario_antigo}, {"$set": update})
    if res.matched_count:
        logger.info(f"Usuário {usuario_antigo} atualizado")
        return {"ok": True}
    raise HTTPException(status_code=404, detail="Usuário não encontrado.")

@app.delete("/api/usuario/{usuario}")
def excluir_usuario(usuario: str, logado: str = Query(...)):
    if usuario == logado:
        raise HTTPException(status_code=400, detail="Não é possível excluir o próprio usuário logado.")
    res = usuarios_coll.delete_one({"usuario": usuario})
    if res.deleted_count:
        logger.info(f"Usuário {usuario} excluído")
        return {"ok": True}
    raise HTTPException(status_code=404, detail="Usuário não encontrado.")

@app.patch("/api/usuario/{usuario}/bloquear")
def bloquear_desbloquear_usuario(usuario: str):
    """
    Bloqueia ou desbloqueia um usuário alternando o campo 'bloqueado'.
    Usuários bloqueados não podem fazer login e não aparecem na tela de login.
    """
    try:
        user = usuarios_coll.find_one({"usuario": usuario})
        if not user:
            raise HTTPException(status_code=404, detail="Usuário não encontrado.")
        
        # Toggle the bloqueado status
        novo_status = not user.get("bloqueado", False)
        
        res = usuarios_coll.update_one(
            {"usuario": usuario},
            {"$set": {"bloqueado": novo_status}}
        )
        
        if res.matched_count:
            acao = "bloqueado" if novo_status else "desbloqueado"
            logger.info(f"Usuário {usuario} foi {acao}")
            return {"ok": True, "bloqueado": novo_status, "mensagem": f"Usuário {acao} com sucesso"}
        
        raise HTTPException(status_code=500, detail="Erro ao atualizar usuário")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao bloquear/desbloquear usuário {usuario}: {e}")
        raise HTTPException(status_code=500, detail="Erro ao processar requisição")

@app.post("/api/login")
def login(usuario: str = Body(...), senha: str = Body(...), request: Request = None):
    ip = request.client.host if request else "unknown"
    key = f"{usuario}:{ip}"
    if login_attempts.get(key, 0) >= 5:
        raise HTTPException(status_code=403, detail="Muitas tentativas. Aguarde alguns minutos.")
    user = usuarios_coll.find_one({"usuario": usuario})
    
    # Check if user is blocked
    if user and user.get("bloqueado", False):
        logger.warning(f"Tentativa de login de usuário bloqueado: {usuario} de {ip}")
        raise HTTPException(status_code=403, detail="Usuário bloqueado. Entre em contato com o administrador.")
    
    if user and verify_password(senha, user.get("senha", "")):
        login_attempts[key] = 0
        logger.info(f"Login bem-sucedido para {usuario} de {ip}")
        return {"login": True, "admin": user["tipo"] == "admin", "usuario": user["usuario"], "tipo": user["tipo"]}
    login_attempts[key] = login_attempts.get(key, 0) + 1
    logger.warning(f"Tentativa de login falha para {usuario} de {ip}")
    raise HTTPException(status_code=401, detail="Credenciais inválidas.")

# ====================== [BLOCO 11: API DE PROTOCOLOS - CONSTANTES E HELPERS] ======================
ALLOWED_STATUS = {"Pendente", "Em andamento", "Concluído", "Exigência", "EXCLUIDO"}

def sanitize_pagination(page: Optional[int], per_page: Optional[int]) -> Tuple[int, int]:
    p = max(1, int(page or 1))
    pp = int(per_page or 50)
    if pp < 1:
        pp = 1
    if pp > 100:
        pp = 100
    return p, pp
    
def sanitize_sort(sort_by: Optional[str], sort_dir: Optional[str]) -> Tuple[str, int, str]:
    allowed = {
        "data_criacao": "data_criacao_dt",
        "numero": "numero",
        "nome_requerente": "nome_requerente",
        "nome_parte_ato": "nome_parte_ato",
        "status": "status",
        "categoria": "categoria",
        "cpf": "cpf",
        "data_retirada": "data_retirada_dt",
    }

    # str.trim() não existe em Python; use strip() para normalizar
    sb = (sort_by or "data_criacao")
    if isinstance(sb, str):
        sb = sb.strip()
    if not sb:
        sb = "data_criacao"

    field = allowed.get(sb, "data_criacao_dt")
    sd = (sort_dir or "desc").lower()
    direction = DESCENDING if sd == "desc" else ASCENDING
    normalized_sb = [k for k, v in allowed.items() if v == field]
    return (normalized_sb[0] if normalized_sb else "data_criacao"), direction, field


def build_change_list(original: Dict[str, Any], atualizacao: Dict[str, Any], unset_fields: Dict[str, Any]) -> List[Dict[str, Any]]:
    track_fields = [
        "nome_requerente","cpf","titulo","nome_parte_ato","outras_infos","data_criacao","status","categoria","observacoes",
        "retirado_por","data_retirada",
        "exig1_retirada_por","exig1_data_retirada","exig1_reapresentada_por","exig1_data_reapresentacao",
        "exig2_retirada_por","exig2_data_retirada","exig2_reapresentada_por","exig2_data_reapresentacao",
        "exig3_retirada_por","exig3_data_retirada","exig3_reapresentada_por","exig3_data_reapresentacao"
    ]
    changes: List[Dict[str, Any]] = []
    for f in track_fields:
        old = original.get(f, "")
        new_set = f in atualizacao
        new_unset = f in unset_fields
        if not new_set and not new_unset:
            continue
        new_val = "" if new_unset else atualizacao.get(f, "")
        if old != new_val:
            changes.append({"campo": f, "de": old, "para": new_val})
    return changes

# ====================== [BLOCO 12: API DE PROTOCOLOS - CRUD] ======================
@app.post("/api/protocolo")
def incluir_protocolo(protocolo: ProtocoloModel):
    numero = apenas_digitos(protocolo.numero)
    cpf_raw = protocolo.cpf.strip()
    status = protocolo.status.strip()
    categoria = protocolo.categoria.strip()
    if categoria == "IDT":
        categoria = "RTD"
    cpf = apenas_digitos(cpf_raw)
    if len(numero) != 5:
        raise HTTPException(status_code=400, detail="Número do protocolo deve conter exatamente 5 dígitos.")
    
    # Only validate CPF if sem_cpf is False
    if not protocolo.sem_cpf:
        if not validar_cpf(cpf):
            raise HTTPException(status_code=400, detail="CPF inválido. Informe um CPF válido.")
    else:
        # If sem_cpf is True, set CPF to empty string
        cpf = ""
    
    if status not in ALLOWED_STATUS:
        raise HTTPException(status_code=400, detail="Status inválido.")
    allowed_cats = get_allowed_categorias()
    if categoria not in allowed_cats:
        raise HTTPException(status_code=400, detail="Categoria inválida.")
    try:
        dt_criacao = datetime.strptime(protocolo.data_criacao, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    except ValueError:
        raise HTTPException(status_code=400, detail="Data de criação inválida. Use YYYY-MM-DD.")
    if protocolos_coll.find_one({"numero": numero}):
        raise HTTPException(status_code=400, detail="Já consta um protocolo com a numeração informada.")
    novo = protocolo.model_dump()
    if "observacoes" in novo and novo["observacoes"]:
        novo["observacoes"] = re.sub(r"<br\s*/?>", "\n", novo["observacoes"])
    novo["numero"] = numero
    novo["cpf"] = cpf
    novo["status"] = status
    novo["categoria"] = categoria
    novo["ultima_alteracao_nome"] = protocolo.ultima_alteracao_nome or protocolo.responsavel or ""
    novo["ultima_alteracao_data"] = now_str()
    novo["data_criacao_dt"] = dt_criacao
    novo["retirado_por"] = novo.get("retirado_por", "") or ""
    novo["data_retirada"] = novo.get("data_retirada", "") or ""
    novo.pop("data_retirada_dt", None)
    for i in (1, 2, 3):
        for k in (f"exig{i}_retirada_por", f"exig{i}_data_retirada", f"exig{i}_reapresentada_por", f"exig{i}_data_reapresentacao"):
            novo[k] = novo.get(k, "") or ""
        novo.pop(f"exig{i}_data_retirada_dt", None)
        novo.pop(f"exig{i}_data_reapresentacao_dt", None)
    novo["historico_alteracoes"] = [{
        "acao": "criar",
        "usuario": novo["ultima_alteracao_nome"],
        "timestamp": novo["ultima_alteracao_data"],
        "changes": []
    }]
    try:
        res = protocolos_coll.insert_one(novo)
        protocolo_id = str(res.inserted_id)
        logger.info(f"Protocolo {numero} criado")
        
        # Update nome_requerente and whatsapp in all other protocols with the same CPF
        # Only sync if CPF is provided (not empty)
        if cpf:
            update_data = {}
            if novo.get("nome_requerente"):
                update_data["nome_requerente"] = novo["nome_requerente"]
            if novo.get("whatsapp"):
                update_data["whatsapp"] = novo["whatsapp"]
            
            if update_data:
                protocolos_coll.update_many(
                    {"cpf": cpf, "numero": {"$ne": numero}},
                    {"$set": update_data}
                )
                logger.info(f"Dados do requerente atualizados para CPF {cpf}")
        
        return {"id": protocolo_id}
    except errors.DuplicateKeyError:
        raise HTTPException(status_code=400, detail="Já consta um protocolo com a numeração informada.")

@app.get("/api/protocolo")
def buscar_protocolos(
    numero: Optional[str] = Query(default=None),
    cpf: Optional[str] = Query(default=None),
    status: Optional[List[str]] = Query(default=None),
    categoria: Optional[List[str]] = Query(default=None),
    q: Optional[str] = Query(default=None),
    data_inicio: Optional[str] = Query(default=None),
    data_fim: Optional[str] = Query(default=None),
    page: Optional[int] = Query(default=1, ge=1),
    per_page: Optional[int] = Query(default=50, ge=1, le=100),
    sort_by: Optional[str] = Query(default="data_criacao"),
    sort_dir: Optional[str] = Query(default="desc"),
    use_aggregation: Optional[str] = Query(default=None)
):
    filtros: List[Dict[str, Any]] = []
    if numero:
        num = apenas_digitos(numero)
        if num:
            filtros.append({"numero": num})
    if cpf:
        cpf_puro = apenas_digitos(cpf)
        if cpf_puro:
            filtros.append({"cpf": cpf_puro})
    if status:
        status_list = [s for s in status if s]
        if status_list:
            invalido = [s for s in status_list if s not in ALLOWED_STATUS]
            if invalido:
                raise HTTPException(status_code=400, detail=f"Status inválido: {invalido}")
            if len(status_list) == 1:
                filtros.append({"status": status_list[0]})
            else:
                filtros.append({"status": {"$in": status_list}})
    if categoria:
        cat_list = []
        for c in categoria:
            if c is None:
                continue
            cc = str(c).strip()
            if not cc:
                continue
            if cc == "IDT":
                cc = "RTD"
            cat_list.append(cc)
        cat_list = list(dict.fromkeys([c for c in cat_list if c]))
        if cat_list:
            allowed_cats = get_allowed_categorias()
            invalido = [c for c in cat_list if c not in allowed_cats]
            if invalido:
                raise HTTPException(status_code=400, detail=f"Categoria inválida: {invalido}")
            filtros.append({"categoria": {"$in": cat_list}})
    if q:
        q_str = q.strip()
        if q_str:
            if q_str.isdigit() and 1 <= len(q_str) <= 10:
                filtros.append({"numero": {"$regex": re.escape(q_str)}})
            else:
                esc_q = re.escape(q_str)
                re_obj = {"$regex": esc_q, "$options": "i"}
                filtros.append({"$or": [
                    {"nome_requerente": re_obj},
                    {"titulo": re_obj},
                    {"outras_infos": re_obj},
                    {"nome_parte_ato": re_obj},
                    {"numero": re_obj}
                ]})
    filtro_final: Dict[str, Any] = {}
    if filtros:
        filtro_final = filtros[0] if len(filtros) == 1 else {"$and": filtros}
    if data_inicio or data_fim:
        dt_cond: Dict[str, Any] = {}
        try:
            if data_inicio:
                dt_inicio = datetime.strptime(data_inicio, "%Y-%m-%d").replace(tzinfo=timezone.utc)
                dt_cond["$gte"] = dt_inicio
            if data_fim:
                dt_fim = datetime.strptime(data_fim, "%Y-%m-%d").replace(tzinfo=timezone.utc) + timedelta(days=1) - timedelta(seconds=1)
                dt_cond["$lte"] = dt_fim
            if dt_cond:
                filtro_final["data_criacao_dt"] = dt_cond
        except ValueError:
            raise HTTPException(status_code=400, detail="Data inválida. Use YYYY-MM-DD.")
    p, pp = sanitize_pagination(page, per_page)
    sb_human, direction, field = sanitize_sort(sort_by, sort_dir)
    projection = {
        "historico_alteracoes": 0,
        "data_criacao_dt": 0,
        "data_retirada_dt": 0,
        "exig1_data_retirada_dt": 0,
        "exig1_data_reapresentacao_dt": 0,
        "exig2_data_retirada_dt": 0,
        "exig2_data_reapresentacao_dt": 0,
        "exig3_data_retirada_dt": 0,
        "exig3_data_reapresentacao_dt": 0,
    }
    total = protocolos_coll.count_documents(filtro_final)
    skip = (p - 1) * pp
    cursor = protocolos_coll.find(filtro_final, projection).sort(field, direction).skip(skip).limit(pp)
    items: List[Dict[str, Any]] = []
    for doc in cursor:
        out = {k: v for k, v in doc.items() if k not in [
            "_id", "data_criacao_dt", "data_retirada_dt", "historico_alteracoes",
            "exig1_data_retirada_dt","exig1_data_reapresentacao_dt",
            "exig2_data_retirada_dt","exig2_data_reapresentacao_dt",
            "exig3_data_retirada_dt","exig3_data_reapresentacao_dt"
        ]}
        out["id"] = str(doc["_id"])
        items.append(out)
    pages = (total + pp - 1) // pp if pp else 1
    return {
        "items": items,
        "page": p,
        "per_page": pp,
        "total": total,
        "pages": pages,
        "sort_by": sb_human,
        "sort_dir": "desc" if direction == DESCENDING else "asc"
    }

# ====================== [BLOCO 13: ESTATÍSTICAS E HISTÓRICO] ======================
def subtract_business_days(from_dt: datetime, business_days: int) -> datetime:
    if business_days <= 0:
        return from_dt
    d = from_dt
    counted = 0
    while counted < business_days:
        d = d - timedelta(days=1)
        if d.weekday() < 5:
            counted += 1
    return d

@lru_cache(maxsize=128)
def obter_estatisticas_cache(usuario_id: str, forcar_atualizacao: bool = False):
    if forcar_atualizacao:
        obter_estatisticas_cache.cache_clear()
    return calcular_estatisticas()

def calcular_estatisticas():
    try:
        total_gerados = protocolos_coll.count_documents({})
        total_finalizados = protocolos_coll.count_documents({"status": "Concluído"})
        total_abertos = protocolos_coll.count_documents({"status": {"$nin": ["Concluído", "EXCLUIDO"]}})
        total_exigencias = protocolos_coll.count_documents({"status": "Exigência"})
        total_pendentes = protocolos_coll.count_documents({"status": "Pendente"})
        total_em_andamento = protocolos_coll.count_documents({"status": "Em andamento"})
        total_exigencias_pendentes = protocolos_coll.count_documents({"status": {"$in": ["Exigência", "Pendente"]}})
        agora = datetime.now(timezone.utc)
        limiar_30_uteis = subtract_business_days(agora, 30)
        total_atrasados = protocolos_coll.count_documents({
            "status": "Em andamento",
            "data_criacao_dt": {"$lte": limiar_30_uteis}
        })
        por_categoria: Dict[str, Dict[str, int]] = {}
        dyn_cats = set(get_allowed_categorias()) | set(protocolos_coll.distinct("categoria"))
        for cat in sorted(dyn_cats):
            gerados = protocolos_coll.count_documents({"categoria": cat})
            finalizados = protocolos_coll.count_documents({"categoria": cat, "status": "Concluído"})
            abertos = protocolos_coll.count_documents({"categoria": cat, "status": {"$nin": ["Concluído", "EXCLUIDO"]}})
            exigencias = protocolos_coll.count_documents({"categoria": cat, "status": "Exigência"})
            pendentes = protocolos_coll.count_documents({"categoria": cat, "status": "Pendente"})
            em_andamento = protocolos_coll.count_documents({"categoria": cat, "status": "Em andamento"})
            exigencias_pendentes = protocolos_coll.count_documents({
                "categoria": cat,
                "status": {"$in": ["Exigência", "Pendente"]}
            })
            atrasados = protocolos_coll.count_documents({
                "categoria": cat,
                "status": "Em andamento",
                "data_criacao_dt": {"$lte": limiar_30_uteis}
            })
            por_categoria[cat] = {
                "gerados": gerados,
                "finalizados": finalizados,
                "abertos": abertos,
                "atrasados": atrasados,
                "exigencias": exigencias,
                "pendentes": pendentes,
                "em_andamento": em_andamento,
                "exigencias_pendentes": exigencias_pendentes
            }
        return {
            "total": {
                "gerados": total_gerados,
                "finalizados": total_finalizados,
                "abertos": total_abertos,
                "atrasados": total_atrasados,
                "exigencias": total_exigencias,
                "pendentes": total_pendentes,
                "em_andamento": total_em_andamento,
                "exigencias_pendentes": total_exigencias_pendentes
            },
            "por_categoria": por_categoria
        }
    except Exception as e:
        logger.error(f"Erro ao calcular estatísticas: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao calcular estatísticas: {e}")

@app.get("/api/protocolo/estatisticas")
def estatisticas_protocolos(forcar_atualizacao: bool = Query(False)):
    try:
        stats = obter_estatisticas_cache("global", forcar_atualizacao)
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao calcular estatísticas: {e}")

@app.get("/api/protocolo/{id}/historico")
def obter_historico(id: str):
    try:
        oid = ObjectId(id)
    except Exception:
        raise HTTPException(status_code=400, detail="ID inválido.")
    p = protocolos_coll.find_one({"_id": oid}, {"historico_alteracoes": 1})
    if not p:
        raise HTTPException(status_code=404, detail="Protocolo não encontrado.")
    return p.get("historico_alteracoes", [])

# ====================== [BLOCO 14: EDIÇÃO / EXCLUSÃO] ======================
@app.put("/api/protocolo/{id}")
def editar_protocolo(id: str, protocolo: dict):
    try:
        oid = ObjectId(id)
    except Exception:
        raise HTTPException(status_code=400, detail="ID inválido.")
    prot = protocolos_coll.find_one({"_id": oid})
    if not prot or prot.get("editavel") is False or prot.get("status", "").upper() == "EXCLUIDO":
        raise HTTPException(status_code=403, detail="Protocolo bloqueado para edição.")
    user_name = (protocolo.get("ultima_alteracao_nome") or "").strip()
    is_admin = False
    if user_name:
        u = usuarios_coll.find_one({"usuario": user_name})
        is_admin = bool(u and u.get("tipo") == "admin")
    atualizacao = protocolo.copy()
    if "observacoes" in atualizacao and atualizacao["observacoes"]:
        atualizacao["observacoes"] = re.sub(r"<br\s*/?>", "\n", atualizacao["observacoes"])
    if "numero" in atualizacao:
        novo_numero = apenas_digitos(str(atualizacao["numero"]))
        if len(novo_numero) != 5 or not novo_numero.isdigit():
            raise HTTPException(status_code=400, detail="Número do protocolo deve conter exatamente 5 dígitos.")
        if novo_numero != prot.get("numero"):
            if not is_admin:
                raise HTTPException(status_code=403, detail="Apenas administradores podem alterar o número do protocolo.")
            if protocolos_coll.find_one({"numero": novo_numero, "_id": {"$ne": oid}}):
                raise HTTPException(status_code=400, detail="Já existe um protocolo com esse número.")
            atualizacao["numero"] = novo_numero
        else:
            atualizacao.pop("numero", None)
    atualizacao.pop("responsavel", None)
    
    # Handle sem_cpf flag
    sem_cpf = atualizacao.get("sem_cpf", False)
    
    if "cpf" in atualizacao:
        cpf_new = apenas_digitos(str(atualizacao["cpf"]))
        # Only validate CPF if sem_cpf is False
        if not sem_cpf:
            if not validar_cpf(cpf_new):
                raise HTTPException(status_code=400, detail="CPF inválido. Informe um CPF válido.")
            atualizacao["cpf"] = cpf_new
        else:
            # If sem_cpf is True, set CPF to empty string
            atualizacao["cpf"] = ""
    if "status" in atualizacao:
        status_novo = str(atualizacao["status"]).strip()
        if status_novo not in ALLOWED_STATUS:
            raise HTTPException(status_code=400, detail="Status inválido.")
        atualizacao["status"] = status_novo
    if "categoria" in atualizacao:
        categoria_nova = str(atualizacao["categoria"]).strip()
        if categoria_nova == "IDT":
            categoria_nova = "RTD"
        if categoria_nova not in get_allowed_categorias():
            raise HTTPException(status_code=400, detail="Categoria inválida.")
        atualizacao["categoria"] = categoria_nova
    if "data_criacao" in atualizacao:
        try:
            atualizacao["data_criacao_dt"] = datetime.strptime(atualizacao["data_criacao"], "%Y-%m-%d").replace(tzinfo=timezone.utc)
        except ValueError:
            raise HTTPException(status_code=400, detail="Data de criação inválida. Use YYYY-MM-DD.")
    unset_fields: Dict[str, Any] = {}
    rp_present = "retirado_por" in atualizacao
    dr_present = "data_retirada" in atualizacao
    rp_val = (atualizacao.get("retirado_por") or "").strip()
    dr_val = (atualizacao.get("data_retirada") or "").strip()
    if rp_present or dr_present:
        if bool(rp_val) != bool(dr_val):
            raise HTTPException(status_code=400, detail="Para registrar retirada, preencha o nome e a data de retirada.")
        if dr_val:
            try:
                atualizacao["data_retirada_dt"] = datetime.strptime(dr_val, "%Y-%m-%d").replace(tzinfo=timezone.utc)
            except ValueError:
                raise HTTPException(status_code=400, detail="Data de retirada inválida. Use YYYY-MM-DD.")
        else:
            unset_fields["data_retirada_dt"] = ""
            atualizacao["retirado_por"] = ""
            atualizacao["data_retirada"] = ""
    def process_exigencia(idx: int):
        nonlocal atualizacao, unset_fields, prot, is_admin
        rp_k = f"exig{idx}_retirada_por"
        dr_k = f"exig{idx}_data_retirada"
        rp2_k = f"exig{idx}_reapresentada_por"
        dr2_k = f"exig{idx}_data_reapresentacao"
        prev_rp = (prot.get(rp_k) or "").strip()
        prev_dr = (prot.get(dr_k) or "").strip()
        prev_rp2 = (prot.get(rp2_k) or "").strip()
        prev_dr2 = (prot.get(dr2_k) or "").strip()
        prev_has_any = bool(prev_rp or prev_dr or prev_rp2 or prev_dr2)
        rp_in = rp_k in atualizacao
        dr_in = dr_k in atualizacao
        rp2_in = rp2_k in atualizacao
        dr2_in = dr2_k in atualizacao
        attempted_change = (
            (rp_in and (atualizacao.get(rp_k, "").strip() != prev_rp)) or
            (dr_in and (atualizacao.get(dr_k, "").strip() != prev_dr)) or
            (rp2_in and (atualizacao.get(rp2_k, "").strip() != prev_rp2)) or
            (dr2_in and (atualizacao.get(dr2_k, "").strip() != prev_dr2))
        )
        if prev_has_any and attempted_change and not is_admin:
            raise HTTPException(status_code=403, detail=f"Campos da {idx}ª exigência só podem ser alterados por usuário admin após inserção.")
        new_rp = (atualizacao.get(rp_k) if rp_in else prev_rp).strip()
        new_dr = (atualizacao.get(dr_k) if dr_in else prev_dr).strip()
        new_rp2 = (atualizacao.get(rp2_k) if rp2_in else prev_rp2).strip()
        new_dr2 = (atualizacao.get(dr2_k) if dr2_in else prev_dr2).strip()
        if (new_rp and not new_dr) or (not new_rp and new_dr):
            raise HTTPException(status_code=400, detail=f"Para a {idx}ª Exigência: preencha 'Exigência retirada por' e 'Data da Retirada'.")
        if (new_rp2 and not new_dr2) or (not new_rp2 and new_dr2):
            raise HTTPException(status_code=400, detail=f"Para a {idx}ª Exigência: preencha 'Reapresentada por' e 'Data da Reapresentação'.")
        if dr_in:
            if new_dr:
                try:
                    atualizacao[f"exig{idx}_data_retirada_dt"] = datetime.strptime(new_dr, "%Y-%m-%d").replace(tzinfo=timezone.utc)
                except ValueError:
                    raise HTTPException(status_code=400, detail=f"Data da Retirada inválida na {idx}ª exigência. Use YYYY-MM-DD.")
            else:
                unset_fields[f"exig{idx}_data_retirada_dt"] = ""
        if dr2_in:
            if new_dr2:
                try:
                    atualizacao[f"exig{idx}_data_reapresentacao_dt"] = datetime.strptime(new_dr2, "%Y-%m-%d").replace(tzinfo=timezone.utc)
                except ValueError:
                    raise HTTPException(status_code=400, detail=f"Data da Reapresentação inválida na {idx}ª exigência. Use YYYY-MM-DD.")
            else:
                unset_fields[f"exig{idx}_data_reapresentacao_dt"] = ""
    for i in (1, 2, 3):
        process_exigencia(i)
    atualizacao["ultima_alteracao_data"] = now_str()
    atualizacao["ultima_alteracao_nome"] = protocolo.get("ultima_alteracao_nome", "") or ""
    atualizacao.pop("id", None)
    changes = build_change_list(prot, atualizacao, unset_fields)
    update_doc: Dict[str, Any] = {"$set": atualizacao, "$push": {"historico_alteracoes": {
        "acao": "editar",
        "usuario": atualizacao["ultima_alteracao_nome"],
        "timestamp": atualizacao["ultima_alteracao_data"],
        "changes": changes
    }}}
    if unset_fields:
        update_doc["$unset"] = unset_fields
    res = protocolos_coll.update_one({"_id": oid}, update_doc)
    if res.matched_count == 1:
        logger.info(f"Protocolo {prot.get('numero', '')} editado")
        
        # Update nome_requerente and whatsapp in all other protocols with the same CPF
        # Only sync if CPF is present and sem_cpf is False
        cpf_atualizado = atualizacao.get("cpf") or prot.get("cpf")
        sem_cpf_flag = atualizacao.get("sem_cpf", prot.get("sem_cpf", False))
        
        if cpf_atualizado and not sem_cpf_flag:
            update_data = {}
            if "nome_requerente" in atualizacao and atualizacao.get("nome_requerente"):
                update_data["nome_requerente"] = atualizacao["nome_requerente"]
            if "whatsapp" in atualizacao and atualizacao.get("whatsapp"):
                update_data["whatsapp"] = atualizacao["whatsapp"]
            
            if update_data:
                protocolos_coll.update_many(
                    {"cpf": cpf_atualizado, "_id": {"$ne": oid}},
                    {"$set": update_data}
                )
                logger.info(f"Dados do requerente atualizados para CPF {cpf_atualizado}")
        
        return {"ok": True}
    raise HTTPException(status_code=404, detail="Protocolo não encontrado ou não alterado.")

@app.delete("/api/protocolo/{id}")
def excluir_protocolo(id: str, usuario: str = Query(...)):
    try:
        oid = ObjectId(id)
    except Exception:
        raise HTTPException(status_code=400, detail="ID inválido.")
    user = usuarios_coll.find_one({"usuario": usuario})
    if not user or user.get("tipo") != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores podem excluir protocolos")
    prot = protocolos_coll.find_one({"_id": oid})
    if not prot:
        raise HTTPException(status_code=404, detail="Protocolo não encontrado.")
    update_doc = {
        "$set": {
            "status": "EXCLUIDO",
            "editavel": False,
            "ultima_alteracao_nome": usuario,
            "ultima_alteracao_data": now_str()
        },
        "$push": {"historico_alteracoes": {
            "acao": "excluir",
            "usuario": usuario,
            "timestamp": now_str(),
            "changes": []
        }}
    }
    res = protocolos_coll.update_one({"_id": oid}, update_doc)
    if res.matched_count == 1:
        logger.info(f"Protocolo {prot.get('numero', '')} excluído por {usuario}")
        return {"ok": True}
    raise HTTPException(status_code=404, detail="Protocolo não encontrado.")

# ====================== [BLOCO 15: ATENÇÃO / AUTOPREENCHIMENTO] ======================
@app.get("/api/protocolo/atencao")
def protocolos_atencao(categoria: Optional[str] = Query(default=None)):
    hoje = datetime.now(timezone.utc)
    limiar_30_uteis = subtract_business_days(hoje, 30)
    filtro = {
        "status": "Em andamento",
        "data_criacao_dt": {"$lte": limiar_30_uteis}
    }
    if categoria:
        filtro["categoria"] = categoria
    protos = list(protocolos_coll.find(filtro).sort("data_criacao_dt", DESCENDING))
    saida = []
    for p in protos:
        p_out = {k: v for k, v in p.items() if k not in ["_id", "data_criacao_dt", "data_retirada_dt", "historico_alteracoes",
                                                          "exig1_data_retirada_dt","exig1_data_reapresentacao_dt",
                                                          "exig2_data_retirada_dt","exig2_data_reapresentacao_dt",
                                                          "exig3_data_retirada_dt","exig3_data_reapresentacao_dt"]}
        p_out["id"] = str(p["_id"])
        saida.append(p_out)
    return saida

@app.get("/api/protocolo/atencao-por-setor")
def protocolos_atencao_por_setor():
    """
    Retorna protocolos em atraso (>30 dias úteis) agrupados por setor/categoria.
    Usado para exibir estatísticas de atrasos na visualização de notificações.
    """
    try:
        hoje = datetime.now(timezone.utc)
        limiar_30_uteis = subtract_business_days(hoje, 30)
        
        filtro = {
            "status": "Em andamento",
            "data_criacao_dt": {"$lte": limiar_30_uteis}
        }
        
        # Aggregate by category
        pipeline = [
            {"$match": filtro},
            {"$group": {
                "_id": "$categoria",
                "total": {"$sum": 1},
                "protocolos": {"$push": {
                    "numero": "$numero",
                    "nome_requerente": "$nome_requerente",
                    "data_criacao": "$data_criacao",
                    "responsavel": "$responsavel"
                }}
            }},
            {"$sort": {"total": -1}}
        ]
        
        result = list(protocolos_coll.aggregate(pipeline))
        
        # Format output
        setores = []
        total_geral = 0
        for item in result:
            setor_nome = item["_id"] or "Sem categoria"
            total = item["total"]
            total_geral += total
            
            setores.append({
                "setor": setor_nome,
                "total": total,
                "protocolos": item["protocolos"][:10]  # Limit to 10 protocols per sector
            })
        
        return {
            "total_geral": total_geral,
            "setores": setores
        }
    except Exception as e:
        logger.error(f"Erro ao buscar protocolos por setor: {e}")
        raise HTTPException(status_code=500, detail="Erro ao buscar dados")

@app.get("/api/protocolo/nome_requerente_por_cpf")
def nome_requerente_por_cpf(cpf: str):
    cpf_puro = apenas_digitos(cpf)
    p = protocolos_coll.find_one({"cpf": cpf_puro}, sort=[("data_criacao_dt", DESCENDING)])
    if p:
        return {
            "nome_requerente": p.get("nome_requerente", ""),
            "whatsapp": p.get("whatsapp", "")
        }
    return {"nome_requerente": "", "whatsapp": ""}

@app.get("/api/protocolo/exigencias-pendentes")
def protocolos_exigencias_pendentes_get(
    categoria: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None)
):
    filtro_base = {"status": {"$in": ["Pendente", "Exigência"]}}
    if categoria:
        filtro_base["categoria"] = categoria
    if status and status in ["Pendente", "Exigência"]:
        filtro_base["status"] = status
    protos = list(protocolos_coll.find(filtro_base).sort("data_criacao_dt", DESCENDING))
    saida = []
    for p in protos:
        p_out = {k: v for k, v in p.items() if k not in [
            "_id", "data_criacao_dt", "data_retirada_dt", "historico_alteracoes",
            "exig1_data_retirada_dt","exig1_data_reapresentacao_dt",
            "exig2_data_retirada_dt","exig2_data_reapresentacao_dt",
            "exig3_data_retirada_dt","exig3_data_reapresentacao_dt"
        ]}
        p_out["id"] = str(p["_id"])
        saida.append(p_out)
    return saida

@app.post("/api/protocolo/exigencias-pendentes")
def protocolos_exigencias_pendentes_post(
    categoria: Optional[str] = Body(default=None),
    status: Optional[str] = Body(default=None)
):
    filtro_base = {"status": {"$in": ["Pendente", "Exigência"]}}
    if categoria:
        filtro_base["categoria"] = categoria
    if status and status in ["Pendente", "Exigência"]:
        filtro_base["status"] = status
    protos = list(protocolos_coll.find(filtro_base).sort("data_criacao_dt", DESCENDING))
    saida = []
    for p in protos:
        p_out = {k: v for k, v in p.items() if k not in [
            "_id", "data_criacao_dt", "data_retirada_dt", "historico_alteracoes",
            "exig1_data_retirada_dt","exig1_data_reapresentacao_dt",
            "exig2_data_retirada_dt","exig2_data_reapresentacao_dt",
            "exig3_data_retirada_dt","exig3_data_reapresentacao_dt"
        ]}
        p_out["id"] = str(p["_id"])
        saida.append(p_out)
    return saida

# ====================== [BLOCO 16: MIGRAÇÃO DE DADOS] ======================
@app.post("/api/admin/migrar-datas")
def migrar_datas_antigas(usuario: str = Body(...), senha: str = Body(...)):
    user = usuarios_coll.find_one({"usuario": usuario})
    if not user or not verify_password(senha, user.get("senha", "")) or user.get("tipo") != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores podem executar esta ação")
    try:
        protocolos_sem_dt = list(protocolos_coll.find({
            "data_criacao_dt": {"$exists": False},
            "data_criacao": {"$exists": True, "$ne": ""}
        }))
        migrados = 0
        erros = 0
        logger.info(f"Encontrados {len(protocolos_sem_dt)} protocolos para migração")
        for protocolo in protocolos_sem_dt:
            try:
                data_str = protocolo.get("data_criacao", "")
                if data_str and re.match(r"^\d{4}-\d{2}-\d{2}$", data_str):
                    data_dt = datetime.strptime(data_str, "%Y-%m-%d").replace(tzinfo=timezone.utc)
                    result = protocolos_coll.update_one(
                        {"_id": protocolo["_id"]},
                        {"$set": {"data_criacao_dt": data_dt}}
                    )
                    if result.modified_count == 1:
                        migrados += 1
                    else:
                        erros += 1
                else:
                    erros += 1
            except Exception as e:
                erros += 1
                logger.error(f"Erro ao migrar protocolo {protocolo.get('numero')}: {e}")
        obter_estatisticas_cache.cache_clear()
        return {"migrados": migrados, "erros": erros, "message": f"Migração concluída: {migrados} protocolos atualizados, {erros} erros"}
    except Exception as e:
        logger.error(f"Erro na migração: {e}")
        raise HTTPException(status_code=500, detail=f"Erro na migração: {e}")

# ====================== [BLOCO 17: BACKUP COMPLETO (BD + SISTEMA)] ======================
@app.post("/api/backup/full")
def backup_completo():
    try:
        data = {
            "protocolos": list(protocolos_coll.find()),
            "usuarios": list(usuarios_coll.find({})),
        }
        mongodb_json = bson_dumps(data, indent=2)
        root_dir = os.path.abspath(os.path.dirname(__file__))
        workspace_dir = os.path.abspath(os.path.join(root_dir, ".."))
        blacklist_dirs = {'.venv', '.pytest_cache', '__pycache__', '.git', 'node_modules', 'backup'}
        blacklist_files = set()
        mem_zip = BytesIO()
        with zipfile.ZipFile(mem_zip, "w", zipfile.ZIP_DEFLATED) as zipf:
            zipf.writestr("bkp_db_protocolos.json", mongodb_json)
            for folder, subs, files in os.walk(workspace_dir):
                rel_folder = os.path.relpath(folder, workspace_dir)
                if rel_folder == ".":
                    rel_folder = ""
                if any(part in blacklist_dirs for part in rel_folder.split(os.sep)):
                    continue
                for file in files:
                    if file in blacklist_files:
                        continue
                    abs_path = os.path.join(folder, file)
                    rel_path_in_zip = os.path.join("sistema", rel_folder, file)
                    try:
                        zipf.write(abs_path, arcname=rel_path_in_zip)
                    except Exception as e:
                        print(f"Não pôde adicionar {abs_path}: {e}")
        mem_zip.seek(0)
        fname = f"backup_completo_{_dt.now().strftime('%Y%m%d_%H%M%S')}.zip"
        return StreamingResponse(
            mem_zip,
            media_type="application/zip",
            headers={"Content-Disposition": f'attachment; filename="{fname}"'}
        )
    except Exception as e:
        logging.exception(f"Erro ao gerar backup completo: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao gerar backup completo: {e}")

@app.post("/api/backup")
def backup_dados():
    try:
        data = {"protocolos": list(protocolos_coll.find()), "usuarios": list(usuarios_coll.find())}
        json_str = bson_dumps(data, indent=2)
        bio = io.BytesIO(json_str.encode("utf-8"))
        fname = "backup_protocolos.json"
        return StreamingResponse(
            bio,
            media_type="application/json",
            headers={"Content-Disposition": f'attachment; filename="{fname}"'}
        )
    except Exception as e:
        logger.exception("Erro ao gerar backup simples: %s", e)
        raise HTTPException(status_code=500, detail="Erro ao gerar backup.")

@app.post("/api/backup/upload")
async def restaurar_backup(file: UploadFile = File(...)):
    try:
        content = await file.read()
        data = bson_loads(content.decode("utf-8"))
        if "usuarios" in data:
            usuarios_coll.delete_many({})
            usuarios_coll.insert_many(data["usuarios"])
        if "protocolos" in data:
            protocolos_coll.delete_many({})
            protocolos_coll.insert_many(data["protocolos"])
        obter_estatisticas_cache.cache_clear()
        return {"ok": True, "msg": "Backup restaurado (substituído)."}
    except Exception as e:
        logger.exception("Erro ao restaurar backup: %s", e)
        raise HTTPException(status_code=500, detail=f"Erro ao restaurar: {str(e)}")

@app.post("/api/backup/upload/protected")
async def restaurar_backup_protegido(usuario: str = Query(...), file: UploadFile = File(...)):
    if not _is_admin_usuario(usuario):
        raise HTTPException(status_code=403, detail="Apenas administradores podem restaurar backup.")
    try:
        content = await file.read()
        data = bson_loads(content.decode("utf-8"))
        if "usuarios" in data:
            usuarios_coll.delete_many({})
            usuarios_coll.insert_many(data["usuarios"])
        if "protocolos" in data:
            protocolos_coll.delete_many({})
            protocolos_coll.insert_many(data["protocolos"])
        obter_estatisticas_cache.cache_clear()
        return {"ok": True}
    except Exception as e:
        logger.exception("Erro ao restaurar backup protegido: %s", e)
        raise HTTPException(status_code=500, detail=f"Erro ao restaurar: {str(e)}")

@app.post("/api/backup/upload/protected2")
async def restaurar_backup_protegido2(usuario: str = Body(...), senha: str = Body(...), file: UploadFile = File(...)):
    user = usuarios_coll.find_one({"usuario": usuario})
    if not user or not verify_password(senha, user.get("senha", "")) or user.get("tipo") != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores podem restaurar backup.")
    try:
        content = await file.read()
        data = bson_loads(content.decode("utf-8"))
        if "usuarios" in data:
            usuarios_coll.delete_many({})
            usuarios_coll.insert_many(data["usuarios"])
        if "protocolos" in data:
            protocolos_coll.delete_many({})
            protocolos_coll.insert_many(data["protocolos"])
        obter_estatisticas_cache.cache_clear()
        return {"ok": True}
    except Exception as e:
        logger.exception("Erro ao restaurar backup protegido: %s", e)
        raise HTTPException(status_code=500, detail=f"Erro ao restaurar: {str(e)}")

# ====================== [BLOCO 18: ENDPOINTS PARA NOTIFICAÇÕES E FILTROS] ======================
@app.get("/api/notificacoes")
def listar_notificacoes(usuario: Optional[str] = Query(default=None)):
    try:
        query = {}
        if usuario:
            query["usuario"] = usuario
        docs = list(notificacoes_coll.find(query).sort("data_criacao", DESCENDING))
        out = []
        for d in docs:
            o = {k: v for k, v in d.items() if k != "_id"}
            o["id"] = str(d["_id"])
            out.append(o)
        return out
    except Exception as e:
        logger.exception("Erro ao listar notificações: %s", e)
        raise HTTPException(status_code=500, detail="Erro ao listar notificações.")

@app.put("/api/notificacao/{id}/ler")
def marcar_notificacao_lida(id: str):
    try:
        oid = ObjectId(id)
    except Exception:
        raise HTTPException(status_code=400, detail="ID inválido.")
    res = notificacoes_coll.update_one({"_id": oid}, {"$set": {"lida": True}})
    if res.matched_count:
        return {"ok": True}
    raise HTTPException(status_code=404, detail="Notificação não encontrada.")

@app.get("/api/filtros")
def listar_filtros(usuario: Optional[str] = Query(default=None)):
    try:
        q = {}
        if usuario:
            q["usuario"] = usuario
        docs = list(filtros_coll.find(q).sort("data_atualizacao", DESCENDING))
        out = []
        for d in docs:
            out.append({
                "id": str(d["_id"]),
                "nome": d.get("nome", ""),
                "data_atualizacao": d.get("data_atualizacao"),
                "filtros": d.get("filtros", {})
            })
        return out
    except Exception as e:
        logger.exception("Erro ao listar filtros: %s", e)
        raise HTTPException(status_code=500, detail="Erro ao listar filtros.")

@app.post("/api/filtros/salvar")
def salvar_filtro(body: dict = Body(...)):
    try:
        nome = body.get("nome")
        filtros = body.get("filtros", {})
        usuario = body.get("usuario")
        if not nome or not usuario:
            raise HTTPException(status_code=400, detail="Dados insuficientes.")
        doc = {"nome": nome, "filtros": filtros, "usuario": usuario, "data_atualizacao": now_str()}
        res = filtros_coll.insert_one(doc)
        return {"ok": True, "id": str(res.inserted_id)}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Erro ao salvar filtro: %s", e)
        raise HTTPException(status_code=500, detail="Erro ao salvar filtro.")

# ====================== [BLOCO 19: UTILITÁRIOS, HEALTH, PROTEÇÕES] ======================
def _serialize_value(v):
    try:
        if isinstance(v, ObjectId):
            return str(v)
        if isinstance(v, datetime):
            return v.astimezone(timezone.utc).isoformat().replace('+00:00', 'Z')
        if isinstance(v, list):
            return [_serialize_value(x) for x in v]
        if isinstance(v, dict):
            return {k: _serialize_value(val) for k, val in v.items()}
        return v
    except Exception:
        try:
            return str(v)
        except Exception:
            return None

def _serialize_doc(doc: Dict[str, Any]) -> Dict[str, Any]:
    out: Dict[str, Any] = {}
    for k, v in doc.items():
        if k == "_id":
            out["id"] = str(v)
            continue
        out[k] = _serialize_value(v)
    return out

# ====================== [FINALIZADOS ROUTE - Must be before /{id}] ======================
@app.get("/api/protocolo/finalizados/{data}")
def protocolos_finalizados_por_data(data: str):
    """
    Retorna protocolos com status 'Concluído' finalizados na data especificada.
    Data no formato: YYYY-MM-DD
    
    IMPORTANTE: Esta rota deve vir ANTES de /api/protocolo/{id} para evitar
    que FastAPI interprete 'finalizados' como um ID de protocolo.
    """
    try:
        # Parse data
        from datetime import datetime, timedelta
        data_obj = datetime.strptime(data, "%Y-%m-%d")
        data_inicio = data_obj.replace(hour=0, minute=0, second=0, microsecond=0)
        data_fim = data_obj.replace(hour=23, minute=59, second=59, microsecond=999999)
        
        # Buscar protocolos concluídos nesta data
        # Considera data de última alteração (quando mudou para Concluído)
        filtro = {
            "status": "Concluído",
            "ultima_alteracao_data": {"$exists": True, "$ne": ""}
        }
        
        protos = list(protocolos_coll.find(filtro))
        
        # Filtrar por data no Python (já que ultima_alteracao_data é string)
        data_str = data_obj.strftime("%d/%m/%Y")
        protos_data = []
        
        for p in protos:
            # Checar se a data de última alteração corresponde
            if p.get("ultima_alteracao_data", "").startswith(data_str):
                p_out = {k: v for k, v in p.items() if k not in [
                    "_id", "data_criacao_dt", "data_retirada_dt", "historico_alteracoes",
                    "exig1_data_retirada_dt","exig1_data_reapresentacao_dt",
                    "exig2_data_retirada_dt","exig2_data_reapresentacao_dt",
                    "exig3_data_retirada_dt","exig3_data_reapresentacao_dt"
                ]}
                p_out["id"] = str(p["_id"])
                protos_data.append(p_out)
        
        return protos_data
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Formato de data inválido. Use YYYY-MM-DD. Erro: {str(e)}")
    except Exception as e:
        logger.error(f"Erro ao buscar protocolos finalizados: {str(e)}")
        raise HTTPException(status_code=500, detail="Erro interno ao buscar protocolos")

@app.get("/api/protocolo/{id}", response_model=Optional[Dict[str, Any]])
def get_protocolo_por_id(id: str):
    try:
        oid = ObjectId(id)
    except Exception:
        raise HTTPException(status_code=400, detail="ID inválido.")
    p = protocolos_coll.find_one({"_id": oid})
    if not p:
        raise HTTPException(status_code=404, detail="Protocolo não encontrado.")
    return _serialize_doc(p)

@app.get("/api/health")
def health_check():
    ok = True
    msg = "ok"
    try:
        client.admin.command("ping")
    except Exception as e:
        logger.exception("Health check Mongo falhou: %s", e)
        ok = False
        msg = f"mongo error: {str(e)}"
    status_code = 200 if ok else 503
    return JSONResponse(status_code=status_code, content={"status": "ok" if ok else "error", "detail": msg})

@app.get("/api/version")
def api_version():
    return {"app": "Sistema de Gestão de Protocolos", "version": "2.0.1"}

@app.post("/api/notificacoes/exemplo")
def criar_notificacao_exemplo(usuario: str = Body(...), mensagem: str = Body(...)):
    try:
        doc = {
            "usuario": usuario,
            "mensagem": mensagem,
            "tipo": "info",
            "lida": False,
            "data_criacao": now_str()
        }
        res = notificacoes_coll.insert_one(doc)
        return {"ok": True, "id": str(res.inserted_id)}
    except Exception as e:
        logger.exception("Erro ao criar notificação de exemplo: %s", e)
        raise HTTPException(status_code=500, detail="Erro ao criar notificação.")

def _is_admin_usuario(usuario_nome: str) -> bool:
    if not usuario_nome:
        return False
    u = usuarios_coll.find_one({"usuario": usuario_nome})
    return bool(u and u.get("tipo") == "admin")

# ====================== [NOVAS ROTAS: CATEGORIAS (SETORES)] ======================
@app.get("/api/categorias")
def listar_categorias():
    try:
        docs = list(categorias_coll.find().sort("nome", ASCENDING))
        out = []
        for d in docs:
            out.append({
                "id": str(d["_id"]),
                "nome": d.get("nome"),
                "descricao": d.get("descricao", "")
            })
        return out
    except Exception as e:
        logger.exception("Erro ao listar categorias: %s", e)
        raise HTTPException(status_code=500, detail="Erro ao listar categorias.")

@app.post("/api/categoria")
def criar_categoria(categoria: CategoriaModel = Body(...), usuario: str = Query(...)):
    if not _is_admin_usuario(usuario):
        raise HTTPException(status_code=403, detail="Apenas administradores podem criar categorias.")
    doc = {"nome": categoria.nome.strip(), "descricao": (categoria.descricao or "").strip()}
    try:
        res = categorias_coll.insert_one(doc)
        logger.info(f"Categoria criada: {doc['nome']} por {usuario}")
        return {"ok": True, "id": str(res.inserted_id)}
    except errors.DuplicateKeyError:
        raise HTTPException(status_code=400, detail="Categoria já existe.")
    except Exception as e:
        logger.exception("Erro ao criar categoria: %s", e)
        raise HTTPException(status_code=500, detail="Erro ao criar categoria.")

@app.put("/api/categoria/{id}")
def atualizar_categoria(id: str, body: dict = Body(...), usuario: str = Query(...)):
    if not _is_admin_usuario(usuario):
        raise HTTPException(status_code=403, detail="Apenas administradores podem atualizar categorias.")
    try:
        oid = ObjectId(id)
    except Exception:
        raise HTTPException(status_code=400, detail="ID inválido.")
    nome = (body.get("nome") or "").strip()
    descricao = (body.get("descricao") or "").strip()
    if not nome:
        raise HTTPException(status_code=400, detail="Nome obrigatório.")
    try:
        if categorias_coll.find_one({"nome": nome, "_id": {"$ne": oid}}):
            raise HTTPException(status_code=400, detail="Já existe uma categoria com esse nome.")
        res = categorias_coll.update_one({"_id": oid}, {"$set": {"nome": nome, "descricao": descricao}})
        if res.matched_count:
            logger.info(f"Categoria {id} atualizada por {usuario}")
            return {"ok": True}
        raise HTTPException(status_code=404, detail="Categoria não encontrada.")
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Erro ao atualizar categoria: %s", e)
        raise HTTPException(status_code=500, detail="Erro ao atualizar categoria.")

@app.delete("/api/categoria/{id}")
def excluir_categoria(id: str, usuario: str = Query(...)):
    if not _is_admin_usuario(usuario):
        raise HTTPException(status_code=403, detail="Apenas administradores podem excluir categorias.")
    try:
        oid = ObjectId(id)
    except Exception:
        raise HTTPException(status_code=400, detail="ID inválido.")
    res = categorias_coll.delete_one({"_id": oid})
    if res.deleted_count:
        logger.info(f"Categoria {id} excluída por {usuario}")
        return {"ok": True}
    raise HTTPException(status_code=404, detail="Categoria não encontrada.")

# ====================== [NOVO ENDPOINT: ZERAR APLICAÇÃO (RESET) - APENAS ADMIN] ======================
@app.post("/api/admin/zerar-app")
def zerar_aplicacao(usuario: str = Body(...), senha: str = Body(...)):
    user = usuarios_coll.find_one({"usuario": usuario})
    if not user or not verify_password(senha, user.get("senha", "")) or user.get("tipo") != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores podem executar esta ação")
    try:
        protocolos_coll.delete_many({})
        filtros_coll.delete_many({})
        notificacoes_coll.delete_many({})
        categorias_coll.delete_many({})
        usuarios_coll.delete_many({})
        usuarios_coll.insert_one({
            "usuario": usuario,
            "senha": hash_password(senha),
            "tipo": "admin"
        })
        create_indexes()
        inicializa_admin()
        obter_estatisticas_cache.cache_clear()
        logger.warning(f"Aplicação zerada pelo admin {usuario}")
        return {"ok": True, "msg": "Aplicação reiniciada para estado inicial (usuários, dados e categorias removidos)."}
    except Exception as e:
        logger.exception("Erro ao zerar aplicação: %s", e)
        raise HTTPException(status_code=500, detail=f"Erro ao zerar aplicação: {e}")

# ====================== [ADMIN: VERIFICAR ATRASOS E NOTIFICAR ADMINS] ======================
@app.post("/api/admin/verificar-atrasos")
def admin_verificar_atrasos(
    usuario: str = Body(...),
    senha: str = Body(...),
    categoria: Optional[str] = Body(default=None)
):
    """
    Varre protocolos em atraso (>30 dias úteis, status 'Em andamento') e cria notificações.
    Regra: apenas admin pode executar.
    Destinatário: todos os admins.
    Anti-spam: no máximo 1 notificação por dia (UTC) por admin.
    """
    user = usuarios_coll.find_one({"usuario": usuario})
    if not user or not verify_password(senha, user.get("senha", "")) or user.get("tipo") != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores podem executar esta ação")

    agora = datetime.now(timezone.utc)
    limiar_30_uteis = subtract_business_days(agora, 30)

    filtro = {
        "status": "Em andamento",
        "data_criacao_dt": {"$lte": limiar_30_uteis},
    }
    if categoria:
        filtro["categoria"] = categoria

    atrasados = list(protocolos_coll.find(
        filtro,
        {"numero": 1, "categoria": 1, "nome_requerente": 1, "data_criacao": 1}
    ))
    total_atrasados = len(atrasados)

    # Mesmo sem atrasados, não cria notificação (evita ruído)
    if total_atrasados == 0:
        return {"ok": True, "atrasados": 0, "notificacoes_criadas": 0, "skipped_por_ja_existir": 0}

    # Admins que recebem
    admins = list(usuarios_coll.find({"tipo": "admin"}, {"usuario": 1}))
    admin_names = [a.get("usuario") for a in admins if a.get("usuario")]

    # Mensagem resumo (com alguns exemplos)
    lista_nums = ", ".join([p.get("numero", "") for p in atrasados[:20] if p.get("numero")])
    sufixo = f" (e mais {total_atrasados - 20})" if total_atrasados > 20 else ""
    msg = f"⚠️ Atrasos detectados: {total_atrasados} protocolo(s) 'Em andamento' com +30 dias úteis. Exemplos: {lista_nums}{sufixo}"

    # Janela do “dia atual UTC”
    inicio_dia = agora.replace(hour=0, minute=0, second=0, microsecond=0)
    fim_dia = inicio_dia + timedelta(days=1)

    created = 0
    skipped = 0

    for admin_user in admin_names:
        # 1 alerta por dia por admin (filtra por tipo + usuário + data_criacao_dt no dia)
        ja_hoje = notificacoes_coll.find_one({
            "usuario": admin_user,
            "tipo": "alerta_atrasos",
            "data_criacao_dt": {"$gte": inicio_dia, "$lt": fim_dia}
        })

        if ja_hoje:
            skipped += 1
            continue

        notificacoes_coll.insert_one({
            "usuario": admin_user,
            "mensagem": msg,
            "tipo": "alerta_atrasos",
            "lida": False,
            "data_criacao": now_str(),
            "data_criacao_dt": agora
        })
        created += 1

    return {
        "ok": True,
        "atrasados": total_atrasados,
        "notificacoes_criadas": created,
        "skipped_por_ja_existir": skipped
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)