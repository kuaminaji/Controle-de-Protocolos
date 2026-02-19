@echo off
setlocal enabledelayedexpansion

echo ========================================
echo Sistema de Gestao de Protocolos
echo Instalacao Rapida - Windows
echo ========================================
echo.

REM Detectar se estamos na pasta install ou na pasta raiz
set "SCRIPT_DIR=%~dp0"
set "CURRENT_DIR=%CD%"

echo Detectando localizacao...
echo Diretorio do script: %SCRIPT_DIR%
echo Diretorio atual: %CURRENT_DIR%
echo.

REM Verificar se existe pasta backend no diretorio atual
if exist "%CURRENT_DIR%\backend\requirements.txt" (
    echo [OK] Pasta backend encontrada no diretorio atual
    set "PROJECT_ROOT=%CURRENT_DIR%"
) else if exist "%CURRENT_DIR%\..\backend\requirements.txt" (
    echo [OK] Pasta backend encontrada no diretorio pai
    echo Mudando para diretorio raiz do projeto...
    cd ..
    set "PROJECT_ROOT=%CD%"
) else if exist "%SCRIPT_DIR%..\backend\requirements.txt" (
    echo [OK] Pasta backend encontrada no diretorio pai do script
    echo Mudando para diretorio raiz do projeto...
    cd /d "%SCRIPT_DIR%.."
    set "PROJECT_ROOT=%CD%"
) else (
    echo.
    echo ERRO CRITICO: Pasta "backend" nao encontrada!
    echo.
    echo Verifique se voce esta na pasta correta do projeto.
    echo O script procurou em:
    echo   - %CURRENT_DIR%\backend
    echo   - %CURRENT_DIR%\..\backend
    echo   - %SCRIPT_DIR%..\backend
    echo.
    echo A estrutura esperada e:
    echo   Protocolos\
    echo     backend\
    echo       requirements.txt
    echo       cria_admin.py
    echo     frontend\
    echo     install\
    echo.
    pause
    exit /b 1
)

echo Diretorio raiz do projeto: %PROJECT_ROOT%
echo.

REM Verificar se backend\requirements.txt existe
if not exist "backend\requirements.txt" (
    echo ERRO CRITICO: Arquivo "backend\requirements.txt" nao encontrado
    echo.
    echo Verifique se voce esta executando este script dentro da pasta correta
    echo ou se a pasta "backend" existe neste diretorio.
    echo Diretorio atual: %CD%
    pause
    exit /b 1
)

echo [1/6] Criando ambiente virtual...
python -m venv venv
if errorlevel 1 (
    echo ERRO: Falha ao criar ambiente virtual
    echo Certifique-se de que o Python 3.8+ esta instalado
    echo Teste com: python --version
    pause
    exit /b 1
)

echo [2/6] Ativando ambiente virtual...
call venv\Scripts\activate.bat
if errorlevel 1 (
    echo ERRO: Falha ao ativar ambiente virtual
    pause
    exit /b 1
)

echo [3/6] Atualizando pip...
python -m pip install --upgrade pip
if errorlevel 1 (
    echo AVISO: Falha ao atualizar pip (continuando...)
)

echo [4/6] Instalando dependencias do backend...
echo Instalando de: %CD%\backend\requirements.txt
pip install -r backend\requirements.txt
if errorlevel 1 (
    echo ERRO: Falha ao instalar dependencias
    echo Verifique se o arquivo backend\requirements.txt esta correto
    pause
    exit /b 1
)

echo [5/6] Configurando arquivo .env...
if not exist ".env" (
    if exist ".env.example" (
        echo Criando arquivo .env a partir do .env.example...
        copy .env.example .env > nul
        if errorlevel 1 (
            echo ERRO: Falha ao criar arquivo .env
            pause
            exit /b 1
        )
        echo Arquivo .env criado com configuracoes padrao
    ) else (
        echo AVISO: Arquivo .env.example nao encontrado
        echo Criando .env basico...
        (
            echo DB_TYPE=sqlite
            echo SQLITE_DB_PATH=protocolos.db
            echo ADMIN_USER=admin
            echo ADMIN_PASSWORD=admin123@
            echo SECRET_KEY=sua_chave_secreta_aqui_mude_em_producao
        ) > .env
        echo Arquivo .env criado com configuracao minima
    )
) else (
    echo Arquivo .env ja existe
)

echo [6/6] Criando usuario administrador padrao...
echo Executando: python backend\cria_admin.py
python backend\cria_admin.py
if errorlevel 1 (
    echo.
    echo AVISO: Ocorreu um problema ao criar usuario admin automaticamente
    echo.
    echo Voce pode criar o usuario admin manualmente depois com:
    echo   cd backend
    echo   python cria_admin.py
    echo.
    echo A instalacao continuara...
    timeout /t 3 > nul
) else (
    echo Usuario administrador criado com sucesso!
)

echo.
echo ========================================
echo Instalacao concluida com sucesso!
echo ========================================
echo.
echo Usuario administrador criado:
echo   Usuario: admin
echo   Senha: admin123@ (ALTERE APOS PRIMEIRO LOGIN!)
echo.
echo A senha usa hash PBKDF2-SHA256 com 260.000 iteracoes
echo para maxima seguranca.
echo.
echo Proximos passos:
echo 1. Execute: iniciar_servidor.bat (ou: cd .. e depois iniciar_servidor.bat)
echo 2. Acesse: http://localhost:8000
echo 3. Faca login com as credenciais acima
echo 4. IMPORTANTE: Altere a senha padrao!
echo.
echo Nota: O sistema esta configurado para usar SQLite por padrao
echo Para mais detalhes, consulte: GUIA_INSTALACAO_COMPLETO.md
echo.
echo Ambiente virtual criado em: %PROJECT_ROOT%\venv
echo Banco de dados sera criado em: %PROJECT_ROOT%\protocolos.db
echo.
pause

endlocal
