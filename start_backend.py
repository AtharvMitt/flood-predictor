#!/usr/bin/env python3
"""
Startup script for the FastAPI backend
"""

import subprocess
import sys
import os

# Set UTF-8 encoding for Windows console
if sys.platform == "win32":
    import codecs
    sys.stdout = codecs.getwriter("utf-8")(sys.stdout.detach())
    sys.stderr = codecs.getwriter("utf-8")(sys.stderr.detach())

def install_requirements():
    """Install required packages"""
    print("Installing Python dependencies...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
        print("Dependencies installed successfully!")
        return True
    except subprocess.CalledProcessError as e:
        print(f"Failed to install dependencies: {e}")
        return False

def start_backend():
    """Start the FastAPI backend server"""
    print("Starting FastAPI backend server...")
    print("Backend will be available at: http://localhost:8000")
    print("API documentation at: http://localhost:8000/docs")
    print("Press Ctrl+C to stop the server")
    
    try:
        # Change to backend directory
        backend_dir = os.path.join(os.path.dirname(__file__), "backend")
        os.chdir(backend_dir)
        
        # Start uvicorn server
        subprocess.run([
            sys.executable, "-m", "uvicorn", 
            "main:app", 
            "--host", "0.0.0.0", 
            "--port", "8000", 
            "--reload"
        ])
    except KeyboardInterrupt:
        print("\nBackend server stopped.")
    except Exception as e:
        print(f"Failed to start backend: {e}")

if __name__ == "__main__":
    print("Bengaluru Flood Prediction System - Backend Startup")
    print("=" * 50)
    
    if install_requirements():
        start_backend()
    else:
        print("Failed to start backend due to dependency issues.")
        sys.exit(1)
