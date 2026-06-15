@echo off
title AHADU PULSE - Stopping services...
color 0C

echo.
echo  [..] Stopping AHADU PULSE services...
echo.

:: Kill backend window by title
taskkill /F /FI "WINDOWTITLE eq AHADU PULSE - Backend*" >nul 2>&1

:: Kill anything on port 8000
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":8000 " ^| findstr "LISTENING"') do (
    taskkill /PID %%a /F >nul 2>&1
)
echo  [OK] Backend stopped (port 8000 freed).

:: Kill frontend window by title
taskkill /F /FI "WINDOWTITLE eq AHADU PULSE - Frontend*" >nul 2>&1

:: Kill anything on port 3000
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":3000 " ^| findstr "LISTENING"') do (
    taskkill /PID %%a /F >nul 2>&1
)
echo  [OK] Frontend stopped (port 3000 freed).

echo.
echo  All AHADU PULSE services stopped.
echo.
pause
