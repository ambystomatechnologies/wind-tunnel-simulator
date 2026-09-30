@echo off
title Simulador de Mecanica de Fluidos y Tunel Aerodinamico 2D - Ambystoma Studio
echo ========================================================
echo   Iniciando Simulador de Fluidos y Tunel Aerodinamico 2D
echo ========================================================
echo.
cd /d "%~dp0"
echo Abriendo el simulador en tu navegador...
echo URL: http://localhost:8082/index.html
echo.
echo Presiona Ctrl + C en esta ventana para detener el servidor.
echo ========================================================
echo.

start "" "http://localhost:8082/index.html?t=%random%"

python -m http.server 8082

if %errorlevel% neq 0 (
    echo.
    echo [AVISO] Python no fue detectado en el sistema o el puerto 8082 esta en uso.
    echo Abriendo index.html directamente...
    start "" "%~dp0index.html"
    pause
)

