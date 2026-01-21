from pymongo import MongoClient

MONGO_URL = "mongodb://localhost:27017/"
DB_NAME = "protocolos_db"

client = MongoClient(MONGO_URL)
db = client[DB_NAME]
usuarios_coll = db["usuarios"]

# Cria o usuário admin com tipo "admin"
if not usuarios_coll.find_one({"usuario": "admin"}):
    usuarios_coll.insert_one({
        "usuario": "admin",
        "senha": "admin123",   # Troque para uma senha forte depois!
        "tipo": "admin"
    })
    print("Usuário admin criado com sucesso!")
else:
    print("Usuário admin já existe.")