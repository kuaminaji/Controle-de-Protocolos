# -*- coding: utf-8 -*-
"""
SQLite Database Layer using SQLAlchemy ORM
Provides equivalent functionality to MongoDB collections
"""

from sqlalchemy import create_engine, Column, Integer, String, Text, Boolean, DateTime, JSON, Index, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, scoped_session
from datetime import datetime
import json
import logging

logger = logging.getLogger(__name__)

Base = declarative_base()

# ====================== [TABLE DEFINITIONS] ======================

class Usuario(Base):
    """Users table - equivalent to usuarios collection"""
    __tablename__ = 'usuarios'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    usuario = Column(String(100), unique=True, nullable=False, index=True)
    senha = Column(String(500), nullable=False)
    tipo = Column(String(20), nullable=False)  # 'admin' or 'escrevente'
    bloqueado = Column(Boolean, default=False)
    
    __table_args__ = (
        Index('idx_usuario_unique', 'usuario', unique=True),
    )


class Protocolo(Base):
    """Protocols table - equivalent to protocolos collection"""
    __tablename__ = 'protocolos'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    numero = Column(String(10), unique=True, nullable=False, index=True)
    nome_requerente = Column(String(60), nullable=False)
    sem_cpf = Column(Boolean, default=False)
    cpf = Column(String(14), default="", index=True)
    whatsapp = Column(String(20), default="")
    titulo = Column(String(120), nullable=False)
    nome_parte_ato = Column(String(120), default="")
    outras_infos = Column(String(120), default="")
    data_criacao = Column(String(20), nullable=False)
    data_criacao_dt = Column(DateTime, nullable=False, index=True)
    status = Column(String(20), nullable=False, index=True)
    categoria = Column(String(60), nullable=False, index=True)
    responsavel = Column(String(60), nullable=False)
    observacoes = Column(Text, default="")
    editavel = Column(Boolean, default=True)
    ultima_alteracao_nome = Column(String(60), default="")
    ultima_alteracao_data = Column(String(30), default="")
    retirado_por = Column(String(60), default="")
    data_retirada = Column(String(10), default="")
    data_retirada_dt = Column(DateTime, nullable=True, index=True)
    whatsapp_enviado_em = Column(String(30), default="")
    whatsapp_enviado_por = Column(String(60), default="")
    data_concluido = Column(String(30), default="")
    data_concluido_dt = Column(DateTime, nullable=True, index=True)
    
    # Exigency fields (3 sets)
    exig1_retirada_por = Column(String(60), default="")
    exig1_data_retirada = Column(String(10), default="")
    exig1_data_retirada_dt = Column(DateTime, nullable=True, index=True)
    exig1_reapresentada_por = Column(String(60), default="")
    exig1_data_reapresentacao = Column(String(10), default="")
    exig1_data_reapresentacao_dt = Column(DateTime, nullable=True, index=True)
    
    exig2_retirada_por = Column(String(60), default="")
    exig2_data_retirada = Column(String(10), default="")
    exig2_data_retirada_dt = Column(DateTime, nullable=True, index=True)
    exig2_reapresentada_por = Column(String(60), default="")
    exig2_data_reapresentacao = Column(String(10), default="")
    exig2_data_reapresentacao_dt = Column(DateTime, nullable=True, index=True)
    
    exig3_retirada_por = Column(String(60), default="")
    exig3_data_retirada = Column(String(10), default="")
    exig3_data_retirada_dt = Column(DateTime, nullable=True, index=True)
    exig3_reapresentada_por = Column(String(60), default="")
    exig3_data_reapresentacao = Column(String(10), default="")
    exig3_data_reapresentacao_dt = Column(DateTime, nullable=True, index=True)
    
    # JSON fields for complex data
    historico_alteracoes = Column(JSON, default=list)
    historico = Column(JSON, default=list)
    
    __table_args__ = (
        Index('idx_numero_unique', 'numero', unique=True),
        Index('idx_categoria_status_data', 'categoria', 'status', 'data_criacao_dt'),
        Index('idx_status_data', 'status', 'data_criacao_dt'),
        Index('idx_categoria_data', 'categoria', 'data_criacao_dt'),
        Index('idx_nome_parte_ato', 'nome_parte_ato'),
    )


