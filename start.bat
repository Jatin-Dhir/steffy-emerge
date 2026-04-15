@echo off
echo ========================================
echo   Steffy AI Wardrobe - Startup Script
echo ========================================
echo.

REM Check if backend venv exists
if not exist "%~dp0backend\venv_new" (
    echo Setting up backend virtual environment...
    cd /d "%~dp0backend"
    python -m venv venv_new
    call venv_new\Scripts\activate.bat
    pip install -q fastapi uvicorn pymongo python-dotenv google-generativeai passlib motor pydantic-settings
    cd "%~dp0"
)

REM Check if frontend dist exists, build if needed
if not exist "%~dp0frontend\dist" (
    echo Building frontend...
    cd /d "%~dp0frontend"
    call npm run build 2>nul || npx expo export --platform web --output-dir dist
    cd "%~dp0"
)

echo.
echo Starting backend on port 3001...
start "Steffy Backend" cmd /k "cd /d "%~dp0backend" && call venv_new\Scripts\activate.bat && python -m uvicorn server:app --reload --host 0.0.0.0 --port 3001"
timeout /t 3 /nobreak >nul

echo Starting frontend on port 3000...
start "Steffy Frontend" cmd /k "cd /d "%~dp0frontend" && npx http-server dist -p 3000 -o"
timeout /t 2 /nobreak >nul

echo.
echo ========================================
echo   Services Started Successfully!
echo ========================================
echo.
echo  Backend:   http://127.0.0.1:3001
echo  Frontend:  http://127.0.0.1:3000
echo.
echo  The frontend will open in your browser.
echo  Press Ctrl+C in either window to stop.
echo ========================================
pause
