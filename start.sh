#!/bin/bash
# Device Console Application Startup Script
# Usage: ./start.sh [dev|prod] [--no-browser]
# Default mode is dev

set -e

MODE="${1:-dev}"
NO_BROWSER="$2"

if [[ "$MODE" != "dev" && "$MODE" != "prod" ]]; then
    echo "Usage: $0 [dev|prod] [--no-browser]"
    exit 1
fi

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
BUILD_DIR="$PROJECT_ROOT/build"
BIN_DIR="$BUILD_DIR/bin"
WEBROOT_DIR="$PROJECT_ROOT/webroot"

# Color output functions
info() { echo -e "\033[1;36m[*] $1\033[0m"; }
ok() { echo -e "\033[1;32m[+] $1\033[0m"; }
err() { echo -e "\033[1;31m[-] $1\033[0m"; }

echo ""
echo "========================================"
echo "    Device Console Startup Script      "
echo "========================================"
echo ""

if [ "$MODE" = "dev" ]; then
    echo -e "  Mode: \033[1;35mDevelopment\033[0m"
    echo "  Frontend: Vite Dev Server (HMR)"
    echo "  URL: http://localhost:5173"
else
    echo -e "  Mode: \033[1;35mProduction\033[0m"
    echo "  Frontend: Static files (served by backend)"
    echo "  URL: http://localhost"
fi
echo ""

# Stop existing processes
info "Stopping existing processes..."
pkill -f "demo" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
sleep 0.5
ok "Processes cleaned"

# Build frontend first (both dev and prod modes)
info "Building frontend..."
cd "$WEBROOT_DIR"

# Check node_modules
if [ ! -d "node_modules" ]; then
    echo "    Installing dependencies..."
    npm install
fi

if [ "$MODE" = "prod" ]; then
    # Production: full build
    npm run build
    ok "Frontend build complete"

    # Pack frontend files into C source
    info "Packing frontend files..."
    cd "$PROJECT_ROOT"

    # Collect all files recursively from dist
    DIST_FILES=()
    while IFS= read -r -d '' file; do
        rel="${file#webroot/dist/}"
        DIST_FILES+=("$file:web_root/$rel")
    done < <(find webroot/dist -type f -print0)

    # Add cert files if exist
    CERT_FILES=()
    if [ -d "certs" ]; then
        while IFS= read -r -d '' file; do
            name="$(basename "$file")"
            CERT_FILES+=("$file:certs/$name")
        done < <(find certs -maxdepth 1 -type f -print0)
    fi

    # Run pack.js with all files
    node pack.js "${DIST_FILES[@]}" "${CERT_FILES[@]}" > webserver/net/webserver_packedfs.c
    ok "Packed to webserver/net/webserver_packedfs.c"
else
    # Dev mode: just ensure dist exists (Vite dev server will serve it)
    npm run build
    ok "Frontend build complete"
fi

# Compile backend
info "Compiling backend..."

# Ensure build directory exists
if [ ! -d "$BUILD_DIR" ]; then
    mkdir -p "$BUILD_DIR"
fi

cd "$BUILD_DIR"

# Run CMake configure if needed
if [ ! -f "CMakeCache.txt" ]; then
    # Set environment variable for CMake in production mode
    if [ "$MODE" = "prod" ]; then
        export BUILD_PACKED_FS=1
    fi
    cmake ..
fi

# Set environment variable for CMake build in production mode
if [ "$MODE" = "prod" ]; then
    export BUILD_PACKED_FS=1
fi

cmake --build . --target demo
ok "Backend compilation complete"

# Start backend (from project root for correct resource paths)
info "Starting backend service..."
cd "$PROJECT_ROOT"
"$BIN_DIR/demo" &
BACKEND_PID=$!
sleep 1

if ! kill -0 $BACKEND_PID 2>/dev/null; then
    err "Backend failed to start"
    exit 1
fi
ok "Backend started (PID: $BACKEND_PID)"

# Dev mode: start frontend dev server
if [ "$MODE" = "dev" ]; then
    info "Starting frontend dev server..."
    cd "$WEBROOT_DIR"

    # Check node_modules
    if [ ! -d "node_modules" ]; then
        echo "    Installing dependencies..."
        npm install
    fi

    npm run dev &
    FRONTEND_PID=$!
    sleep 2
    ok "Frontend started (PID: $FRONTEND_PID)"
fi

# Open browser
if [ "$NO_BROWSER" != "--no-browser" ]; then
    info "Opening browser..."
    if [ "$MODE" = "dev" ]; then
        xdg-open "http://localhost:5173" 2>/dev/null || open "http://localhost:5173" 2>/dev/null || true
    else
        xdg-open "http://localhost" 2>/dev/null || open "http://localhost" 2>/dev/null || true
    fi
fi

echo ""
echo "========================================"
ok "Startup complete!"
echo ""
if [ "$MODE" = "dev" ]; then
    echo -e "  Frontend: \033[1;36mhttp://localhost:5173\033[0m"
    echo -e "  Backend:  \033[1;36mhttp://localhost\033[0m"
else
    echo -e "  URL: \033[1;36mhttp://localhost\033[0m"
fi
echo ""
echo -e "  \033[1;33mPress Ctrl+C to stop services\033[0m"
echo "========================================"
echo ""

# Cleanup function
cleanup() {
    echo ""
    info "Stopping services..."
    kill $BACKEND_PID 2>/dev/null || true
    [ -n "$FRONTEND_PID" ] && kill $FRONTEND_PID 2>/dev/null || true
    pkill -P $$ 2>/dev/null || true
    ok "Services stopped"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Monitor process status
echo "Services running... (Press Ctrl+C to stop)"
while true; do
    if ! kill -0 $BACKEND_PID 2>/dev/null; then
        err "Backend service stopped unexpectedly"
        cleanup
    fi
    sleep 2
done
