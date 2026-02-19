#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para corrigir senhas em texto plano no banco de dados
Converte senhas antigas (texto plano) para formato hash PBKDF2
"""

import os
import sys
import base64
import hashlib
import secrets
from pathlib import Path

# --- CONFIGURAÇÃO ---
SQLITE_DB_PATH = os.getenv("SQLITE_DB_PATH", "protocolos.db")
backend_dir = Path(__file__).parent

# Handle both relative and absolute paths
if os.path.isabs(SQLITE_DB_PATH):
    db_path = Path(SQLITE_DB_PATH)
else:
    db_path = backend_dir / SQLITE_DB_PATH

# --- FUNÇÕES DE HASH ---
PBKDF2_ALG = "pbkdf2_sha256"
PBKDF2_ITER = 260_000
PBKDF2_SALT_LEN = 16

def hash_password(raw: str) -> str:
    """Hash password using PBKDF2-SHA256"""
    salt = secrets.token_bytes(PBKDF2_SALT_LEN)
    dk = hashlib.pbkdf2_hmac("sha256", raw.encode("utf-8"), salt, PBKDF2_ITER)
    return f"{PBKDF2_ALG}${PBKDF2_ITER}${base64.b64encode(salt).decode()}${base64.b64encode(dk).decode()}"

def is_hashed(password: str) -> bool:
    """Check if password is already hashed"""
    return password.startswith(f"{PBKDF2_ALG}$") or password.startswith("$2")

def fix_sqlite_passwords():
    """Fix plain text passwords in SQLite database"""
    try:
        import sqlite3
        
        if not db_path.exists():
            print(f"✗ Erro: Banco de dados não encontrado: {db_path}")
            return False
        
        print(f"Conectando ao banco: {db_path}")
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()
        
        # Buscar todos os usuários
        cursor.execute("SELECT id, usuario, senha FROM usuarios")
        users = cursor.fetchall()
        
        if not users:
            print("⚠ Nenhum usuário encontrado no banco de dados")
            return True
        
        print(f"\nEncontrados {len(users)} usuário(s)")
        print("-" * 60)
        
        updated = 0
        already_hashed = 0
        
        for user_id, usuario, senha in users:
            if is_hashed(senha):
                print(f"✓ {usuario}: Senha já está hasheada")
                already_hashed += 1
            else:
                print(f"⚠ {usuario}: Senha em texto plano detectada!")
                print(f"  Senha atual: {senha}")
                
                # Confirmar antes de alterar
                resposta = input(f"  Converter senha de '{usuario}' para hash? (s/N): ")
                if resposta.lower() in ['s', 'sim', 'y', 'yes']:
                    senha_hash = hash_password(senha)
                    cursor.execute("UPDATE usuarios SET senha = ? WHERE id = ?", (senha_hash, user_id))
                    print(f"  ✓ Senha convertida: {senha_hash[:50]}...")
                    updated += 1
                else:
                    print(f"  ⊘ Pulado")
        
        if updated > 0:
            conn.commit()
            print("\n" + "=" * 60)
            print(f"✓ {updated} senha(s) atualizada(s) com sucesso!")
            print(f"✓ {already_hashed} senha(s) já estavam hasheadas")
            print("=" * 60)
        else:
            print("\n" + "=" * 60)
            print("✓ Nenhuma alteração necessária")
            print(f"✓ Todas as {already_hashed} senhas já estão hasheadas")
            print("=" * 60)
        
        conn.close()
        return True
        
    except Exception as e:
        print(f"\n✗ Erro: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    print("=" * 60)
    print("CORREÇÃO DE SENHAS EM TEXTO PLANO")
    print("=" * 60)
    print()
    print("Este script converte senhas em texto plano para")
    print("formato hash PBKDF2-SHA256 (mesmo formato usado pela aplicação)")
    print()
    print("⚠ AVISO: Faça backup do banco antes de continuar!")
    print()
    print("=" * 60)
    print()
    
    resposta = input("Deseja continuar? (s/N): ")
    if resposta.lower() not in ['s', 'sim', 'y', 'yes']:
        print("\n✗ Operação cancelada pelo usuário")
        sys.exit(0)
    
    print()
    success = fix_sqlite_passwords()
    
    if success:
        print("\n✓ Processo concluído!")
        print("\nVocê pode agora iniciar o servidor:")
        print("  python3 main.py")
    else:
        print("\n✗ Processo falhou!")
        sys.exit(1)

if __name__ == "__main__":
    main()
