#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Test: Empty string and invalid values in DateTime fields
Simulates MongoDB backup with empty strings in _dt fields
"""

import os
import sys
from datetime import datetime

# Add backend to path
sys.path.insert(0, os.path.dirname(__file__))

from db_sqlite import get_database

def test_empty_string_datetime():
    """
    Test inserting protocols with empty strings in _dt fields.
    This simulates the exact error scenario from the bug report.
    """
    print("="*60)
    print("Test: Protocol Insert with Empty Strings in _dt Fields")
    print("="*60)
    print()
    
    # Get database connection
    db_path = "test_empty_datetime.db"
    if os.path.exists(db_path):
        os.remove(db_path)
    
    collections = get_database(db_path)
    protocolos_coll = collections['protocolos']
    
    # Test 1: Protocol with empty strings in all _dt fields (worst case)
    print("Test 1: Inserting protocol with EMPTY STRINGS in all _dt fields...")
    protocol1 = {
        'numero': '43810',
        'nome_requerente': 'JOÃO SILVA',
        'sem_cpf': False,
        'cpf': '56838212749',
        'whatsapp': '',
        'titulo': 'SEG VIA CERTIDÃO',
        'nome_parte_ato': '',
        'outras_infos': 'VIA CRC TIJUCA',
        'data_criacao': '2025-07-25',
        'data_criacao_dt': '',  # EMPTY STRING!
        'status': 'Concluído',
        'categoria': 'RCPN',
        'responsavel': 'JOELMA',
        'observacoes': '',
        'editavel': True,
        'ultima_alteracao_nome': 'Edvaldo Araujo',
        'ultima_alteracao_data': '2025-08-27 15:37:14',
        'retirado_por': '',
        'data_retirada': '',
        'data_retirada_dt': '',  # EMPTY STRING!
        'whatsapp_enviado_em': '',
        'whatsapp_enviado_por': '',
        'data_concluido': '2025-08-01',
        'data_concluido_dt': '',  # EMPTY STRING!
        'exig1_retirada_por': '',
        'exig1_data_retirada': '',
        'exig1_data_retirada_dt': '',  # EMPTY STRING!
        'exig1_reapresentada_por': '',
        'exig1_data_reapresentacao': '',
        'exig1_data_reapresentacao_dt': '',  # EMPTY STRING!
        'exig2_retirada_por': '',
        'exig2_data_retirada': '',
        'exig2_data_retirada_dt': '',  # EMPTY STRING!
        'exig2_reapresentada_por': '',
        'exig2_data_reapresentacao': '',
        'exig2_data_reapresentacao_dt': '',  # EMPTY STRING!
        'exig3_retirada_por': '',
        'exig3_data_retirada': '',
        'exig3_data_retirada_dt': '',  # EMPTY STRING!
        'exig3_reapresentada_por': '',
        'exig3_data_reapresentacao': '',
        'exig3_data_reapresentacao_dt': '',  # EMPTY STRING!
        'historico_alteracoes': [],
        'historico': []
    }
    
    try:
        result1 = protocolos_coll.insert_one(protocol1)
        print(f"✅ SUCCESS! Inserted protocol #43810")
        print(f"   Generated ID: {result1.inserted_id}")
    except Exception as e:
        print(f"❌ FAILED! Error: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    print()
    
    # Test 2: Protocol with mix of empty strings and valid strings in _dt fields
    print("Test 2: Inserting protocol with MIX of empty and valid strings in _dt fields...")
    protocol2 = {
        'numero': '43811',
        'nome_requerente': 'MARIA SANTOS',
        'sem_cpf': False,
        'cpf': '12345678901',
        'whatsapp': '',
        'titulo': 'CERTIDÃO',
        'nome_parte_ato': '',
        'outras_infos': '',
        'data_criacao': '2025-08-01',
        'data_criacao_dt': '2025-08-01 10:00:00',  # Valid string
        'status': 'Em andamento',
        'categoria': 'RCPN',
        'responsavel': 'JOAO',
        'observacoes': '',
        'editavel': True,
        'ultima_alteracao_nome': 'Admin',
        'ultima_alteracao_data': '2025-08-01 10:05:00',
        'retirado_por': '',
        'data_retirada': '',
        'data_retirada_dt': '',  # Empty string
        'whatsapp_enviado_em': '',
        'whatsapp_enviado_por': '',
        'data_concluido': '',
        'data_concluido_dt': '',  # Empty string
        'exig1_retirada_por': 'MARIA',
        'exig1_data_retirada': '2025-08-05',
        'exig1_data_retirada_dt': '2025-08-05 14:30:00',  # Valid string
        'exig1_reapresentada_por': '',
        'exig1_data_reapresentacao': '',
        'exig1_data_reapresentacao_dt': '',  # Empty string
        'exig2_retirada_por': '',
        'exig2_data_retirada': '',
        'exig2_data_retirada_dt': '',  # Empty string
        'exig2_reapresentada_por': '',
        'exig2_data_reapresentacao': '',
        'exig2_data_reapresentacao_dt': '',  # Empty string
        'exig3_retirada_por': '',
        'exig3_data_retirada': '',
        'exig3_data_retirada_dt': '',  # Empty string
        'exig3_reapresentada_por': '',
        'exig3_data_reapresentacao': '',
        'exig3_data_reapresentacao_dt': '',  # Empty string
        'historico_alteracoes': [],
        'historico': []
    }
    
    try:
        result2 = protocolos_coll.insert_one(protocol2)
        print(f"✅ SUCCESS! Inserted protocol #43811")
        print(f"   Generated ID: {result2.inserted_id}")
    except Exception as e:
        print(f"❌ FAILED! Error: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    print()
    
    # Verify inserted data
    print("Verifying inserted data...")
    count = protocolos_coll.count_documents({})
    print(f"Total protocols in database: {count}")
    print()
    
    # Retrieve and check data types
    all_protocols = list(protocolos_coll.find({}))
    for proto in all_protocols:
        print(f"   Protocol #{proto.get('numero')}:")
        print(f"      Nome: {proto.get('nome_requerente')}")
        
        # Check datetime fields
        dt_fields = [
            'data_criacao_dt', 'data_retirada_dt', 'data_concluido_dt',
            'exig1_data_retirada_dt', 'exig1_data_reapresentacao_dt',
            'exig2_data_retirada_dt', 'exig2_data_reapresentacao_dt',
            'exig3_data_retirada_dt', 'exig3_data_reapresentacao_dt'
        ]
        
        for dt_field in dt_fields:
            value = proto.get(dt_field)
            if value is not None:
                print(f"      {dt_field}: {value} (type: {type(value).__name__})")
                # Verify it's actually a datetime object
                if not isinstance(value, datetime):
                    print(f"         ❌ ERROR: Expected datetime, got {type(value).__name__}")
                    return False
        print()
    
    print("="*60)
    print("ALL TESTS PASSED! ✓")
    print("="*60)
    print()
    print("Empty strings in _dt fields are now properly converted to None!")
    print("Valid datetime strings are converted to datetime objects!")
    print()
    
    # Cleanup
    if os.path.exists(db_path):
        os.remove(db_path)
    
    return True

if __name__ == "__main__":
    success = test_empty_string_datetime()
    sys.exit(0 if success else 1)
