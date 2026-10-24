@echo off
setlocal enabledelayedexpansion

echo ==============================================================================
echo  SkillBit — One-Click Contributor Launcher
echo ==============================================================================
echo.

cd /d "%~dp0"

:: 1. Check Python virtual environment
if not exist "%~dp0venv\Scripts\python.exe" (
    echo [SETUP] Python virtual environment not found. Setting up venv...
    python -m venv venv
    if errorlevel 1 (
        echo [ERROR] Python is not installed or not in PATH. Please install Python 3.12+.
        pause
        exit /b 1
    )
    echo [SETUP] Installing backend dependencies...
    "%~dp0venv\Scripts\python.exe" -m pip install --upgrade pip
    "%~dp0venv\Scripts\python.exe" -m pip install -r "%~dp0backend\requirements.txt"
)

:: 2. Check Frontend node_modules
if not exist "%~dp0skillbit\node_modules" (
    echo [SETUP] Frontend node_modules not found. Running npm install...
    cd /d "%~dp0skillbit"
    call npm install
    cd /d "%~dp0"
)

echo.
echo Launching Backend API server on http://localhost:8000...
start "SkillBit Backend - FastAPI" cmd /k "cd /d "%~dp0backend" && "%~dp0venv\Scripts\python.exe" -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

echo Launching Frontend Client on http://localhost:5173...
start "SkillBit Frontend - React" cmd /k "cd /d "%~dp0skillbit" && npm run dev"

echo.
echo ==============================================================================
echo  Both servers have been launched in separate terminal windows:
echo  - Frontend UI:        http://localhost:5173
echo  - Backend API Docs:   http://localhost:8000/docs
echo  - Seed Candidate:     demo@skillbit.ai   /  demo1234
echo  - Seed Admin Login:   admin@skillbit.ai  /  admin1234 (or AdminPass123!)
echo ==============================================================================
echo.
pause
