@echo off
title AHADU PULSE - Backend :8000
color 0B
cd /d "%~dp0..\backend"
echo.
echo  BACKEND - FastAPI on http://localhost:8000
echo  API Docs: http://localhost:8000/docs
echo.
py -m uvicorn app.main:app --reload --port 8000 --host 0.0.0.0
pause
