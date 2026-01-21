@echo off
REM Instalação automática do MongoDB (exemplo para Windows)
REM Baixe e instale o MongoDB Community Edition se não existir
REM Crie pasta para banco de dados
IF NOT EXIST "C:\data\db" mkdir "C:\data\db"
REM Instale dependências do backend
cd /d "%~dp0..\backend"
python -m pip install -r requirements.txt
REM Inicie o MongoDB e o backend
start "" "C:\Program Files\MongoDB\Server\8.0\bin\mongod.exe" --dbpath "C:\data\db"
timeout /t 5
start "" python main.py
REM Crie atalho na área de trabalho (pode usar powershell para criar atalhos .lnk)
pause