#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Test script for insert_many functionality in SQLite CollectionAdapter
"""

import os
import sys
from datetime import datetime

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from db_sqlite import get_database

def test_insert_many():
    """Test the insert_many method"""
    print("=" * 60)
    print("Testing insert_many functionality")
    print("=" * 60)
    
    # Use a test database
    test_db = "test_insert_many.db"
    
    # Remove test database if it exists
    if os.path.exists(test_db):
        os.remove(test_db)
        print(f"✓ Removed existing test database: {test_db}")
    
    # Get collections
    collections = get_database(test_db)
    usuarios_coll = collections['usuarios']
    protocolos_coll = collections['protocolos']
    
    print(f"✓ Created test database: {test_db}")
    print()
    
    # Test 1: Insert empty list
    print("Test 1: Insert empty list")
    result = usuarios_coll.insert_many([])
    print(f"  Result: {len(result.inserted_ids)} documents inserted")
    assert len(result.inserted_ids) == 0, "Empty list should insert 0 documents"
    print("  ✓ PASSED")
    print()
    
    # Test 2: Insert single document via insert_many
    print("Test 2: Insert single document via insert_many")
    docs = [
        {
            "usuario": "test_user_1",
            "senha": "hashed_password_1",
            "tipo": "admin",
            "bloqueado": False
        }
    ]
    result = usuarios_coll.insert_many(docs)
    print(f"  Result: {len(result.inserted_ids)} document(s) inserted")
    print(f"  IDs: {result.inserted_ids}")
    assert len(result.inserted_ids) == 1, "Should insert 1 document"
    print("  ✓ PASSED")
    print()
    
    # Test 3: Insert multiple documents
    print("Test 3: Insert multiple documents (batch insert)")
    docs = [
        {
            "usuario": f"test_user_{i}",
            "senha": f"hashed_password_{i}",
            "tipo": "escrevente" if i % 2 == 0 else "admin",
            "bloqueado": False
        }
        for i in range(2, 12)  # 10 users
    ]
    result = usuarios_coll.insert_many(docs)
    print(f"  Result: {len(result.inserted_ids)} document(s) inserted")
    print(f"  First 3 IDs: {result.inserted_ids[:3]}")
    assert len(result.inserted_ids) == 10, "Should insert 10 documents"
    print("  ✓ PASSED")
    print()
    
    # Test 4: Verify all users were inserted
    print("Test 4: Verify all users were inserted")
    count = usuarios_coll.count_documents({})
    print(f"  Total users in database: {count}")
    assert count == 11, f"Expected 11 users (1 + 10), got {count}"
    print("  ✓ PASSED")
    print()
    
    # Test 5: Insert protocols
    print("Test 5: Insert multiple protocols")
    now = datetime.now()
    protocols = [
        {
            "numero": f"0000{i}",
            "nome_requerente": f"Requerente {i}",
            "sem_cpf": False,
            "cpf": f"000.000.000-{i:02d}",
            "whatsapp": "",
            "titulo": f"Protocolo de teste {i}",
            "nome_parte_ato": "",
            "outras_infos": "",
            "data_criacao": now.strftime("%d/%m/%Y"),
            "data_criacao_dt": now,
            "status": "Pendente",
            "categoria": "Teste",
            "responsavel": "test_user_1",
            "observacoes": "",
            "editavel": True,
            "ultima_alteracao_nome": "",
            "ultima_alteracao_data": "",
            "retirado_por": "",
            "data_retirada": "",
            "data_retirada_dt": None,
            "whatsapp_enviado_em": "",
            "whatsapp_enviado_por": "",
            "data_concluido": "",
            "data_concluido_dt": None,
            "historico_alteracoes": [],
            "historico": []
        }
        for i in range(1, 6)  # 5 protocols
    ]
    result = protocolos_coll.insert_many(protocols)
    print(f"  Result: {len(result.inserted_ids)} protocol(s) inserted")
    print(f"  IDs: {result.inserted_ids}")
    assert len(result.inserted_ids) == 5, "Should insert 5 protocols"
    print("  ✓ PASSED")
    print()
    
    # Test 6: Verify protocols were inserted
    print("Test 6: Verify protocols were inserted")
    count = protocolos_coll.count_documents({})
    print(f"  Total protocols in database: {count}")
    assert count == 5, f"Expected 5 protocols, got {count}"
    print("  ✓ PASSED")
    print()
    
    # Test 7: Test backup restore simulation
    print("Test 7: Simulate backup restore (delete_many + insert_many)")
    
    # Delete all users
    delete_result = usuarios_coll.delete_many({})
    print(f"  Deleted {delete_result.deleted_count} users")
    
    # Insert backup data
    backup_users = [
        {
            "usuario": "admin",
            "senha": "pbkdf2_sha256$260000$...",
            "tipo": "admin",
            "bloqueado": False
        },
        {
            "usuario": "joao",
            "senha": "pbkdf2_sha256$260000$...",
            "tipo": "escrevente",
            "bloqueado": False
        }
    ]
    result = usuarios_coll.insert_many(backup_users)
    print(f"  Restored {len(result.inserted_ids)} users from backup")
    
    # Verify
    count = usuarios_coll.count_documents({})
    print(f"  Total users after restore: {count}")
    assert count == 2, f"Expected 2 users after restore, got {count}"
    print("  ✓ PASSED")
    print()
    
    # Clean up
    print("Cleaning up...")
    if os.path.exists(test_db):
        os.remove(test_db)
        print(f"✓ Removed test database: {test_db}")
    
    print()
    print("=" * 60)
    print("ALL TESTS PASSED! ✓")
    print("=" * 60)
    print()
    print("The insert_many method is working correctly!")
    print("Backup restore functionality should now work.")

if __name__ == "__main__":
    try:
        test_insert_many()
    except Exception as e:
        print(f"\n❌ TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
