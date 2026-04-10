@echo off
cd /d "%~dp0"
setlocal enabledelayedexpansion

echo Setting up Windows Service (Standalone Executable)...

rem Get current directory
set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"
set "DIST=%ROOT%\dist"
set "EXE_PATH=%DIST%\imageservice.exe"
set "SERVICE_NAME=Image Service"

echo Root directory: %ROOT%
echo Executable: %EXE_PATH%
echo.

if not exist "%DIST%\logs" mkdir "%DIST%\logs"

rem Stop and remove existing service
echo Stopping existing service...
nssm stop "%SERVICE_NAME%" >nul 2>&1
echo Removing existing service...
nssm remove "%SERVICE_NAME%" confirm >nul 2>&1

rem Install new service
echo Installing new service...
nssm install "%SERVICE_NAME%" "%EXE_PATH%"

rem Configure service settings
echo Configuring service settings...
nssm set "%SERVICE_NAME%" AppDirectory "%DIST%"
nssm set "%SERVICE_NAME%" AppStdout "%DIST%\logs\service_stdout.log"
nssm set "%SERVICE_NAME%" AppStderr "%DIST%\logs\service_stderr.log"
nssm set "%SERVICE_NAME%" Start SERVICE_AUTO_START

rem Start the service
echo Starting service...
nssm start "%SERVICE_NAME%"

echo.
echo ================================
echo EXE SERVICE INSTALLATION COMPLETE
echo ================================
echo.
pause
exit /b 0
