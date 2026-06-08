# AHADU PULSE — Quick Start

## Prerequisites (one-time setup)

1. **XAMPP** — Start MySQL in XAMPP Control Panel
2. **Python 3.11+** — [python.org](https://www.python.org/downloads/)  
   During install: ✅ check "Add Python to PATH"
3. **Node.js 18+** — [nodejs.org](https://nodejs.org)
4. **Database** — import `database/init.sql` into phpMyAdmin as `ahadu_bank_eval`

---

## Start the Application

### Option A — Double-click (easiest)
```
Double-click:  start.bat
```

### Option B — PowerShell
```powershell
# Right-click start.ps1 → "Run with PowerShell"
# Or in terminal:
powershell -ExecutionPolicy Bypass -File start.ps1
```

This will:
1. Check Python + Node.js are installed
2. Check MySQL is running
3. Install backend packages (first run only)
4. Install frontend packages (first run only)
5. Open **Backend** in a new window → `http://localhost:8000`
6. Open **Frontend** in a new window → `http://localhost:3000`

---

## Stop the Application

```
Double-click:  stop.bat
```
Or simply close the two terminal windows.

---

## Access Points

| Service | URL |
|---------|-----|
| **Dashboard** | http://localhost:3000 |
| **API Docs** | http://localhost:8000/docs |
| **Backend Health** | http://localhost:8000/health |

---

## Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@ahadubank.com | Admin@123 |
| Executive | exec@ahadubank.com | Exec@123 |
| Product Manager | pm@ahadubank.com | PM@12345 |
| Data Engineer | de@ahadubank.com | DE@12345 |
| ML Engineer | ml@ahadubank.com | ML@12345 |

---

## Retrain ML Models (optional)

```bash
py ../backend/train_models.py --skip-grid-search
```

---

## Troubleshooting

**Backend won't start — MySQL error**  
→ Open XAMPP, click Start next to MySQL

**"Module not found" error**  
→ Run: `py -m pip install -r ../backend/requirements.txt`

**Frontend shows blank page**  
→ Wait 10–15 seconds for Next.js to compile on first start

**Port already in use**  
→ Run `stop.bat` first, then `start.bat`
