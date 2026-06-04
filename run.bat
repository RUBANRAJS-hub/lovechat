@echo off
title ForeverUs Runner
echo ==================================================
echo         STARTING FOREVERUS APPLICATION
echo ==================================================
echo.

echo Launching Express Backend Server...
start cmd /k "echo Starting ForeverUs Backend... && cd backend && npm install && npm run dev"

echo Launching Next.js Frontend Dev Server...
start cmd /k "echo Starting ForeverUs Frontend... && cd frontend && npm install && npm run dev"

echo.
echo ==================================================
echo Applications are starting up in separate windows!
echo Backend: http://localhost:5000
echo Frontend: http://localhost:3000
echo ==================================================
pause
