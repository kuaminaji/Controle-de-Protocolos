# -*- coding: utf-8 -*-
"""
Database Adapter - Provides unified interface for MongoDB and SQLite
"""

import os
from typing import Dict, Any
import logging

logger = logging.getLogger(__name__)

# Determine which database to use
DB_TYPE = os.getenv("DB_TYPE", "sqlite").lower()  # 'mongodb' or 'sqlite'

def get_db_collections():
    """
    Get database collections/tables with unified interface
    Returns dict with collection objects that work with both MongoDB and SQLite
    """
    if DB_TYPE == "sqlite":
        logger.info("[Database] Using SQLite")
        from db_sqlite import get_database
        
        db_path = os.getenv("SQLITE_DB_PATH", "protocolos.db")
        collections = get_database(db_path)
        
        return {
            'protocolos_coll': collections['protocolos'],
            'usuarios_coll': collections['usuarios'],
            'categorias_coll': collections['categorias'],
            'notificacoes_coll': collections['notificacoes'],
            'filtros_coll': collections['filtros'],
            'protocolos_excluidos_coll': collections['protocolos_excluidos'],
            '_db_instance': collections.get('_db'),
            '_session': collections.get('_session'),
            'db_type': 'sqlite'
        }
    else:
        logger.info("[Database] Using MongoDB")
        from pymongo import MongoClient
        from pymongo.collection import Collection
        
        MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017/")
        DB_NAME = os.getenv("DB_NAME", "protocolos_db")
        
        # Import MongoDB client creation function
        from main_mongodb import criar_cliente_mongodb
        
        client = criar_cliente_mongodb(MONGO_URL)
        db = client[DB_NAME]
        
        return {
            'protocolos_coll': db["protocolos"],
            'usuarios_coll': db["usuarios"],
            'categorias_coll': db["categorias"],
            'notificacoes_coll': db["notificacoes"],
            'filtros_coll': db["filtros"],
            'protocolos_excluidos_coll': db["protocolos_excluidos"],
            '_db_instance': client,
            'db_type': 'mongodb'
        }


def convert_id_for_response(doc: Dict[str, Any], db_type: str = None) -> Dict[str, Any]:
    """
    Convert document ID for API responses
    MongoDB uses ObjectId, SQLite uses integer
    """
    if doc is None:
        return None
    
    if db_type == 'sqlite' or DB_TYPE == 'sqlite':
        # SQLite already has both _id and id fields from adapter
        return doc
    else:
        # MongoDB needs _id converted to string
        if '_id' in doc:
            doc['id'] = str(doc['_id'])
        return doc


def create_indexes_for_db(collections: Dict[str, Any]):
    """
    Create necessary indexes based on database type
    """
    db_type = collections.get('db_type', DB_TYPE)
    
    if db_type == 'mongodb':
        # MongoDB index creation
        try:
            collections['usuarios_coll'].create_index("usuario", unique=True)
        except Exception as e:
            logger.warning(f"[Database] Warning creating usuario index: {e}")
        
        try:
            collections['protocolos_coll'].create_index("numero", unique=True)
        except Exception as e:
            logger.warning(f"[Database] Warning creating protocolo.numero index: {e}")
        
        try:
            from pymongo import ASCENDING, DESCENDING
            protocolos_coll = collections['protocolos_coll']
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
            protocolos_coll.create_index([("data_concluido_dt", 1)])
            protocolos_coll.create_index([("categoria", 1), ("status", 1), ("data_criacao_dt", -1)])
            protocolos_coll.create_index([("status", 1), ("data_criacao_dt", -1)])
            protocolos_coll.create_index([("categoria", 1), ("data_criacao_dt", -1)])
        except Exception as e:
            logger.warning(f"[Database] Warning creating auxiliary indexes: {e}")
        
        try:
            collections['categorias_coll'].create_index("nome", unique=True)
        except Exception as e:
            logger.warning(f"[Database] Warning creating categorias index: {e}")
    
    # SQLite indexes are created automatically in the model definitions
    logger.info(f"[Database] Indexes initialized for {db_type}")


def get_object_id_class():
    """
    Get ObjectId class based on database type
    For SQLite, returns a simple class that converts to int
    """
    if DB_TYPE == 'sqlite':
        class SQLiteId:
            def __init__(self, id_val):
                if isinstance(id_val, str):
                    self.id = int(id_val) if id_val.isdigit() else id_val
                else:
                    self.id = int(id_val)
            
            def __str__(self):
                return str(self.id)
            
            def __int__(self):
                return self.id
            
            def __eq__(self, other):
                if isinstance(other, SQLiteId):
                    return self.id == other.id
                return self.id == other
        
        return SQLiteId
    else:
        from bson import ObjectId
        return ObjectId
