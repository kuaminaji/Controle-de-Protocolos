@echo off
echo ========================================
echo Sistema de Gestao de Protocolos
echo Instalacao Rapida - Windows
echo ========================================
echo.

echo [1/6] Criando ambiente virtual...
python -m venv venv
if errorlevel 1 (
    echo ERRO: Falha ao criar ambiente virtual
    echo Certifique-se de que o Python esta instalado
    pause
    exit /b 1
)

echo [2/6] Ativando ambiente virtual...
call venv\Scripts\activate.bat

echo [3/6] Atualizando pip...
python -m pip install --upgrade pip

echo [4/6] Instalando dependencias do backend...
if not exist "backend\requirements.txt" (
    echo ERRO: Arquivo backend\requirements.txt nao encontrado
    pause
    exit /b 1
)
pip install -r backend\requirements.txt
if errorlevel 1 (
    echo ERRO: Falha ao instalar dependencias
    pause
    exit /b 1
)

echo [5/6] Configurando arquivo .env...
if not exist ".env" (
    echo Criando arquivo .env a partir do .env.example...
    copy .env.example .env > nul
    echo Arquivo .env criado com configuracoes padrao
) else (
    echo Arquivo .env ja existe
)

echo [6/6] Criando usuario administrador padrao...
python backend\cria_admin.py
if errorlevel 1 (
    echo AVISO: Falha ao criar usuario admin
    echo Voce pode criar manualmente mais tarde com: python backend\cria_admin.py
)

echo.
echo ========================================
echo Instalacao concluida com sucesso!
echo ========================================
echo.
echo Usuario administrador criado:
echo   Usuario: admin
echo   Senha: admin123@ (altere apos primeiro login!)
echo.
echo Proximos passos:
echo 1. Execute: iniciar_servidor.bat
echo 2. Acesse: http://localhost:8000
echo 3. Faca login e altere a senha padrao
echo.
echo Nota: O sistema esta configurado para usar SQLite por padrao
echo Para mais detalhes, consulte: GUIA_INSTALACAO_COMPLETO.md
echo.
pause
