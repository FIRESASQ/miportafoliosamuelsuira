@echo off
chcp 65001 > nul
title Portafolio de Samuel Suira - Programacion V
cd /d "%~dp0"
rem Inicia el portafolio sin Docker. Requiere Java 21+, Maven y MySQL/MariaDB (por ejemplo XAMPP).
set "JAVA_EXE=java"
for /d %%J in ("C:\Program Files\Eclipse Adoptium\jdk-25*" "C:\Program Files\Eclipse Adoptium\jdk-21*") do if exist "%%J\bin\java.exe" set "JAVA_EXE=%%J\bin\java.exe"
echo.
echo   Portafolio de Samuel Suira  -  http://localhost:9000
echo   Cierra esta ventana para apagar el portal y los laboratorios encendidos.
echo.
start "" /min cmd /c "timeout /t 3 > nul & start http://localhost:9000"
"%JAVA_EXE%" portal\Portal.java
pause
