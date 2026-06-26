@echo off
title WDOcar - Sistema de Gestão
cd /d "%~dp0"

echo ========================================
echo  Iniciando WDOcar - Gestao de Oficina
echo ========================================

echo.
echo [1/2] Iniciando backend (API) na porta 8000...
start "Backend" cmd /k "cd /d "%~dp0backend" && uvicorn main:app --reload --host 0.0.0.0 --port 8000"

echo [2/2] Iniciando frontend na porta 3000...
start "Frontend" cmd /k "cd /d "%~dp0frontend" && npm start"

echo.
echo ========================================
echo  Backend: http://localhost:8000
echo  Frontend: http://localhost:3000
echo ========================================
echo.
echo  Login: admin / admin123
echo.
pause
