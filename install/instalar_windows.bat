@echo off
echo ========================================
echo Sistema de Gestao de Protocolos
echo Instalacao Rapida - Windows
echo ========================================
echo.

echo [1/5] Criando ambiente virtual...
python -m venv venv
if errorlevel 1 (
    echo ERRO: Falha ao criar ambiente virtual
    echo Certifique-se de que o Python esta instalado
    pause
    exit /b 1
)

echo [2/5] Ativando ambiente virtual...
call venv\Scripts\activate.bat

echo [3/5] Atualizando pip...
python -m pip install --upgrade pip

echo [4/5] Instalando dependencias...
pip install -r backend\requirements.txt
if errorlevel 1 (
    echo ERRO: Falha ao instalar dependencias
    pause
    exit /b 1
)

echo.
echo ========================================
echo Instalacao concluida com sucesso!
echo ========================================
echo.
echo Proximos passos:
echo 1. Certifique-se de que o MongoDB esta rodando
echo 2. Verifique o arquivo .env (senha do admin)
echo 3. Execute: iniciar_servidor.bat
echo.
echo Para mais detalhes, consulte: GUIA_INSTALACAO_COMPLETO.md
echo.
pause
