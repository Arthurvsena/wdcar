@echo off
setlocal enabledelayedexpansion

title WDOcar - Sistema de Gestão
cd /d "%~dp0"

echo ========================================
echo  WDOcar - Gestao de Oficina Mecanica
echo ========================================
echo.

where docker >nul 2>nul
if %errorlevel% neq 0 (
    set DOCKER_AVAILABLE=0
) else (
    set DOCKER_AVAILABLE=1
)

:menu
echo Selecione a opcao:
echo [1] Iniciar em modo Desenvolvimento
if %DOCKER_AVAILABLE%==1 (
    echo [2] Iniciar com Docker Compose
    echo [3] Parar containers Docker
    echo [4] Rebuild e iniciar
    echo [5] Ver status
) else (
    echo [2] Docker (NAO INSTALADO)
    echo [3] Docker (NAO INSTALADO)
    echo [4] Docker (NAO INSTALADO)
    echo [5] Docker (NAO INSTALADO)
)
echo [0] Sair
echo.
set /p opcao="Opcao: "

if "%opcao%"=="1" goto dev
if "%opcao%"=="2" goto docker
if "%opcao%"=="3" goto stop
if "%opcao%"=="4" goto rebuild
if "%opcao%"=="5" goto status
if "%opcao%"=="0" goto end

goto menu

:kill_ports
echo Limpiando portas...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8000 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>nul
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>nul
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>nul
)
timeout /t 1 /nobreak >nul
goto :EOF

:dev
echo.
echo Limpiando processos existentes nas portas 8000 e 3000...
call :kill_ports

echo [1/2] Iniciando backend (API) na porta 8000...
start /MIN "Backend" cmd /k "cd /d "%~dp0backend" && uvicorn main:app --reload --host 0.0.0.0 --port 8000"

timeout /t 2 /nobreak >nul

echo [2/2] Iniciando frontend na porta 3000...
start /MIN "Frontend" cmd /k "cd /d "%~dp0frontend" && set PORT=3000 && npm start"

echo.
echo ========================================
echo  Backend: http://localhost:8000
echo  Frontend: http://localhost:3000
echo ========================================
echo.
echo Processos iniciados! Pressione qualquer tecla para sair.
pause >nul
goto end

:docker
if %DOCKER_AVAILABLE%==0 (
    echo.
    echo ERRO: Docker nao esta instalado ou nao esta no PATH.
    echo.
    echo Para usar Docker, instale o Docker Desktop:
    echo https://www.docker.com/products/docker-desktop/
    echo.
    echo Enquanto isso, use a opcao [1] para modo Desenvolvimento.
    echo.
    pause
    goto menu
)
echo.
echo Limpiando processos existentes...
call :kill_ports
echo Iniciando com Docker Compose...
docker-compose up -d
echo.
docker-compose ps
echo.
echo Acesse: http://localhost:3000
pause
goto end

:stop
if %DOCKER_AVAILABLE%==0 (
    echo.
    echo ERRO: Docker nao esta instalado.
    pause
    goto menu
)
echo.
echo Parando containers...
docker-compose down
echo.
pause
goto end

:rebuild
if %DOCKER_AVAILABLE%==0 (
    echo.
    echo ERRO: Docker nao esta instalado.
    pause
    goto menu
)
echo.
echo Limpiando processos existentes...
call :kill_ports
echo Rebuilding e iniciando...
docker-compose up -d --build
echo.
docker-compose ps
pause
goto end

:status
if %DOCKER_AVAILABLE%==0 (
    echo.
    echo ERRO: Docker nao esta instalado.
    pause
    goto menu
)
echo.
docker-compose ps
echo.
pause
goto end

:end
endlocal