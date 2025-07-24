@echo off
echo Starting KanoLens Development Server...
echo.

:: Change to project directory
cd /d "%~dp0"

:: Verify .env file exists
if not exist ".env" (
    echo ERROR: .env file not found
    echo Please ensure .env file exists in the project root
    pause
    exit /b 1
)

:: Display environment status
echo Environment file found: .env
echo Loading environment variables...

:: Start the development server with npm
echo Starting server...
npm run dev