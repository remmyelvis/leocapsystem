@echo off
title LeoCap Demo Launcher
echo ==================================================
echo LEO CAP - DEMO ENVIRONMENT STARTUP
echo ==================================================
echo.
echo Starting Demo Database (leocap_demo.db)...
echo Bypassing Actual Email Delivery (DEMO_MODE=True)...
echo.

set DEMO_MODE=True
set DATABASE_URL=sqlite:///leocap_demo.db

cd /d "%~dp0backend"
start "LeoCap Backend (DEMO)" cmd /k "set DEMO_MODE=True&& set DATABASE_URL=sqlite:///leocap_demo.db&& C:\Users\ELVIS\AppData\Local\Programs\Python\Python311_embed\python.exe app.py"

cd /d "%~dp0frontend"
start "LeoCap Frontend (DEMO)" cmd /k "npm run dev"

echo.
echo Demo Environment is now running in separate windows!
echo Frontend: http://localhost:5173
echo Backend:  http://localhost:5000
echo.
pause
