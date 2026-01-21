#!/bin/bash
echo "========================================"
echo "Sistema de Gestão de Protocolos"
echo "Instalação Rápida - Linux/macOS"
echo "========================================"
echo ""

echo "[1/5] Criando ambiente virtual..."
python3 -m venv venv
if [ $? -ne 0 ]; then
    echo "ERRO: Falha ao criar ambiente virtual"
    echo "Certifique-se de que o Python 3 está instalado"
    exit 1
fi

echo "[2/5] Ativando ambiente virtual..."
source venv/bin/activate

echo "[3/5] Atualizando pip..."
pip install --upgrade pip

echo "[4/5] Instalando dependências..."
pip install -r backend/requirements.txt
if [ $? -ne 0 ]; then
    echo "ERRO: Falha ao instalar dependências"
    exit 1
fi

echo ""
echo "========================================"
echo "Instalação concluída com sucesso!"
echo "========================================"
echo ""
echo "Próximos passos:"
echo "1. Certifique-se de que o MongoDB está rodando"
echo "2. Verifique o arquivo .env (senha do admin)"
echo "3. Execute: ./iniciar_servidor.sh"
echo ""
echo "Para mais detalhes, consulte: GUIA_INSTALACAO_COMPLETO.md"
echo ""
