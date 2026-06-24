# Deployment Guide — Ahadu Bank Digital Banking Evaluation Platform

## Prerequisites
- Docker 24+
- Docker Compose v2+
- Ubuntu 22.04 LTS (production)

## Quick Start (Local Development)

```bash
# 1. Clone repository
git clone https://github.com/your-org/ahadu-bank-eval-platform.git
cd ahadu-bank-eval-platform

# 2. Launch all services
docker-compose up --build

# 3. Access services:
#    Frontend:   http://localhost:3000  (or http://localhost via Nginx)
#    Backend API: http://localhost:8000
#    API Docs:   http://localhost:8000/docs
#    MySQL:      localhost:3306
#    Redis:      localhost:6379
```

## Default Credentials

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@ahadubank.com | Admin@123 |
| Executive | exec@ahadubank.com | Exec@123 |
| Product Manager | pm@ahadubank.com | PM@12345 |
| Data Engineer | de@ahadubank.com | DE@12345 |
| ML Engineer | ml@ahadubank.com | ML@12345 |
| Risk Team | risk@ahadubank.com | Risk@123 |
| Compliance | compliance@ahadubank.com | Comp@123 |

## Production Deployment

### 1. Server Setup (Ubuntu 22.04)
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install docker.io docker-compose-v2 git nginx certbot -y
sudo systemctl enable --now docker
```

### 2. Environment Variables
Edit `backend/.env` and change:
- `JWT_SECRET_KEY` — use a strong random key (min 32 chars)
- `DATABASE_URL` — update password for production
- `MYSQL_ROOT_PASSWORD` and `MYSQL_PASSWORD` in docker-compose.yml

### 3. SSL/TLS (Nginx)
```bash
sudo certbot --nginx -d your-domain.com
```
Copy generated certificates to `./nginx/ssl/`

### 4. Deploy
```bash
docker-compose -f docker-compose.yml up -d --build
docker-compose ps  # Verify all services are running
```

### 5. Verify Health
```bash
curl http://localhost:8000/health
```

## Architecture Diagram

```
Internet → Nginx (80/443) → Frontend (Next.js :3000)
                          → Backend API (FastAPI :8000)
                              ├── MySQL :3306
                              ├── Redis :6379
                              └── Celery Worker
                                    ├── ML Training Tasks
                                    ├── Feature Engineering
                                    └── Report Generation
```

## Data Upload Format

Upload CSV files via Settings → Data Upload. Required columns:
```
product_code, period_date, total_users, active_users,
total_transactions, successful_transactions, failed_transactions,
total_revenue, uptime_percentage, downtime_hours,
total_complaints, resolved_complaints
```

See `database/sample_data.csv` for a complete example.

## ML Pipeline

1. Upload raw data → Settings → Data Upload
2. Feature Engineering runs automatically after upload
3. Train models → Model Management → Train Model
4. Scores are computed automatically (daily via Celery)
5. View results in Dashboard, Products, Rankings

## API Documentation

Interactive API docs available at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Backup

```bash
# Database backup
docker exec ahadu_mysql mysqldump -u ahadu_user -pahadu_pass ahadu_bank_eval > backup_$(date +%Y%m%d).sql

# Restore
docker exec -i ahadu_mysql mysql -u ahadu_user -pahadu_pass ahadu_bank_eval < backup.sql
```
