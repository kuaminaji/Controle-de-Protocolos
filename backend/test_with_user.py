#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Test with actual user creation like the cria_admin.py script does
"""

import os
import sys

# Set environment to use SQLite
os.environ['DB_TYPE'] = 'sqlite'
os.environ['SQLITE_DB_PATH'] = 'test_with_user.db'

# Add backend to path
sys.path.insert(0, os.path.dirname(__file__))

print("=" * 60)
print("Testing User Creation and Listing")
print("=" * 60)

try:
    from db_sqlite import get_database
    import hashlib
    import base64
    import secrets
    
    def hash_password(password: str) -> str:
        """Hash password using PBKDF2-SHA256"""
        salt = secrets.token_bytes(16)
        iterations = 260000
        hash_bytes = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, iterations)
        salt_b64 = base64.b64encode(salt).decode('ascii')
        hash_b64 = base64.b64encode(hash_bytes).decode('ascii')
        return f"pbkdf2_sha256${iterations}${salt_b64}${hash_b64}"
    
    print("\n[1/6] Creating database...")
    db_path = os.environ['SQLITE_DB_PATH']
    collections = get_database(db_path)
    usuarios_coll = collections['usuarios']
    print("✅ Database created")
    
    print("\n[2/6] Creating admin user...")
    result = usuarios_coll.insert_one({
        "usuario": "admin",
        "senha": hash_password("admin123@"),
        "tipo": "admin"
    })
    print(f"✅ Admin user created with ID: {result.inserted_id}")
    
    print("\n[3/6] Creating escrevente user...")
    result2 = usuarios_coll.insert_one({
        "usuario": "joao",
        "senha": hash_password("senha123"),
        "tipo": "escrevente",
        "bloqueado": False
    })
    print(f"✅ Escrevente user created with ID: {result2.inserted_id}")
    
    print("\n[4/6] Creating blocked user...")
    result3 = usuarios_coll.insert_one({
        "usuario": "maria",
        "senha": hash_password("senha456"),
        "tipo": "escrevente",
        "bloqueado": True
    })
    print(f"✅ Blocked user created with ID: {result3.inserted_id}")
    
    print("\n[5/6] Testing count_documents()...")
    count = usuarios_coll.count_documents({})
    print(f"✅ Total users: {count}")
    
    print("\n[6/6] Testing /api/usuarios/nomes endpoint logic...")
    # Simulate the endpoint
    users = list(usuarios_coll.find(
        {"bloqueado": {"$ne": True}},
        {"usuario": 1, "_id": 0}
    ))
    print(f"✅ Found {len(users)} non-blocked users")
    for u in users:
        print(f"   - User data: {u}")
    
    nomes = [u.get("usuario") for u in users if u.get("usuario")]
    print(f"\n✅ Final usernames for dropdown: {nomes}")
    
    if len(nomes) >= 2:
        print("\n" + "=" * 60)
        print("✅ SUCCESS! Users would appear in login dropdown")
        print("=" * 60)
    else:
        print(f"\n❌ ERROR: Expected 2+ users, got {len(nomes)}")
        sys.exit(1)
    
except Exception as e:
    print(f"\n❌ ERROR: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
finally:
    # Cleanup test database
    if os.path.exists('test_with_user.db'):
        os.remove('test_with_user.db')
        print(f"\n🗑️  Cleaned up test database")
