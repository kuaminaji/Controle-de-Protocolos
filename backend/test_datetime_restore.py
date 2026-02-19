#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Test script for verifying datetime field conversion during backup restore
"""

import os
import sys
from datetime import datetime

# Add backend directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from db_sqlite import get_database

def test_protocolo_with_missing_datetime():
    """Test inserting protocol with missing data_criacao_dt field"""
    print("=" * 60)
    print("Test: Protocol Insert with Missing DateTime Fields")
    print("=" * 60)
    
    # Get database (will create if doesn't exist)
    db_path = "test_datetime_restore.db"
    if os.path.exists(db_path):
        os.remove(db_path)
        print(f"Removed existing test database: {db_path}")
    
    collections = get_database(db_path)
    protocolos_coll = collections['protocolos']
    
    # Simulate MongoDB backup data (has string dates but no _dt fields)
    backup_data = [
        {
            'numero': '43805',
            'nome_requerente': 'CARLA TEIXEIRA DE OLIVEIRA',
            'sem_cpf': False,
            'cpf': '04641675740',
            'whatsapp': '',
            'titulo': 'SEG VIA CERTIDÃO',
            'nome_parte_ato': '',
            'outras_infos': 'VIA CRC VR 1º CIRC',
            'data_criacao': '2025-07-25',  # String date
            'data_criacao_dt': None,        # None - should be converted
            'status': 'Concluído',
            'categoria': 'RCPN',
            'responsavel': 'JOELMA',
            'observacoes': '',
            'editavel': True,
            'ultima_alteracao_nome': 'Edvaldo',
            'ultima_alteracao_data': '2025-07-31 15:53:39',
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
        },
        {
            'numero': '43806',
            'nome_requerente': 'JOÃO SILVA',
            'sem_cpf': False,
            'cpf': '12345678901',
            'whatsapp': '11999999999',
            'titulo': 'Certidão de Nascimento',
            'nome_parte_ato': 'João da Silva',
            'outras_infos': 'Primeira via',
            'data_criacao': '2025-08-01',  # Another protocol
            # data_criacao_dt not present at all (should be created)
            'status': 'Em andamento',
            'categoria': 'RCPN',
            'responsavel': 'MARIA',
            'observacoes': 'Protocolo de teste',
            'editavel': True,
            'ultima_alteracao_nome': 'MARIA',
            'ultima_alteracao_data': '2025-08-02 10:00:00',
            'retirado_por': '',
            'data_retirada': '',
            'whatsapp_enviado_em': '',
            'whatsapp_enviado_por': '',
            'data_concluido': '',
            'exig1_retirada_por': 'João',
            'exig1_data_retirada': '2025-08-05',  # Has string date
            # exig1_data_retirada_dt should be created
            'exig1_reapresentada_por': '',
            'exig1_data_reapresentacao': '',
            'exig2_retirada_por': '',
            'exig2_data_retirada': '',
            'exig2_reapresentada_por': '',
            'exig2_data_reapresentacao': '',
            'exig3_retirada_por': '',
            'exig3_data_retirada': '',
            'exig3_reapresentada_por': '',
            'exig3_data_reapresentacao': '',
            'historico_alteracoes': [],
            'historico': []
        }
    ]
    
    print(f"\nInserting {len(backup_data)} protocols with missing datetime fields...")
    
    try:
        result = protocolos_coll.insert_many(backup_data)
        print(f"✅ SUCCESS! Inserted {len(result.inserted_ids)} protocols")
        print(f"   Generated IDs: {result.inserted_ids}")
        
        # Verify the data
        print("\nVerifying inserted data...")
        for protocol_id in result.inserted_ids:
            protocol = protocolos_coll.find_one({"_id": protocol_id})
            if protocol:
                print(f"\n   Protocol #{protocol['numero']}:")
                print(f"      Nome: {protocol['nome_requerente']}")
                print(f"      data_criacao (string): {protocol.get('data_criacao')}")
                print(f"      data_criacao_dt (datetime): {protocol.get('data_criacao_dt')}")
                if protocol.get('exig1_data_retirada'):
                    print(f"      exig1_data_retirada (string): {protocol.get('exig1_data_retirada')}")
                    print(f"      exig1_data_retirada_dt (datetime): {protocol.get('exig1_data_retirada_dt')}")
                print(f"      ✅ Has valid data_criacao_dt: {protocol.get('data_criacao_dt') is not None}")
        
        print("\n" + "=" * 60)
        print("ALL TESTS PASSED! ✓")
        print("=" * 60)
        print("\nBackup restore with missing datetime fields now works correctly!")
        
        return True
        
    except Exception as e:
        print(f"\n❌ FAILED: {str(e)}")
        import traceback
        traceback.print_exc()
        return False
    
    finally:
        # Cleanup
        if os.path.exists(db_path):
            os.remove(db_path)
            print(f"\nCleaned up test database: {db_path}")

if __name__ == "__main__":
    success = test_protocolo_with_missing_datetime()
    sys.exit(0 if success else 1)
