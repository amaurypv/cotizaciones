import subprocess
import signal
import sys
import time
import os
import threading
import webbrowser
import shutil

processes = []
opened_browser = False

# Prioritize common paths
extra_paths = [
    "/usr/local/bin", 
    "/usr/bin",
    "/bin",
    "/usr/sbin",
    "/sbin"
]
if sys.platform == 'darwin': # Add Mac specifics only if on Mac
    extra_paths.extend([
        "/opt/homebrew/bin",
        "/Users/amauryperezverdejo/.nvm/versions/node/v22.21.1/bin"
    ])

def get_binary(name):
    """Find a binary in the system PATH, prioritizing our extra_paths."""
    for p in extra_paths:
        candidate = os.path.join(p, name)
        if os.path.exists(candidate) and os.access(candidate, os.X_OK):
            return candidate
    return shutil.which(name) or name

def kill_ports():
    print("Cleaning up ports 8000 and 5173...")
    try:
        if sys.platform == 'darwin': # macOS
            subprocess.run("lsof -ti :8000,5173 | xargs kill -9", shell=True, stderr=subprocess.DEVNULL)
        else: # Linux
            # Try fuser first, then lsof
            subprocess.run("fuser -k 8000/tcp 5173/tcp", shell=True, stderr=subprocess.DEVNULL)
    except Exception as e:
        print(f"Warning during cleanup: {e}")

def stream_output(pipe, prefix):
    global opened_browser
    while True:
        line = pipe.readline()
        if not line:
            break
        clean_line = line.strip()
        print(f"[{prefix}] {clean_line}") # Print every line including empty ones
        sys.stdout.flush()
        
        # Detect Vite URL
        if ("127.0.0.1:5173" in clean_line or "localhost:5173" in clean_line) and not opened_browser:
            print(f"[MANAGER] Vite is ready. Opening browser...")
            time.sleep(2) # Aumentar a 2 segundos
            webbrowser.open("http://127.0.0.1:5173")
            opened_browser = True
    pipe.close()

def signal_handler(sig, frame):
    print("\nStopping processes...")
    for p in processes:
        try:
            p.terminate()
        except:
            pass
    time.sleep(1)
    for p in processes:
        try:
            if p.poll() is None:
                p.kill()
        except:
            pass
    sys.exit(0)

def start():
    kill_ports()
    signal.signal(signal.SIGINT, signal_handler)
    
    # Try specifically for Anaconda python first
    python_bin = get_binary("python3")
    npx_bin = get_binary("npx")
    
    print(f"Manager PATH: {os.environ['PATH']}")
    print(f"Using Python: {python_bin}")
    print(f"Using NPX: {npx_bin}")

    print("Starting Backend (Port 8000)...")
    # Use arch -arm64 if on M1/M2 to ensure correct architecture if needed, 
    # but let's try direct first with the correct binary.
    backend = subprocess.Popen([python_bin, "backend.py"], 
                               stdout=subprocess.PIPE, 
                               stderr=subprocess.STDOUT,
                               text=True,
                               env=os.environ.copy(),
                               bufsize=1)
    processes.append(backend)
    
    print("Starting Frontend (Port 5173)...")
    frontend = subprocess.Popen("npx vite --clearScreen false", 
                                shell=True,
                                stdout=subprocess.PIPE, 
                                stderr=subprocess.STDOUT,
                                text=True,
                                env=os.environ.copy(),
                                bufsize=1)
    processes.append(frontend)

    t1 = threading.Thread(target=stream_output, args=(backend.stdout, "BACKEND"), daemon=True)
    t2 = threading.Thread(target=stream_output, args=(frontend.stdout, "FRONTEND"), daemon=True)
    t1.start()
    t2.start()

    while True:
        if backend.poll() is not None:
            print("[MANAGER] Backend stopped.")
            break
        if frontend.poll() is not None:
            print("[MANAGER] Frontend stopped.")
            break
        time.sleep(1)

    signal_handler(None, None)

if __name__ == "__main__":
    start()
