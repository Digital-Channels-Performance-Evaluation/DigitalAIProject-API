import sys, requests
sys.path.insert(0,'g:/Projects/ahadu_digital_performance_model/backend')

r = requests.post('http://localhost:8000/api/v1/auth/login/json',
                  json={'email':'gedefayeanteneh07@gmail.com','password':'Admin@1234'})
token = r.json()['access_token']
h = {'Authorization': f'Bearer {token}'}

# Test report
r2 = requests.get('http://localhost:8000/api/v1/report/data?model_id=26', headers=h)
print('Report:', r2.status_code)
if r2.status_code == 200:
    d = r2.json()
    print('Avg score:', d['summary']['avg_score'])
    print('Channels:')
    for ch in d['channels']:
        print(f"  {ch['product_id']}: score={ch['score']} tier={ch['tier']}")
else:
    print('Error:', r2.text[:300])

# Test analytics
for path in ['channels-overview', 'data-profile/25', 'confusion-matrix/26']:
    r3 = requests.get(f'http://localhost:8000/api/v1/analytics/{path}', headers=h)
    print(f'Analytics {path}: {r3.status_code}')
