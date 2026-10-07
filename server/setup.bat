@echo off
rem Lord Sai SIP - one-time setup: Python packages + MySQL database, tables and user.
cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
  echo Creating the Python environment...
  python -m venv .venv || goto :fail
)
echo Installing packages...
".venv\Scripts\python.exe" -m pip install --quiet --disable-pip-version-check -r requirements.txt || goto :fail

".venv\Scripts\python.exe" setup_db.py || goto :fail
pause
exit /b 0

:fail
echo.
echo Setup did not finish. Read the message above, fix it, and run setup.bat again.
pause
exit /b 1
