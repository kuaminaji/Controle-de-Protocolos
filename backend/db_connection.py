from pymongo import MongoClient

class DBConnection:
    def __init__(self, uri="mongodb://localhost:27017/", db_name="protocolos_db"):
        self.client = MongoClient(uri)
        self.db = self.client[db_name]
        self.protocolos = self.db["protocolos"]
        self.usuarios = self.db["usuarios"]

    def salvar_protocolo(self, dados):
        return self.protocolos.insert_one(dados)

    def buscar_protocolos(self, filtro=None):
        return list(self.protocolos.find(filtro or {}))

    def editar_protocolo(self, protocolo_id, novos_dados):
        return self.protocolos.update_one({"_id": protocolo_id}, {"$set": novos_dados})

    def excluir_protocolo(self, protocolo_id):
        return self.protocolos.delete_one({"_id": protocolo_id})

    # Métodos para usuários podem ser adicionados aqui