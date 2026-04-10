@echo off
set "SERVICE_NAME=Image Service"

echo Stopping service...
nssm stop "%SERVICE_NAME%"

echo Removing service...
nssm remove "%SERVICE_NAME%" confirm

echo.
echo Service "%SERVICE_NAME%" removed.
pause
