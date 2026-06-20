"""MySQL connectivity check — called from start.bat"""
import sys
try:
    import pymysql
    conn = pymysql.connect(
        host="localhost",
        user="root",
        password="",
        database="ahadu_bank_eval",
        connect_timeout=3,
    )
    conn.close()
    print("[OK] MySQL connected (ahadu_bank_eval)")
    sys.exit(0)
except Exception as e:
    print(f"[WARN] MySQL: {e}")
    sys.exit(1)
