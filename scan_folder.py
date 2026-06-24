"""
Scan data folder and train models
"""
import requests

# Configuration
BASE_URL = "http://localhost:8000/api/v1"
EMAIL = "admin@ahadubank.com"  # Change this to your email
PASSWORD = "admin123"  # Change this to your password

print("🔐 Logging in...")
try:
    response = requests.post(f'{BASE_URL}/auth/login', json={
        'email': EMAIL,
        'password': PASSWORD
    })
    response.raise_for_status()
    token = response.json()['access_token']
    print("✅ Logged in successfully!")
except Exception as e:
    print(f"❌ Login failed: {e}")
    print("Please update EMAIL and PASSWORD in scan_folder.py")
    exit(1)

# Scan folder
headers = {'Authorization': f'Bearer {token}'}

print("\n📂 Scanning data folder...")
try:
    scan = requests.post(f'{BASE_URL}/upload/scan-folder', headers=headers)
    scan.raise_for_status()
    result = scan.json()
    print("✅ Scan complete!")
    print(f"   Scanned folder: {result['scanned_folder']}")
    print(f"   Files found: {result['files_found']}")
    print(f"   Files processed: {result['files_processed']}")
    
    if result['files_processed'] == 0:
        print("\n⚠️  No new files to process. Files may already be processed or no files in raw folder.")
        print(f"   Check: backend\\data\\raw\\ folder")
    else:
        print("\n📋 Results:")
        for item in result.get('results', []):
            status = "✅" if item['status'] == 'success' else "❌"
            print(f"   {status} {item['file']} - {item['action']}")
    
except Exception as e:
    print(f"❌ Scan failed: {e}")
    exit(1)

# Train models
print("\n🤖 Training models...")
try:
    train = requests.post('http://localhost:8000/api/ml/train-all', headers=headers)
    train.raise_for_status()
    train_result = train.json()
    print("✅ Training started!")
    print(f"   Task ID: {train_result.get('task_id')}")
    print(f"   Mode: {train_result.get('mode')}")
    print(f"   Message: {train_result.get('message')}")
    print("\n⏳ Training is running in the background. Check logs or dashboard for progress.")
except Exception as e:
    print(f"❌ Training failed: {e}")
    exit(1)

print("\n🎉 All done!")
print("   1. Data scanned and processed")
print("   2. Models are training in background")
print("   3. Check dashboard or logs for progress")
