@echo off
echo ========================================
echo   Steffy AI Wardrobe
echo ========================================
echo.
echo Starting backend on port 3001...
start "Steffy Backend" cmd /k "cd /d "%~dp0backend" && python -m uvicorn server:app --host 0.0.0.0 --port 3001"
timeout /t 3 /nobreak >nul
echo Starting frontend on port 8081...
start "Steffy Frontend" cmd /k "cd /d "%~dp0frontend" && npx expo start --web --clear"
echo.
echo  Backend:   http://127.0.0.1:3001
echo  Frontend:  http://localhost:8081
echo.
echo  Open http://localhost:8081 in your browser.
echo ========================================
pause
