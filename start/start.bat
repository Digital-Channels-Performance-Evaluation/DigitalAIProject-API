@echo off
title AHADU PULSE - Launcher
color 0A
chcp 65001 >nul 2>&1

setlocal EnableExtensions

REM ==================================================
REM PATHS
REM ==================================================

set "SCRIPT_DIR=%~dp0"
set "PROJECT_DIR=%SCRIPT_DIR%.."
set "BACKEND_DIR=%PROJECT_DIR%\backend"
set "FRONTEND_DIR=%PROJECT_DIR%\frontend"

echo.
echo ==================================================
echo   AHADU BANK - AHADU PULSE
echo ==================================================
echo.

echo Project  : %PROJECT_DIR%
echo Backend  : %BACKEND_DIR%
echo Frontend : %FRONTEND_DIR%
echo.

REM ==================================================
REM VERIFY DIRECTORIES
REM ==================================================

if not exist "%BACKEND_DIR%" (
echo [ERROR] Backend folder not found.
pause
exit /b 1
)

if not exist "%FRONTEND_DIR%" (
echo [ERROR] Frontend folder not found.
pause
exit /b 1
)

REM ==================================================
REM CHECK PYTHON
REM ==================================================

where py >nul 2>&1
if errorlevel 1 (
echo [ERROR] Python not found.
pause
exit /b 1
)

echo [OK] Python found.

REM ==================================================
REM CHECK NODE
REM ==================================================

where node >nul 2>&1
if errorlevel 1 (
echo [ERROR] Node.js not found.
pause
exit /b 1
)

echo [OK] Node.js found.

REM ==================================================
REM INSTALL BACKEND DEPENDENCIES
REM ==================================================

echo.
echo [..] Checking backend requirements...

if exist "%BACKEND_DIR%\requirements.txt" (

```
py -m pip install -r "%BACKEND_DIR%\requirements.txt"

if errorlevel 1 (
    echo [ERROR] Backend dependency installation failed.
    pause
    exit /b 1
)
```

)

echo [OK] Backend ready.

REM ==================================================
REM INSTALL FRONTEND DEPENDENCIES
REM ==================================================

echo.
echo [..] Checking frontend dependencies...

pushd "%FRONTEND_DIR%"

call npm install

if errorlevel 1 (
popd
echo [ERROR] npm install failed.
pause
exit /b 1
)

popd

echo [OK] Frontend ready.

REM ==================================================
REM CLEAN NEXT CACHE
REM ==================================================

echo.
echo [..] Cleaning Next.js cache...

if exist "%FRONTEND_DIR%.next" (

```
attrib -r -s -h "%FRONTEND_DIR%\.next" /s /d >nul 2>&1

rmdir /s /q "%FRONTEND_DIR%\.next"

timeout /t 1 >nul
```

)

echo [OK] Cache cleaned.

REM ==================================================
REM START BACKEND
REM ==================================================

echo.
echo [..] Starting FastAPI backend...

start "AHADU Backend" cmd /k ^
"cd /d ""%BACKEND_DIR%"" && set PYTHONPATH=%BACKEND_DIR% && py -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

REM ==================================================
REM WAIT
REM ==================================================

echo [..] Waiting for backend...
timeout /t 5 /nobreak >nul

REM ==================================================
REM START FRONTEND
REM ==================================================

echo.
echo [..] Starting Next.js frontend...

start "AHADU Frontend" cmd /k ^
"cd /d ""%FRONTEND_DIR%"" && npm run dev"

REM ==================================================
REM DONE
REM ==================================================

echo.
echo ==================================================
echo AHADU PULSE STARTED
echo ==================================================
echo.
echo Frontend : http://localhost:3000
echo Backend  : http://localhost:8000
echo Docs     : http://localhost:8000/docs
echo.
echo Admin Login
echo ----------------------------------------
echo Email    : [admin@ahadubank.com](mailto:admin@ahadubank.com)
echo Password : Admin@123
echo.
echo ==================================================
echo.

pause
