@echo off
rem Lord Sai SIP - start the API that saves enquiries and clicks to MySQL.
cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
  echo Run setup.bat first.
  pause
  exit /b 1
)
".venv\Scripts\python.exe" app.py
pause
