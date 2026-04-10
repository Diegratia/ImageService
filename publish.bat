@echo off
cd /d "%~dp0"
echo [1/4] Installing dependencies...
call npm install

echo [2/4] Building executable...
if not exist dist mkdir dist
call npm run build

echo [3/4] Copying configuration...
if exist .env (
    copy .env dist\.env /Y
) else (
    echo WARNING: .env file not found. Please create one in the dist folder.
)

echo [4/4] Creating folder structure...
if not exist dist\uploads mkdir dist\uploads
if not exist dist\uploads\images mkdir dist\uploads\images
if not exist dist\uploads\videos mkdir dist\uploads\videos
if not exist dist\uploads\documents mkdir dist\uploads\documents
if not exist dist\logs mkdir dist\logs

echo.
echo Publish complete! You can find the service in the 'dist' folder.
echo You can now use install-service.bat to install as a Windows Service.
pause

