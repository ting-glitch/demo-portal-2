@echo off
title Billing Manager Server
cd /d "%~dp0"
echo Starting FastAPI server...
python app.py
pause
