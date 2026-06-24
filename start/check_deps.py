"""Check if backend Python packages are installed."""
import sys
try:
    import fastapi
    print("[OK] Backend packages ready.")
    sys.exit(0)
except ImportError:
    print("[..] Backend packages not installed.")
    sys.exit(1)
