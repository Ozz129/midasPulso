@echo off
cd /d "%~dp0"
node scripts\local.cjs install
if errorlevel 1 (
  pause
  exit /b 1
)
pause
