@echo off
echo Starting Ahadu Digital Performance Model...

start "Backend - FastAPI" cmd /k "cd /d g:\Projects\ahadu_digital_performance_model\backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

start "Frontend - Vite" cmd /k "cd /d g:\Projects\ahadu_digital_performance_model\frontend && npm run dev"

echo Both servers are starting...
echo Backend  -^> http://localhost:8000
echo Frontend -^> http://localhost:5173
