#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Patch script to convert main.py to use database adapter
This replaces MongoDB-specific imports and initialization with database adapter
"""

import sys
import re

def patch_main_py():
    with open('main.py', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Step 1: Update imports - make MongoDB imports conditional
    old_imports = """try:
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
from pymongo import ASCENDING, DESCENDING"""
    
    new_imports = """try:
    import bcrypt  # type: ignore
except ImportError:
    bcrypt = None

# Database adapter - supports both MongoDB and SQLite
from db_adapter import get_db_collections, create_indexes_for_db, get_object_id_class, convert_id_for_response

# Conditional imports based on DB_TYPE
DB_TYPE = os.getenv("DB_TYPE", "sqlite").lower()

if DB_TYPE == "mongodb":
    from bson import ObjectId
    from bson.json_util import dumps as bson_dumps, loads as bson_loads
    from pymongo import MongoClient, errors
    from pymongo.collection import Collection
    from pymongo import ASCENDING, DESCENDING
else:
    # Use adapter's ObjectId replacement
    ObjectId = get_object_id_class()
    bson_dumps = lambda x: json.dumps(x)
    bson_loads = lambda x: json.loads(x)
    ASCENDING = 1
    DESCENDING = -1

from fastapi import FastAPI, HTTPException, Query, Body, Request, Depends, UploadFile, File, status
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, field_validator, ValidationError"""
    
    content = content.replace(old_imports, new_imports)
    
    # Step 2: Replace database initialization
    old_db_init = """# ====================== [BLOCO 5: CONFIGURAÇÃO DO BANCO E ÍNDICES] ======================
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017/")
DB_NAME = os.getenv("DB_NAME", "protocolos_db")
client = criar_cliente_mongodb(MONGO_URL)
db = client[DB_NAME]
protocolos_coll: Collection = db["protocolos"]
usuarios_coll: Collection = db["usuarios"]
filtros_coll: Collection = db["filtros"]
notificacoes_coll: Collection = db["notificacoes"]
categorias_coll: Collection = db["categorias"]
protocolos_excluidos_coll: Collection = db["protocolos_excluidos"]

def create_indexes():"""
    
    new_db_init = """# ====================== [BLOCO 5: CONFIGURAÇÃO DO BANCO E ÍNDICES] ======================
# Initialize database collections using adapter
_db_collections = get_db_collections()
protocolos_coll = _db_collections['protocolos_coll']
usuarios_coll = _db_collections['usuarios_coll']
filtros_coll = _db_collections['filtros_coll']
notificacoes_coll = _db_collections['notificacoes_coll']
categorias_coll = _db_collections['categorias_coll']
protocolos_excluidos_coll = _db_collections['protocolos_excluidos_coll']

def create_indexes():
    # Use adapter's create_indexes function
    create_indexes_for_db(_db_collections)
    return

def create_indexes_old():"""
    
    content = content.replace(old_db_init, new_db_init)
    
    # Step 3: Close the old create_indexes function
    # Find the end of create_indexes function and add return
    pattern = r"(categorias_coll\.create_index\(\"nome\", unique=True\)\s+except Exception as e:\s+logger\.warning\(f\"\[MongoDB\] Aviso ao criar índice de categorias: \{e\}\"\))"
    replacement = r"\1\n    # Old MongoDB index creation - replaced by adapter"
    content = re.sub(pattern, replacement, content)
    
    # Write patched content
    with open('main.py', 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("✓ main.py patched successfully")
    print("✓ Database adapter integrated")
    print("✓ Now supports both MongoDB and SQLite via DB_TYPE environment variable")

if __name__ == "__main__":
    patch_main_py()
