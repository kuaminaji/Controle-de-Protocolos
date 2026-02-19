#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para criar usuário administrador no banco de dados
Suporta tanto MongoDB quanto SQLite
Usa o mesmo método de hash de senha que a aplicação principal
"""

import os
import sys
import base64
import secrets
import hashlib
from pathlib import Path

# Adicionar diretório backend ao path para importar funções
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

# Importar configuração de ambiente
from dotenv import load_dotenv
load_dotenv(backend_dir.parent / '.env')

# --- CONFIGURAÇÃO ---
DB_TYPE = os.getenv("DB_TYPE", "sqlite").lower()
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017/")
DB_NAME = os.getenv("DB_NAME", "protocolos_db")
SQLITE_DB_PATH = os.getenv("SQLITE_DB_PATH", "protocolos.db")
ADMIN_USER = os.getenv("ADMIN_USER", "admin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123@")

# --- FUNÇÕES DE HASH (Copiadas de main.py para consistência) ---
PBKDF2_ALG = "pbkdf2_sha256"
PBKDF2_ITER = 260_000
PBKDF2_SALT_LEN = 16

def hash_password(raw: str) -> str:
    """Hash password using PBKDF2-SHA256 (same as main.py)"""
    salt = secrets.token_bytes(PBKDF2_SALT_LEN)
    dk = hashlib.pbkdf2_hmac("sha256", raw.encode("utf-8"), salt, PBKDF2_ITER)
    return f"{PBKDF2_ALG}${PBKDF2_ITER}${base64.b64encode(salt).decode()}${base64.b64encode(dk).decode()}"

def criar_admin_mongo():
    """Cria usuário admin no MongoDB"""
    try:
        from pymongo import MongoClient
        
        print(f"[MongoDB] Conectando a {MONGO_URL}...")
        client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=5000)
        db = client[DB_NAME]
        usuarios_coll = db["usuarios"]
        
        # Verificar se admin já existe
        if usuarios_coll.find_one({"usuario": ADMIN_USER}):
            print(f"[MongoDB] Usuário '{ADMIN_USER}' já existe.")
            return
        
        # Criar admin com senha hasheada
        senha_hash = hash_password(ADMIN_PASSWORD)
        usuarios_coll.insert_one({
            "usuario": ADMIN_USER,
            "senha": senha_hash,
            "tipo": "admin",
            "bloqueado": False
        })
        print(f"[MongoDB] ✓ Usuário '{ADMIN_USER}' criado com sucesso!")
        print(f"[MongoDB]   Senha: {ADMIN_PASSWORD}")
        print(f"[MongoDB]   Senha hash: {senha_hash[:50]}...")
        
    except ImportError:
        print("[MongoDB] ✗ Erro: pymongo não instalado. Instale com: pip install pymongo")
    except Exception as e:
        print(f"[MongoDB] ✗ Erro: {e}")

def criar_admin_sqlite():
    """Cria usuário admin no SQLite"""
    try:
        import sqlite3
        
        # Usar caminho completo do banco
        db_path = backend_dir / SQLITE_DB_PATH if not os.path.isabs(SQLITE_DB_PATH) else SQLITE_DB_PATH
        
        print(f"[SQLite] Conectando a {db_path}...")
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()
        
        # Criar tabela se não existir
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS usuarios (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                usuario TEXT UNIQUE NOT NULL,
                senha TEXT NOT NULL,
                tipo TEXT NOT NULL,
                bloqueado INTEGER DEFAULT 0
            )
        ''')
        
        # Verificar se admin já existe
        cursor.execute("SELECT id FROM usuarios WHERE usuario = ?", (ADMIN_USER,))
        if cursor.fetchone() is not None:
            print(f"[SQLite] Usuário '{ADMIN_USER}' já existe.")
            conn.close()
            return
        
        # Criar admin com senha hasheada
        senha_hash = hash_password(ADMIN_PASSWORD)
        cursor.execute(
            "INSERT INTO usuarios (usuario, senha, tipo, bloqueado) VALUES (?, ?, ?, ?)",
            (ADMIN_USER, senha_hash, "admin", 0)
        )
        conn.commit()
        conn.close()
        
        print(f"[SQLite] ✓ Usuário '{ADMIN_USER}' criado com sucesso!")
        print(f"[SQLite]   Senha: {ADMIN_PASSWORD}")
        print(f"[SQLite]   Senha hash: {senha_hash[:50]}...")
        
    except Exception as e:
        print(f"[SQLite] ✗ Erro: {e}")
        import traceback
        traceback.print_exc()

def main():
    print("=" * 60)
    print("CRIAÇÃO DE USUÁRIO ADMINISTRADOR")
    print("=" * 60)
    print(f"Banco de dados: {DB_TYPE.upper()}")
    print(f"Usuário: {ADMIN_USER}")
    print(f"Senha: {ADMIN_PASSWORD}")
    print("=" * 60)
    print()
    
    if DB_TYPE == "sqlite":
        criar_admin_sqlite()
    elif DB_TYPE == "mongodb":
        criar_admin_mongo()
    else:
        print(f"✗ Erro: DB_TYPE '{DB_TYPE}' desconhecido. Use 'sqlite' ou 'mongodb'")
        sys.exit(1)
    
    print()
    print("=" * 60)
    print("IMPORTANTE: Altere a senha padrão após o primeiro login!")
    print("=" * 60)

if __name__ == "__main__":
    main()