class Categoria(Base):
    """Categories table - equivalent to categorias collection"""
    __tablename__ = 'categorias'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    nome = Column(String(60), unique=True, nullable=False, index=True)
    descricao = Column(String(240), default="")
    
    __table_args__ = (
        Index('idx_categoria_nome_unique', 'nome', unique=True),
    )


class Notificacao(Base):
    """Notifications table - equivalent to notificacoes collection"""
    __tablename__ = 'notificacoes'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    usuario = Column(String(100), nullable=False, index=True)
    mensagem = Column(Text, nullable=False)
    tipo = Column(String(20), default="info")  # 'info', 'warning', 'error'
    lida = Column(Boolean, default=False)
    data_criacao = Column(String(30), nullable=False)
    data_criacao_dt = Column(DateTime, nullable=False, index=True)
    
    __table_args__ = (
        Index('idx_usuario_lida', 'usuario', 'lida'),
    )


class Filtro(Base):
    """Saved filters table - equivalent to filtros collection"""
    __tablename__ = 'filtros'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    usuario = Column(String(100), nullable=False, index=True)
    nome = Column(String(100), nullable=False)
    filtros = Column(JSON, nullable=False)  # Stores filter criteria as JSON
    data_atualizacao = Column(DateTime, nullable=False)
    
    __table_args__ = (
        Index('idx_usuario_filtros', 'usuario'),
    )


class ProtocoloExcluido(Base):
    """Deleted protocols audit table - equivalent to protocolos_excluidos collection"""
    __tablename__ = 'protocolos_excluidos'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    protocolo_id_original = Column(String(50), nullable=False)
    numero = Column(String(10), nullable=False, index=True)
    nome_requerente = Column(String(60), default="")
    cpf = Column(String(14), default="")
    exclusao_timestamp = Column(String(30), nullable=False)
    exclusao_timestamp_dt = Column(DateTime, nullable=False, index=True)
    admin_responsavel = Column(String(100), nullable=False, index=True)
    motivo = Column(Text, default="")
    protocolo_original = Column(JSON, nullable=False)  # Full protocol backup as JSON
    
    __table_args__ = (
        Index('idx_exclusao_timestamp', 'exclusao_timestamp_dt'),
        Index('idx_numero_excluido', 'numero'),
        Index('idx_admin_responsavel', 'admin_responsavel'),
    )


# ====================== [DATABASE CONNECTION] ======================

class SQLiteDB:
    """SQLite database connection and session manager"""
    
    def __init__(self, db_path="protocolos.db"):
        """
        Initialize SQLite database connection
        
        Args:
            db_path: Path to SQLite database file
        """
        self.db_path = db_path
        self.engine = create_engine(
            f'sqlite:///{db_path}',
            echo=False,
            connect_args={'check_same_thread': False}
        )
        
        # Enable foreign keys in SQLite
        @event.listens_for(self.engine, "connect")
        def set_sqlite_pragma(dbapi_conn, connection_record):
            cursor = dbapi_conn.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()
        
        # Create session factory
        session_factory = sessionmaker(bind=self.engine)
        self.Session = scoped_session(session_factory)
        
        # Create all tables
        Base.metadata.create_all(self.engine)
        logger.info(f"[SQLite] Database initialized at {db_path}")
    
    def get_session(self):
        """Get a new database session"""
        return self.Session()
    
    def close(self):
        """Close database connection"""
        self.Session.remove()
        self.engine.dispose()


# ====================== [COLLECTION-LIKE INTERFACE] ======================

