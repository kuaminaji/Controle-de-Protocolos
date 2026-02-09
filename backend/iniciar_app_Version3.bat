@echo off
setlocal enabledelayedexpansion

REM === CONFIGURAÇÕES ===
set SERVICE_NAME=MongoDB
set LOG_FILE=%~dp0mongodb_monitor.log
set BACKEND_PATH=%~dp0backend
set TIMESTAMP=[%date% %time%]

REM === Função para registrar logs ===
:log
echo %TIMESTAMP% %~1 >> "%LOG_FILE%"
echo %~1
exit /b 0

REM === Vai para a pasta do backend ===
cd /d "%BACKEND_PATH%"

REM === Loop de monitoramento ===
:loop
set TIMESTAMP=[%date% %time%]

REM === Verifica se o serviço MongoDB está rodando ===
sc query %SERVICE_NAME% | find "RUNNING" >nul
if errorlevel 1 (
    call :log "[WARN] Serviço %SERVICE_NAME% não está rodando. Tentando reiniciar..."
    net start %SERVICE_NAME% >nul 2>&1
    if errorlevel 1 (
        call :log "[ERROR] Falha ao iniciar o serviço %SERVICE_NAME%."
    ) else (
        call :log "[INFO] Serviço %SERVICE_NAME% reiniciado com sucesso."
    )
) else (
    call :log "[INFO] Serviço %SERVICE_NAME% está rodando normalmente."
)

REM === Aguarda 3 segundos antes de subir o backend ===
timeout /t 3 /nobreak >nul

REM === Se o backend ainda não estiver rodando, inicia em segundo plano ===
tasklist | find /i "uvicorn.exe" >nul
if errorlevel 1 (
    call :log "[INFO] Iniciando backend FastAPI em segundo plano..."
    start /B uvicorn main:app --reload --host 0.0.0.0 --port 8000
) else (
    call :log "[INFO] Backend FastAPI já está em execução."
)

REM === Aguarda 30 segundos antes da próxima checagem ===
timeout /t 30 /nobreak >nul
goto loop
