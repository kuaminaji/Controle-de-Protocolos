#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script to test SQLite database initialization and user listing
"""

import os
import sys

# Set environment to use SQLite
os.environ['DB_TYPE'] = 'sqlite'
os.environ['SQLITE_DB_PATH'] = 'test_protocolos.db'

# Add backend to path
sys.path.insert(0, os.path.dirname(__file__))

print("=" * 60)
print("Testing SQLite Database Initialization")
print("=" * 60)

try:
    from db_sqlite import get_database
    print("\n[1/5] ✅ Imported db_sqlite successfully")
    
    # Create database
    db_path = os.environ['SQLITE_DB_PATH']
    print(f"\n[2/5] Creating database at: {db_path}")
    collections = get_database(db_path)
    print("✅ Database created successfully")
    
    # Check collections
    usuarios_coll = collections['usuarios']
    print("\n[3/5] Testing count_documents()...")
    count = usuarios_coll.count_documents({})
    print(f"✅ User count: {count}")
    
    # Test find with filter (like the endpoint does)
    print("\n[4/5] Testing find() with bloqueado filter...")
    users = list(usuarios_coll.find(
        {"bloqueado": {"$ne": True}},
        {"usuario": 1, "_id": 0}
    ))
    print(f"✅ Found {len(users)} non-blocked users")
    for u in users:
        print(f"   - {u}")
    
    # Extract names (like the endpoint does)
    print("\n[5/5] Extracting usernames...")
    nomes = [u.get("usuario") for u in users if u.get("usuario")]
    print(f"✅ Usernames: {nomes}")
    
    print("\n" + "=" * 60)
    print("✅ ALL TESTS PASSED!")
    print("=" * 60)
    
except Exception as e:
    print(f"\n❌ ERROR: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
finally:
    # Cleanup test database
    if os.path.exists('test_protocolos.db'):
        os.remove('test_protocolos.db')
        print(f"\n🗑️  Cleaned up test database")
