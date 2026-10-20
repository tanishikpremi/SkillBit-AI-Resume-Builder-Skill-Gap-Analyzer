@echo off
echo ==============================================================================
echo Starting SkillBit - Resume Builder ^& Skill Gap Analyzer
echo ==============================================================================
echo.
echo Launching Backend API server on http://localhost:8000...
start "SkillBit Backend - FastAPI" cmd /k "cd /d "%~dp0backend" && "%~dp0venv\Scripts\python.exe" -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

echo Launching Frontend Client on http://localhost:5173...
start "SkillBit Frontend - React" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo ==============================================================================
echo Both servers have been launched in separate terminal windows:
echo - Frontend UI:      http://localhost:5173
echo - Backend API Docs: http://localhost:8000/docs
echo ==============================================================================
pause
