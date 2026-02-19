#!/usr/bin/env python3
"""
Test script to verify protocol status normalization during backup restore.

This test simulates the backup restore process and ensures that status fields
are properly normalized to match the expected format used by the statistics queries.
"""

import os
import sys
sys.path.insert(0, os.path.dirname(__file__))

from datetime import datetime
from db_sqlite import get_database

def test_status_normalization():
    """
    Test that protocol status values are normalized during restore.
    
    The system expects "Concluído" (with accent, capital C) for finalized protocols.
    MongoDB backups might have variations like:
    - "concluído" (lowercase)
    - "Concluido" (no accent)
    - "concluido" (lowercase, no accent)
    - "Concluído" (correct format)
    
    All variations should be normalized to "Concluído" during restore.
    """
    print("=" * 60)
    print("Test: Protocol Status Normalization During Backup Restore")
    print("=" * 60)
    
    # Get database collections
    collections = get_database("test_status_backup.db")
    protocolos_coll = collections['protocolos']
    
    # Clean database
    protocolos_coll.delete_many({})
    
    # Test data with different status variations
    test_protocols = [
        {
            'numero': '10001',
            'nome_requerente': 'João Silva',
            'sem_cpf': False,
            'cpf': '12345678901',
            'whatsapp': '',
            'titulo': 'Teste 1',
            'nome_parte_ato': '',
            'outras_infos': '',
            'data_criacao': '2025-01-15',
            'status': 'Concluído',  # Correct format
            'categoria': 'RCPN',
            'responsavel': 'Admin',
            'observacoes': '',
            'editavel': True,
            'ultima_alteracao_nome': 'Admin',
            'ultima_alteracao_data': '2025-01-15 10:00:00',
            'retirado_por': '',
            'data_retirada': '',
            'whatsapp_enviado_em': '',
            'whatsapp_enviado_por': '',
            'data_concluido': '2025-01-15',
            'historico_alteracoes': [],
            'historico': []
        },
        {
            'numero': '10002',
            'nome_requerente': 'Maria Santos',
            'sem_cpf': False,
            'cpf': '98765432109',
            'whatsapp': '',
            'titulo': 'Teste 2',
            'nome_parte_ato': '',
            'outras_infos': '',
            'data_criacao': '2025-01-16',
            'status': 'concluído',  # Lowercase - needs normalization
            'categoria': 'RCPN',
            'responsavel': 'Admin',
            'observacoes': '',
            'editavel': True,
            'ultima_alteracao_nome': 'Admin',
            'ultima_alteracao_data': '2025-01-16 10:00:00',
            'retirado_por': '',
            'data_retirada': '',
            'whatsapp_enviado_em': '',
            'whatsapp_enviado_por': '',
            'data_concluido': '2025-01-16',
            'historico_alteracoes': [],
            'historico': []
        },
        {
            'numero': '10003',
            'nome_requerente': 'Pedro Oliveira',
            'sem_cpf': False,
            'cpf': '11122233344',
            'whatsapp': '',
            'titulo': 'Teste 3',
            'nome_parte_ato': '',
            'outras_infos': '',
            'data_criacao': '2025-01-17',
            'status': 'Concluido',  # No accent - needs normalization
            'categoria': 'RCPN',
            'responsavel': 'Admin',
            'observacoes': '',
            'editavel': True,
            'ultima_alteracao_nome': 'Admin',
            'ultima_alteracao_data': '2025-01-17 10:00:00',
            'retirado_por': '',
            'data_retirada': '',
            'whatsapp_enviado_em': '',
            'whatsapp_enviado_por': '',
            'data_concluido': '2025-01-17',
            'historico_alteracoes': [],
            'historico': []
        },
        {
            'numero': '10004',
            'nome_requerente': 'Ana Costa',
            'sem_cpf': False,
            'cpf': '55566677788',
            'whatsapp': '',
            'titulo': 'Teste 4',
            'nome_parte_ato': '',
            'outras_infos': '',
            'data_criacao': '2025-01-18',
            'status': 'concluido',  # Lowercase, no accent - needs normalization
            'categoria': 'RCPN',
            'responsavel': 'Admin',
            'observacoes': '',
            'editavel': True,
            'ultima_alteracao_nome': 'Admin',
            'ultima_alteracao_data': '2025-01-18 10:00:00',
            'retirado_por': '',
            'data_retirada': '',
            'whatsapp_enviado_em': '',
            'whatsapp_enviado_por': '',
            'data_concluido': '2025-01-18',
            'historico_alteracoes': [],
            'historico': []
        },
        {
            'numero': '10005',
            'nome_requerente': 'Carlos Ferreira',
            'sem_cpf': False,
            'cpf': '99988877766',
            'whatsapp': '',
            'titulo': 'Teste 5',
            'nome_parte_ato': '',
            'outras_infos': '',
            'data_criacao': '2025-01-19',
            'status': 'Pendente',  # Different status - should not be normalized
            'categoria': 'RCPN',
            'responsavel': 'Admin',
            'observacoes': '',
            'editavel': True,
            'ultima_alteracao_nome': 'Admin',
            'ultima_alteracao_data': '2025-01-19 10:00:00',
            'retirado_por': '',
            'data_retirada': '',
            'whatsapp_enviado_em': '',
            'whatsapp_enviado_por': '',
            'data_concluido': '',
            'historico_alteracoes': [],
            'historico': []
        }
    ]
    
    print("\nInserting test protocols with various status formats...")
    print(f"Protocol 10001: status = 'Concluído' (correct)")
    print(f"Protocol 10002: status = 'concluído' (lowercase)")
    print(f"Protocol 10003: status = 'Concluido' (no accent)")
    print(f"Protocol 10004: status = 'concluido' (lowercase, no accent)")
    print(f"Protocol 10005: status = 'Pendente' (different status)")
    
    # Simulate backup restore - insert protocols
    result = protocolos_coll.insert_many(test_protocols)
    print(f"\n✅ Inserted {len(result.inserted_ids)} protocols")
    
    # Verify inserted data
    print("\nVerifying inserted protocols...")
    all_protocols = list(protocolos_coll.find({}))
    
    print(f"\nTotal protocols in database: {len(all_protocols)}")
    
    # Check status values
    status_counts = {}
    for protocol in all_protocols:
        status = protocol.get('status', '')
        status_counts[status] = status_counts.get(status, 0) + 1
        print(f"   Protocol {protocol['numero']}: status = '{status}'")
    
    print(f"\nStatus distribution:")
    for status, count in sorted(status_counts.items()):
        print(f"   '{status}': {count} protocol(s)")
    
    # Count finalized protocols (using exact match like the statistics query)
    finalized_count = protocolos_coll.count_documents({"status": "Concluído"})
    print(f"\nProtocols with status exactly 'Concluído': {finalized_count}")
    print(f"Expected: 4 (protocols 10001-10004 should all be normalized to 'Concluído')")
    
    # Check if normalization happened
    success = True
    if finalized_count != 4:
        print(f"\n❌ FAILED: Expected 4 finalized protocols, but found {finalized_count}")
        print("   Status normalization is NOT working correctly!")
        success = False
    else:
        print(f"\n✅ SUCCESS: All 4 protocols with 'concluído' variations were normalized to 'Concluído'")
    
    # Verify non-concluído status was not changed
    pendente_count = protocolos_coll.count_documents({"status": "Pendente"})
    if pendente_count != 1:
        print(f"❌ FAILED: Expected 1 'Pendente' protocol, but found {pendente_count}")
        success = False
    else:
        print(f"✅ SUCCESS: 'Pendente' status was preserved correctly")
    
    # Clean up
    import os
    if os.path.exists("test_status_backup.db"):
        os.remove("test_status_backup.db")
        print("\nCleaned up test database")
    
    print("\n" + "=" * 60)
    if success:
        print("ALL TESTS PASSED! ✓")
        print("=" * 60)
        print("\nStatus normalization is working correctly!")
        print("All variations of 'concluído' are normalized to 'Concluído'")
    else:
        print("TESTS FAILED! ✗")
        print("=" * 60)
        print("\nStatus normalization needs to be implemented!")
        print("Different status variations are not being normalized during restore.")
    
    return success

if __name__ == "__main__":
    try:
        success = test_status_normalization()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n❌ Test failed with exception: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
