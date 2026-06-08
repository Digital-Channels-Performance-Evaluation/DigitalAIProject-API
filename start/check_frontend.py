"""Check if frontend node_modules exists."""
import sys
import os

frontend = os.path.normpath(
    os.path.join(os.path.dirname(__file__), "..", "frontend", "node_modules")
)
if os.path.isdir(frontend):
    print("[OK] Frontend packages ready.")
    sys.exit(0)
else:
    print("[..] Frontend node_modules not found.")
    sys.exit(1)
