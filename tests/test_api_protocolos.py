import os
os.environ.setdefault("MONGO_URL", "mongomock://localhost")
os.environ.setdefault("DB_NAME", "protocolos_db_test")

from fastapi.testclient import TestClient
from backend.main import app, db

client = TestClient(app)

def test_fluxo_protocolo_crud():
    # login (não há sessão, mas endpoint existe)
    r = client.post("/api/login", json={"usuario":"Edvaldo","senha":"200482"})
    assert r.status_code in (200, 401)

    # incluir protocolo
    payload = {
        "numero": "12345",
        "nome_requerente": "Fulano de Tal",
        "cpf": "529.982.247-25",  # válido
        "titulo": "Abertura de Firma",
        "outras_infos": "",
        "data_criacao": "2025-01-10",
        "status": "Pendente",
        "categoria": "RTD",
        "responsavel": "Operador",
        "observacoes": "",
        "ultima_alteracao_nome": "Operador",
        "retirado_por": "",
        "data_retirada": ""
    }
    r = client.post("/api/protocolo", json=payload)
    assert r.status_code == 200, r.text
    pid = r.json()["id"]

    # buscar (paginado, default 50)
    r = client.get("/api/protocolo", params={"cpf": "52998224725"})
    assert r.status_code == 200
    data = r.json()
    assert "items" in data and data["total"] >= 1
    itens = data["items"]
    assert any(i["numero"] == "12345" for i in itens)

    # ordenar por número asc, per_page=1 para testar paginação
    r = client.get("/api/protocolo", params={"sort_by":"numero", "sort_dir":"asc", "per_page":1, "page":1})
    assert r.status_code == 200
    data = r.json()
    assert data["per_page"] == 1
    assert data["page"] == 1
    assert data["pages"] >= 1

    # editar (mudar status e título)
    r = client.put(f"/api/protocolo/{pid}", json={
        "status": "Em andamento",
        "titulo": "Abertura de Firma - Atualizado",
        "ultima_alteracao_nome": "Operador"
    })
    assert r.status_code == 200, r.text

    # excluir
    r = client.delete(f"/api/protocolo/{pid}", params={"usuario":"test"})
    assert r.status_code == 200, r.text

    # buscar novamente por status EXCLUIDO
    r = client.get("/api/protocolo", params={"status":"EXCLUIDO"})
    assert r.status_code == 200
    data = r.json()
    assert any(i["numero"] == "12345" for i in data.get("items", []))