class CollectionAdapter:
    """
    Adapter class to provide MongoDB-like collection interface for SQLAlchemy
    This allows minimal changes to existing code
    """
    
    def __init__(self, db_session, model_class):
        self.session = db_session
        self.model = model_class
    
    def insert_one(self, document):
        """Insert a single document"""
        # Convert dict to model instance
        obj = self.model(**document)
        self.session.add(obj)
        self.session.commit()
        self.session.refresh(obj)
        
        # Return MongoDB-like result
        class InsertResult:
            def __init__(self, inserted_id):
                self.inserted_id = inserted_id
        
        return InsertResult(obj.id)
    
    def find_one(self, filter_dict=None):
        """Find a single document"""
        query = self.session.query(self.model)
        
        if filter_dict:
            query = self._apply_filters(query, filter_dict)
        
        result = query.first()
        return self._to_dict(result) if result else None
    
    def find(self, filter_dict=None):
        """Find multiple documents - returns a cursor-like object"""
        query = self.session.query(self.model)
        
        if filter_dict:
            query = self._apply_filters(query, filter_dict)
        
        return QueryCursor(query, self._to_dict)
    
    def update_one(self, filter_dict, update_dict):
        """Update a single document"""
        query = self.session.query(self.model)
        query = self._apply_filters(query, filter_dict)
        
        obj = query.first()
        if obj:
            # Handle $set, $push, $unset operators
            if "$set" in update_dict:
                for key, value in update_dict["$set"].items():
                    setattr(obj, key, value)
            
            if "$push" in update_dict:
                for key, value in update_dict["$push"].items():
                    current = getattr(obj, key, [])
                    if not isinstance(current, list):
                        current = []
                    current.append(value)
                    setattr(obj, key, current)
            
            if "$unset" in update_dict:
                for key in update_dict["$unset"].keys():
                    setattr(obj, key, None)
            
            self.session.commit()
            
        class UpdateResult:
            def __init__(self, matched_count, modified_count=None):
                self.matched_count = matched_count
                self.modified_count = modified_count if modified_count is not None else matched_count
        
        return UpdateResult(1 if obj else 0)
    
    def update_many(self, filter_dict, update_dict):
        """Update multiple documents"""
        query = self.session.query(self.model)
        query = self._apply_filters(query, filter_dict)
        
        count = 0
        if "$set" in update_dict:
            count = query.update(update_dict["$set"])
            self.session.commit()
        
        class UpdateResult:
            def __init__(self, matched_count, modified_count=None):
                self.matched_count = matched_count
                self.modified_count = modified_count if modified_count is not None else matched_count
        
        return UpdateResult(count)
    
    def delete_one(self, filter_dict):
        """Delete a single document"""
        query = self.session.query(self.model)
        query = self._apply_filters(query, filter_dict)
        
        obj = query.first()
        if obj:
            self.session.delete(obj)
            self.session.commit()
        
        class DeleteResult:
            def __init__(self, deleted_count):
                self.deleted_count = deleted_count
        
        return DeleteResult(1 if obj else 0)
    
    def delete_many(self, filter_dict):
        """Delete multiple documents"""
        query = self.session.query(self.model)
        query = self._apply_filters(query, filter_dict)
        
        count = query.delete()
        self.session.commit()
        
        class DeleteResult:
            def __init__(self, deleted_count):
                self.deleted_count = deleted_count
        
        return DeleteResult(count)
    
    def count_documents(self, filter_dict=None):
        """Count documents matching filter"""
        query = self.session.query(self.model)
        
        if filter_dict:
            query = self._apply_filters(query, filter_dict)
        
        return query.count()
    
    def distinct(self, field):
        """Get distinct values for a field"""
        results = self.session.query(getattr(self.model, field)).distinct().all()
        return [r[0] for r in results if r[0] is not None]
    
    def create_index(self, keys, **kwargs):
        """Index creation (no-op as indexes are defined in model)"""
        pass
    
    def _apply_filters(self, query, filter_dict):
        """Apply filter dictionary to query"""
        for key, value in filter_dict.items():
            if key == "_id":
                # Convert _id to id
                query = query.filter(self.model.id == value)
            elif isinstance(value, dict):
                # Handle operators like $ne, $regex, $gte, $lte, etc.
                if "$ne" in value:
                    query = query.filter(getattr(self.model, key) != value["$ne"])
                if "$regex" in value:
                    pattern = value["$regex"]
                    options = value.get("$options", "")
                    if "i" in options:  # case insensitive
                        query = query.filter(getattr(self.model, key).ilike(f"%{pattern}%"))
                    else:
                        query = query.filter(getattr(self.model, key).like(f"%{pattern}%"))
                if "$gte" in value:
                    query = query.filter(getattr(self.model, key) >= value["$gte"])
                if "$lte" in value:
                    query = query.filter(getattr(self.model, key) <= value["$lte"])
                if "$gt" in value:
                    query = query.filter(getattr(self.model, key) > value["$gt"])
                if "$lt" in value:
                    query = query.filter(getattr(self.model, key) < value["$lt"])
                if "$in" in value:
                    query = query.filter(getattr(self.model, key).in_(value["$in"]))
            else:
                query = query.filter(getattr(self.model, key) == value)
        
        return query
    
    def _to_dict(self, obj):
        """Convert model instance to dictionary (MongoDB-like document)"""
        if obj is None:
            return None
        
        result = {}
        for column in obj.__table__.columns:
            value = getattr(obj, column.name)
            if column.name == 'id':
                result['_id'] = value  # Map id to _id for MongoDB compatibility
                result['id'] = str(value)  # Also include as string id
            else:
                result[column.name] = value
        
        return result


