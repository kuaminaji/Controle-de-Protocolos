#!/usr/bin/env python3
"""
Test for backup restore with string datetime values in _dt fields
This simulates the actual error from the user's backup
"""

import os
import sys
from datetime import datetime

# Add backend to path
sys.path.insert(0, os.path.dirname(__file__))

from db_sqlite import get_database

# Test with problematic data from user's error
def test_string_datetime_in_dt_fields():
    """Test inserting protocol with string values in datetime fields"""
    
    print("="*60)
    print("Test: Protocol Insert with String DateTime in _dt Fields")
    print("="*60)
    
    # Get database collections
    collections = get_database("test_string_datetime.db")
    protocolos_coll = collections['protocolos']
    
    # This simulates the actual backup data that's causing the error
    # The key issue: some _dt fields might have string values instead of None
    test_protocol = {
        'numero': '43805',
        'nome_requerente': 'CARLA TEIXEIRA DE OLIVEIRA',
        'sem_cpf': 0,
        'cpf': '04641675740',
        'whatsapp': '',
        'titulo': 'SEG VIA CERTIDÃO',
        'nome_parte_ato': '',
        'outras_infos': 'VIA CRC VR 1º CIRC',
        'data_criacao': '2025-07-25',
        'data_criacao_dt': None,  # Will be converted by _prepare_protocolo_dates
        'status': 'Concluído',
        'categoria': 'RCPN',
        'responsavel': 'JOELMA',
        'observacoes': '',
        'editavel': 1,
        'ultima_alteracao_nome': 'Edvaldo',
        'ultima_alteracao_data': '2025-08-27 15:37:14',  # String, OK (String column)
        'retirado_por': '',
        'data_retirada': '',
        'data_retirada_dt': None,
        'whatsapp_enviado_em': '',
        'whatsapp_enviado_por': '',
        'data_concluido': '',
        'data_concluido_dt': None,
        'exig1_retirada_por': '',
        'exig1_data_retirada': '',
        'exig1_data_retirada_dt': None,
        'exig1_reapresentada_por': '',
        'exig1_data_reapresentacao': '',
        'exig1_data_reapresentacao_dt': None,
        'exig2_retirada_por': '',
        'exig2_data_retirada': '',
        'exig2_data_retirada_dt': None,
        'exig2_reapresentada_por': '',
        'exig2_data_reapresentacao': '',
        'exig2_data_reapresentacao_dt': None,
        'exig3_retirada_por': '',
        'exig3_data_retirada': '',
        'exig3_data_retirada_dt': None,
        'exig3_reapresentada_por': '',
        'exig3_data_reapresentacao': '',
        'exig3_data_reapresentacao_dt': None,
        'historico_alteracoes': [],
        'historico': []
    }
    
    # Test case 2: _dt field with string value (this is the problem!)
    test_protocol_with_string_dt = {
        'numero': '43806',
        'nome_requerente': 'JOÃO SILVA',
        'sem_cpf': 0,
        'cpf': '12345678901',
        'whatsapp': '',
        'titulo': 'TESTE',
        'nome_parte_ato': '',
        'outras_infos': '',
        'data_criacao': '2025-08-01',
        'data_criacao_dt': '2025-08-01 10:00:00',  # STRING! Should be datetime object
        'status': 'Pendente',
        'categoria': 'RCPN',
        'responsavel': 'JOAO',
        'observacoes': '',
        'editavel': 1,
        'ultima_alteracao_nome': 'Admin',
        'ultima_alteracao_data': '2025-08-01 10:00:00',
        'retirado_por': '',
        'data_retirada': '',
        'data_retirada_dt': '2025-08-05 14:30:00',  # STRING! Should be datetime or None
        'whatsapp_enviado_em': '',
        'whatsapp_enviado_por': '',
        'data_concluido': '',
        'data_concluido_dt': None,
        'exig1_retirada_por': '',
        'exig1_data_retirada': '',
        'exig1_data_retirada_dt': None,
        'exig1_reapresentada_por': '',
        'exig1_data_reapresentacao': '',
        'exig1_data_reapresentacao_dt': None,
        'exig2_retirada_por': '',
        'exig2_data_retirada': '',
        'exig2_data_retirada_dt': None,
        'exig2_reapresentada_por': '',
        'exig2_data_reapresentacao': '',
        'exig2_data_reapresentacao_dt': None,
        'exig3_retirada_por': '',
        'exig3_data_retirada': '',
        'exig3_data_retirada_dt': None,
        'exig3_reapresentada_por': '',
        'exig3_data_reapresentacao': '',
        'exig3_data_reapresentacao_dt': None,
        'historico_alteracoes': [],
        'historico': []
    }
    
    print("\nTest 1: Inserting protocol with None in _dt fields...")
    try:
        result1 = protocolos_coll.insert_many([test_protocol])
        print(f"✅ SUCCESS! Inserted protocol #{test_protocol['numero']}")
        print(f"   Generated ID: {result1.inserted_ids}")
    except Exception as e:
        print(f"❌ FAILED with error: {e}")
        return False
    
    print("\nTest 2: Inserting protocol with STRING in _dt fields...")
    try:
        result2 = protocolos_coll.insert_many([test_protocol_with_string_dt])
        print(f"✅ SUCCESS! Inserted protocol #{test_protocol_with_string_dt['numero']}")
        print(f"   Generated ID: {result2.inserted_ids}")
    except Exception as e:
        print(f"❌ FAILED with error: {type(e).__name__}: {e}")
        print("\nThis is the expected error - string values in _dt fields are not allowed!")
        print("The fix should convert these strings to datetime objects.")
        return False
    
    # Verify data
    print("\nVerifying inserted data...")
    protocols = list(protocolos_coll.find({}))
    print(f"Total protocols in database: {len(protocols)}")
    
    for p in protocols:
        print(f"\n   Protocol #{p.get('numero')}:")
        print(f"      data_criacao: {p.get('data_criacao')}")
        print(f"      data_criacao_dt: {p.get('data_criacao_dt')} (type: {type(p.get('data_criacao_dt')).__name__})")
        if p.get('data_retirada_dt'):
            print(f"      data_retirada_dt: {p.get('data_retirada_dt')} (type: {type(p.get('data_retirada_dt')).__name__})")
    
    print("\n" + "="*60)
    print("ALL TESTS PASSED! ✓")
    print("="*60)
    return True


if __name__ == "__main__":
    try:
        success = test_string_datetime_in_dt_fields()
        if not success:
            sys.exit(1)
    except Exception as e:
        print(f"\n❌ Test failed with exception: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        # Clean up test database
        test_db = "test_string_datetime.db"
        if os.path.exists(test_db):
            os.remove(test_db)
            print(f"\nCleaned up test database: {test_db}")
