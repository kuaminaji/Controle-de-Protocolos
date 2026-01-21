import os
# usar mongomock para não conectar ao Mongo real ao importar o backend
os.environ.setdefault("MONGO_URL", "mongomock://localhost")
from backend.main import validar_cpf, apenas_digitos

def test_apenas_digitos():
  assert apenas_digitos("123.456-78") == "12345678"
  assert apenas_digitos("") == ""
  assert apenas_digitos("abc123") == "123"

def test_validar_cpf_valido():
  # CPFs de teste válidos
  validos = [
    "529.982.247-25",
    "153.509.460-56",
    "11144477735",
  ]
  for cpf in validos:
    assert validar_cpf(cpf) is True, f"Falhou para {cpf}"

def test_validar_cpf_invalido():
  invalidos = [
    "000.000.000-00",
    "111.111.111-11",
    "123.456.789-00",
    "529.982.247-24",  # dígito errado
    "5299822472",      # 10 dígitos
    "529982247252",    # 12 dígitos
  ]
  for cpf in invalidos:
    assert validar_cpf(cpf) is False, f"Falhou para {cpf}"