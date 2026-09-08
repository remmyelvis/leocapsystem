$python = "C:\Users\ELVIS\AppData\Local\Programs\Python\Python311_embed\python.exe"
$backendDir = "C:\Users\ELVIS\.gemini\antigravity\scratch\leocap-system\backend"

$env:PYTHONPATH = $backendDir
$env:FLASK_APP = "app.py"
$env:FLASK_ENV = "development"
$env:FLASK_DEBUG = "1"
$env:SECRET_KEY = "leocap-local-dev-secret-key"
$env:DATABASE_URL = "sqlite:///$backendDir\leocap_local.db"

Set-Location $backendDir
Write-Host "Starting Leocap backend server at http://127.0.0.1:5000..."
& $python app.py
