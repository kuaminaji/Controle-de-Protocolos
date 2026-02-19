#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Data Migration Tool: MongoDB → SQLite
Migra dados de MongoDB para SQLite preservando toda funcionalidade
"""

import os
import sys
import json
from datetime import datetime, timezone
import argparse

def export_from_mongodb(mongo_url, db_name, output_file):
    """Exporta dados do MongoDB para arquivo JSON"""
    print("=" * 60)
    print("EXPORTANDO DADOS DO MONGODB")
    print("=" * 60)
    
    try:
        from pymongo import MongoClient
    except ImportError:
        print("✗ Erro: pymongo não instalado")
        print("  Instale com: pip install pymongo")
        return False
    
    try:
        print(f"\nConectando ao MongoDB: {mongo_url}")
        client = MongoClient(mongo_url, serverSelectionTimeoutMS=5000)
        client.admin.command('ping')
        print("✓ Conectado com sucesso")
        
        db = client[db_name]
        
        # Coleções para exportar
        collections = ['protocolos', 'usuarios', 'categorias', 'notificacoes', 'filtros', 'protocolos_excluidos']
        
        backup_data = {}
        total_docs = 0
        
        for coll_name in collections:
            print(f"\nExportando coleção: {coll_name}")
            
            try:
                docs = list(db[coll_name].find())
                
                # Converter ObjectId e datetime para strings
                for doc in docs:
                    if '_id' in doc:
                        doc['_id'] = str(doc['_id'])
                    
                    for key, value in list(doc.items()):
                        if hasattr(value, 'isoformat'):  # datetime
                            doc[key] = value.isoformat()
                
                backup_data[coll_name] = docs
                total_docs += len(docs)
                print(f"  ✓ {len(docs)} documentos exportados")
                
            except Exception as e:
                print(f"  ⚠ Erro ao exportar {coll_name}: {e}")
                backup_data[coll_name] = []
        
        # Salvar em arquivo
        print(f"\nSalvando dados em: {output_file}")
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(backup_data, f, ensure_ascii=False, indent=2)
        
        print(f"\n{'=' * 60}")
        print(f"✓ EXPORTAÇÃO CONCLUÍDA")
        print(f"  Total de documentos: {total_docs}")
        print(f"  Arquivo: {output_file}")
        print(f"  Tamanho: {os.path.getsize(output_file) / 1024:.2f} KB")
        print(f"{'=' * 60}\n")
        
        return True
        
    except Exception as e:
        print(f"\n✗ Erro durante exportação: {e}")
        import traceback
        traceback.print_exc()
        return False


def import_to_sqlite(input_file, sqlite_path):
    """Importa dados do arquivo JSON para SQLite"""
    print("=" * 60)
    print("IMPORTANDO DADOS PARA SQLITE")
    print("=" * 60)
    
    # Verificar se arquivo existe
    if not os.path.exists(input_file):
        print(f"✗ Erro: Arquivo não encontrado: {input_file}")
        return False
    
    # Configurar ambiente para SQLite
    os.environ['DB_TYPE'] = 'sqlite'
    os.environ['SQLITE_DB_PATH'] = sqlite_path
    
    try:
        print(f"\nCarregando dados de: {input_file}")
        with open(input_file, 'r', encoding='utf-8') as f:
            backup_data = json.load(f)
        
        print(f"✓ Dados carregados")
        
        # Importar módulo do adaptador
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))
        from db_adapter import get_db_collections
        
        print(f"\nInicializando banco SQLite: {sqlite_path}")
        collections_dict = get_db_collections()
        print("✓ Banco SQLite inicializado")
        
        # Mapear nomes de coleções
        collection_map = {
            'protocolos': 'protocolos_coll',
            'usuarios': 'usuarios_coll',
            'categorias': 'categorias_coll',
            'notificacoes': 'notificacoes_coll',
            'filtros': 'filtros_coll',
            'protocolos_excluidos': 'protocolos_excluidos_coll'
        }
        
        total_imported = 0
        
        for coll_name, coll_key in collection_map.items():
            if coll_name not in backup_data:
                print(f"\n⚠ Pulando {coll_name}: não encontrado no backup")
                continue
            
            print(f"\nImportando: {coll_name}")
            coll = collections_dict[coll_key]
            docs = backup_data[coll_name]
            
            imported = 0
            errors = 0
            
            for i, doc in enumerate(docs, 1):
                try:
                    # Remover _id do MongoDB (SQLite gerará novo)
                    if '_id' in doc:
                        del doc['_id']
                    
                    # Converter strings ISO para datetime onde necessário
                    for key, value in list(doc.items()):
                        if isinstance(value, str) and ('_dt' in key or key.endswith('_dt')):
                            try:
                                # Tentar parse ISO
                                if 'T' in value or '+' in value or 'Z' in value:
                                    doc[key] = datetime.fromisoformat(value.replace('Z', '+00:00'))
                            except:
                                pass
                    
                    # Inserir documento
                    coll.insert_one(doc)
                    imported += 1
                    
                    # Mostrar progresso
                    if i % 100 == 0:
                        print(f"  Progresso: {i}/{len(docs)} documentos...")
                    
                except Exception as e:
                    errors += 1
                    if errors <= 5:  # Mostrar apenas primeiros 5 erros
                        print(f"  ⚠ Erro no documento {i}: {str(e)[:100]}")
            
            total_imported += imported
            print(f"  ✓ {imported} documentos importados")
            if errors > 0:
                print(f"  ⚠ {errors} erros (documentos pulados)")
        
        print(f"\n{'=' * 60}")
        print(f"✓ IMPORTAÇÃO CONCLUÍDA")
        print(f"  Total importado: {total_imported} documentos")
        print(f"  Banco SQLite: {sqlite_path}")
        print(f"{'=' * 60}\n")
        
        return True
        
    except Exception as e:
        print(f"\n✗ Erro durante importação: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    parser = argparse.ArgumentParser(
        description='Ferramenta de migração MongoDB → SQLite',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Exemplos de uso:

  1. Exportar MongoDB para arquivo:
     python migrate_to_sqlite.py export --mongo-url mongodb://localhost:27017/ --db-name protocolos_db

  2. Importar arquivo para SQLite:
     python migrate_to_sqlite.py import --input mongodb_backup.json --sqlite protocolos.db

  3. Migração completa (export + import):
     python migrate_to_sqlite.py full --mongo-url mongodb://localhost:27017/ --db-name protocolos_db --sqlite protocolos.db
        """
    )
    
    subparsers = parser.add_subparsers(dest='command', help='Comando a executar')
    
    # Comando: export
    export_parser = subparsers.add_parser('export', help='Exportar dados do MongoDB')
    export_parser.add_argument('--mongo-url', default='mongodb://localhost:27017/', 
                              help='URL de conexão do MongoDB')
    export_parser.add_argument('--db-name', default='protocolos_db', 
                              help='Nome do banco de dados MongoDB')
    export_parser.add_argument('--output', default='mongodb_backup.json', 
                              help='Arquivo de saída')
    
    # Comando: import
    import_parser = subparsers.add_parser('import', help='Importar dados para SQLite')
    import_parser.add_argument('--input', default='mongodb_backup.json', 
                              help='Arquivo de entrada (JSON)')
    import_parser.add_argument('--sqlite', default='protocolos.db', 
                              help='Caminho do banco SQLite')
    
    # Comando: full
    full_parser = subparsers.add_parser('full', help='Migração completa (export + import)')
    full_parser.add_argument('--mongo-url', default='mongodb://localhost:27017/', 
                            help='URL de conexão do MongoDB')
    full_parser.add_argument('--db-name', default='protocolos_db', 
                            help='Nome do banco de dados MongoDB')
    full_parser.add_argument('--sqlite', default='protocolos.db', 
                            help='Caminho do banco SQLite')
    full_parser.add_argument('--backup-file', default='mongodb_backup.json', 
                            help='Arquivo temporário de backup')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        sys.exit(1)
    
    # Executar comando
    success = False
    
    if args.command == 'export':
        success = export_from_mongodb(args.mongo_url, args.db_name, args.output)
    
    elif args.command == 'import':
        success = import_to_sqlite(args.input, args.sqlite)
    
    elif args.command == 'full':
        print("\n🔄 MIGRAÇÃO COMPLETA: MongoDB → SQLite\n")
        
        # Passo 1: Export
        success = export_from_mongodb(args.mongo_url, args.db_name, args.backup_file)
        
        if success:
            # Passo 2: Import
            success = import_to_sqlite(args.backup_file, args.sqlite)
        
        if success:
            print("\n🎉 MIGRAÇÃO COMPLETA BEM-SUCEDIDA!")
            print("\nPróximos passos:")
            print("1. Configure .env com: DB_TYPE=sqlite")
            print("2. Configure .env com: SQLITE_DB_PATH=" + args.sqlite)
            print("3. Reinicie o servidor")
            print("4. Teste a aplicação")
            print(f"5. Mantenha backup: {args.backup_file}")
    
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
