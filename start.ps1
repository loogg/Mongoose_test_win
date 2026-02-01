# Device Console Application Startup Script
# Usage: .\start.ps1 [-Mode dev|prod] [-NoBrowser]
# Default mode is dev

param(
    [ValidateSet("dev", "prod")]
    [string]$Mode = "dev",
    [switch]$NoBrowser
)

$ProjectRoot = $PSScriptRoot
$BuildDir = Join-Path $ProjectRoot "build"
$BinDir = Join-Path $BuildDir "bin"
$WebRootDir = Join-Path $ProjectRoot "webroot"

# Color output functions
function Write-Step { param($msg) Write-Host "[*] $msg" -ForegroundColor Cyan }
function Write-OK { param($msg) Write-Host "[+] $msg" -ForegroundColor Green }
function Write-Err { param($msg) Write-Host "[-] $msg" -ForegroundColor Red }
function Write-Info { param($msg) Write-Host "    $msg" -ForegroundColor Gray }

Write-Host ""
Write-Host "========================================" -ForegroundColor Yellow
Write-Host "    Device Console Startup Script      " -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""

if ($Mode -eq "dev") {
    Write-Host "  Mode: Development" -ForegroundColor Magenta
    Write-Host "  Frontend: Vite Dev Server (HMR)" -ForegroundColor Gray
    Write-Host "  URL: http://localhost:5173" -ForegroundColor Gray
} else {
    Write-Host "  Mode: Production" -ForegroundColor Magenta
    Write-Host "  Frontend: Static files (served by backend)" -ForegroundColor Gray
    Write-Host "  URL: http://localhost" -ForegroundColor Gray
}
Write-Host ""

# Stop existing processes
Write-Step "Stopping existing processes..."
Stop-Process -Name "demo" -ErrorAction SilentlyContinue
Stop-Process -Name "node" -ErrorAction SilentlyContinue
Start-Sleep -Milliseconds 500
Write-OK "Processes cleaned"

# Set MinGW environment
$env:Path = "D:\msys64\mingw64\bin;" + $env:Path

# Build frontend first (both dev and prod modes)
Write-Step "Building frontend..."
Push-Location $WebRootDir

# Check node_modules
if (-not (Test-Path "node_modules")) {
    Write-Info "Installing dependencies..."
    npm install
}

if ($Mode -eq "prod") {
    # Production: full build
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Err "Frontend build failed"
        Pop-Location
        Read-Host "Press Enter to exit"
        exit 1
    }
    Write-OK "Frontend build complete"
    Pop-Location

    # Pack frontend files into C source
    Write-Step "Packing frontend files..."
    Push-Location $ProjectRoot

    # Collect all files using glob patterns (PowerShell style)
    $distFiles = Get-ChildItem "webroot/dist" -Recurse -File | ForEach-Object {
        $rel = $_.FullName.Replace("$PWD\", "").Replace("\", "/")
        "$($rel):web_root/$($rel.Replace('webroot/dist/', ''))"
    }

    $certFiles = @()
    if (Test-Path "certs") {
        $certFiles = Get-ChildItem "certs" -File | ForEach-Object {
            "certs/$($_.Name):certs/$($_.Name)"
        }
    }

    # Run pack.js with all file arguments
    & node pack.js ($distFiles + $certFiles) | Out-File "webserver/net/webserver_packedfs.c" -Encoding utf8
    Write-OK "Packed to webserver/net/webserver_packedfs.c"
    Pop-Location
} else {
    # Dev mode: just ensure dist exists (Vite dev server will serve it)
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Err "Frontend build failed"
        Pop-Location
        Read-Host "Press Enter to exit"
        exit 1
    }
    Write-OK "Frontend build complete"
    Pop-Location
}

# Compile backend
Write-Step "Compiling backend..."

# Ensure build directory exists
if (-not (Test-Path $BuildDir)) {
    New-Item -ItemType Directory -Path $BuildDir -Force | Out-Null
}

Push-Location $BuildDir

# Run CMake configure if needed
if (-not (Test-Path "CMakeCache.txt")) {
    # Set environment variable for CMake in production mode
    if ($Mode -eq "prod") {
        $env:BUILD_PACKED_FS = "1"
    }
    cmake ..
}

# Set environment variable for CMake build in production mode
if ($Mode -eq "prod") {
    $env:BUILD_PACKED_FS = "1"
}

cmake --build . --target demo
if ($LASTEXITCODE -ne 0) {
    Write-Err "Backend compilation failed"
    Pop-Location
    Read-Host "Press Enter to exit"
    exit 1
}
Write-OK "Backend compilation complete"
Pop-Location

# Start backend (from project root for correct resource paths)
Write-Step "Starting backend service..."
Push-Location $ProjectRoot
$backendProcess = Start-Process -FilePath (Join-Path $BinDir "demo.exe") -PassThru -WindowStyle Normal
Pop-Location
Start-Sleep -Seconds 1

if ($backendProcess.HasExited) {
    Write-Err "Backend failed to start"
    Read-Host "Press Enter to exit"
    exit 1
}
Write-OK "Backend started (PID: $($backendProcess.Id))"

# Dev mode: start frontend dev server
if ($Mode -eq "dev") {
    Write-Step "Starting frontend dev server..."
    Push-Location $WebRootDir

    # Check node_modules
    if (-not (Test-Path "node_modules")) {
        Write-Info "Installing dependencies..."
        npm install
    }

    $frontendProcess = Start-Process -FilePath "npm" -ArgumentList "run", "dev" -PassThru -WindowStyle Normal
    Pop-Location
    Start-Sleep -Seconds 2
    Write-OK "Frontend started (PID: $($frontendProcess.Id))"
}

# Open browser
if (-not $NoBrowser) {
    Write-Step "Opening browser..."
    if ($Mode -eq "dev") {
        Start-Process "http://localhost:5173"
    } else {
        Start-Process "http://localhost"
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-OK "Startup complete!"
Write-Host ""
if ($Mode -eq "dev") {
    Write-Host "  Frontend: " -NoNewline; Write-Host "http://localhost:5173" -ForegroundColor Cyan
    Write-Host "  Backend:  " -NoNewline; Write-Host "http://localhost" -ForegroundColor Cyan
} else {
    Write-Host "  URL: " -NoNewline; Write-Host "http://localhost" -ForegroundColor Cyan
}
Write-Host ""
Write-Host "  Press Ctrl+C to stop services" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Register Ctrl+C cleanup
$null = Register-EngineEvent -SourceIdentifier PowerShell.Exiting -Action {
    Stop-Process -Name "demo" -ErrorAction SilentlyContinue
    Stop-Process -Name "node" -ErrorAction SilentlyContinue
}

try {
    # Monitor process status
    Write-Host "Services running... (Press Ctrl+C to stop)" -ForegroundColor Gray
    while ($true) {
        $demoRunning = Get-Process -Name "demo" -ErrorAction SilentlyContinue
        if (-not $demoRunning) {
            Write-Err "Backend service stopped unexpectedly"
            break
        }
        Start-Sleep -Seconds 2
    }
} finally {
    # Cleanup processes
    Write-Step "Stopping services..."
    Stop-Process -Name "demo" -ErrorAction SilentlyContinue
    Stop-Process -Name "node" -ErrorAction SilentlyContinue
    Write-OK "Services stopped"
}
