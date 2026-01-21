@echo off
echo ========================================
echo Sistema de Gestao de Protocolos
echo Iniciando Servidor...
echo ========================================
echo.

echo Ativando ambiente virtual...
call venv\Scripts\activate.bat

echo Iniciando servidor na porta 8000...
echo.
echo Acesse: http://localhost:8000
echo.
echo Pressione Ctrl+C para parar o servidor
echo ========================================
echo.

cd backend
python main.py
