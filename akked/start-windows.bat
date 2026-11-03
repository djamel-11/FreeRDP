@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Opening the download page: install the LTS version, then double-click this file again.
  start https://nodejs.org
  pause
  exit /b
)
call npm install
start /min cmd /c "timeout /t 10 >nul & start http://localhost:3000"
call npm run dev
pause
