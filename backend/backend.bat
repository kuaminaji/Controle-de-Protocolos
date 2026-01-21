:: start_all.bat
@echo off

:: Iniciar o backend FastAPI
start "" cmd /c "cd /d C:\Protocolos\backend && uvicorn main:app --reload --host 0.0.0.0 --port 8000"

:: Iniciar o frontend React
start "" cmd /c "cd /d C:\Protocolos\frontend && npm start"
