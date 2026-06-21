Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  PROGETTO KART - Avvio ambiente" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "[1/2] Avvio backend (FastAPI + Socket.IO)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", ".\venv\Scripts\Activate.ps1; uvicorn app.main:socket_app --reload --port 8000"

Start-Sleep -Seconds 2

Write-Host "[2/2] Avvio frontend (Vite)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"

Write-Host "`nEntrambi i server sono stati avviati in finestre separate:`n" -ForegroundColor Cyan
Write-Host "  Backend  -> http://localhost:8000" -ForegroundColor Yellow
Write-Host "  Frontend -> http://localhost:5173" -ForegroundColor Yellow
Write-Host "`nChiudi le finestre per fermare i server." -ForegroundColor Gray
