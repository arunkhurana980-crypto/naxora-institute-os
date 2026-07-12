@echo off
echo Stopping old Node servers...
taskkill /F /IM node.exe >nul 2>&1
echo Starting NAXORA Part 42 Integrated Folder Fixed Backend...
cd backend
call npm install
call npm run dev
pause
