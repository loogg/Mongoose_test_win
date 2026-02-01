@echo off
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -Command "& '%~dp0start.ps1' -Mode dev"
pause