class QueryCursor:
    """Cursor-like object for query results"""
    
    def __init__(self, query, to_dict_func):
        self.query = query
        self.to_dict = to_dict_func
        self._results = None
    
    def sort(self, key, direction=1):
        """Sort results"""
        if isinstance(key, list):
            # Handle compound sort
            for k, d in key:
                if d == -1:  # DESCENDING
                    self.query = self.query.order_by(getattr(self.query.column_descriptions[0]['type'], k).desc())
                else:  # ASCENDING
                    self.query = self.query.order_by(getattr(self.query.column_descriptions[0]['type'], k))
        else:
            model = self.query.column_descriptions[0]['type']
            if direction == -1:  # DESCENDING
                self.query = self.query.order_by(getattr(model, key).desc())
            else:  # ASCENDING
                self.query = self.query.order_by(getattr(model, key))
        return self
    
    def skip(self, count):
        """Skip n results"""
        self.query = self.query.offset(count)
        return self
    
    def limit(self, count):
        """Limit results"""
        self.query = self.query.limit(count)
        return self
    
    def __iter__(self):
        """Iterate over results"""
        if self._results is None:
            self._results = [self.to_dict(obj) for obj in self.query.all()]
        return iter(self._results)
    
    def __list__(self):
        """Convert to list"""
        if self._results is None:
            self._results = [self.to_dict(obj) for obj in self.query.all()]
        return self._results


def get_database(db_path="protocolos.db"):
    """
    Get database instance with collection-like adapters
    
    Returns dict with collection adapters that mimic MongoDB interface
    """
    db = SQLiteDB(db_path)
    session = db.get_session()
    
    return {
        'protocolos': CollectionAdapter(session, Protocolo),
        'usuarios': CollectionAdapter(session, Usuario),
        'categorias': CollectionAdapter(session, Categoria),
        'notificacoes': CollectionAdapter(session, Notificacao),
        'filtros': CollectionAdapter(session, Filtro),
        'protocolos_excluidos': CollectionAdapter(session, ProtocoloExcluido),
        '_db': db,
        '_session': session
    }
