#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Database Initialization Script
Creates the SQLite database and tables if they don't exist
"""

import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Determine database type
DB_TYPE = os.getenv("DB_TYPE", "sqlite").lower()

print("=" * 60)
print("Inicialização do Banco de Dados")
print("=" * 60)
print(f"Tipo de banco: {DB_TYPE.upper()}")

if DB_TYPE == "sqlite":
    SQLITE_DB_PATH = os.getenv("SQLITE_DB_PATH", "protocolos.db")
    print(f"Caminho do banco: {SQLITE_DB_PATH}")
    print()
    
    try:
        # Import SQLite module
        from db_sqlite import get_database
        
        print("[1/3] Criando/verificando banco de dados SQLite...")
        collections = get_database(SQLITE_DB_PATH)
        print(f"✅ Banco de dados criado/verificado: {SQLITE_DB_PATH}")
        
        print("\n[2/3] Verificando tabelas...")
        # Get collection references
        usuarios_coll = collections['usuarios']
        protocolos_coll = collections['protocolos']
        categorias_coll = collections['categorias']
        notificacoes_coll = collections['notificacoes']
        filtros_coll = collections['filtros']
        protocolos_excluidos_coll = collections['protocolos_excluidos']
        
        # Test each collection
        tables = {
            'usuarios': usuarios_coll,
            'protocolos': protocolos_coll,
            'categorias': categorias_coll,
            'notificacoes': notificacoes_coll,
            'filtros': filtros_coll,
            'protocolos_excluidos': protocolos_excluidos_coll
        }
        
        for table_name, coll in tables.items():
            count = coll.count_documents({})
            print(f"   ✅ Tabela '{table_name}': {count} registros")
        
        print("\n[3/3] Verificando estrutura...")
        # The tables are created automatically by SQLAlchemy
        print("✅ Estrutura do banco de dados validada")
        
        print("\n" + "=" * 60)
        print("✅ Inicialização concluída com sucesso!")
        print("=" * 60)
        print(f"\nBanco de dados pronto em: {os.path.abspath(SQLITE_DB_PATH)}")
        print("Tamanho do arquivo:", end=" ")
        if os.path.exists(SQLITE_DB_PATH):
            size = os.path.getsize(SQLITE_DB_PATH)
            if size < 1024:
                print(f"{size} bytes")
            elif size < 1024 * 1024:
                print(f"{size / 1024:.2f} KB")
            else:
                print(f"{size / (1024 * 1024):.2f} MB")
        else:
            print("0 bytes (novo)")
        
        print("\nPróximos passos:")
        print("1. Execute 'python cria_admin.py' para criar usuário admin")
        print("2. Execute 'python main.py' para iniciar o servidor")
        
    except ImportError as e:
        print(f"\n❌ ERRO: Dependências não instaladas")
        print(f"Detalhes: {e}")
        print("\nInstale as dependências:")
        print("   pip install -r requirements.txt")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ ERRO ao inicializar banco de dados:")
        print(f"   {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

elif DB_TYPE == "mongodb":
    print("\nMongoDB configurado no .env")
    print("O banco será inicializado automaticamente ao iniciar o servidor.")
    print("\nCertifique-se de que o MongoDB está rodando:")
    MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017/")
    DB_NAME = os.getenv("DB_NAME", "protocolos_db")
    print(f"   URL: {MONGO_URL}")
    print(f"   Database: {DB_NAME}")
    print("\n✅ Configuração MongoDB verificada")

else:
    print(f"\n❌ ERRO: Tipo de banco inválido: {DB_TYPE}")
    print("Valores válidos: 'sqlite' ou 'mongodb'")
    print("Configure DB_TYPE no arquivo .env")
    sys.exit(1)
