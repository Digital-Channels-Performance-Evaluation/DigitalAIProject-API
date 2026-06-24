"""
Fix user role to allow model training
Run this to update your user to super_admin role
"""
from sqlalchemy import create_engine, text
from app.core.config import settings

# Your email
USER_EMAIL = "admin@ahadubank.com"  # Update if different

print("=" * 50)
print("  Updating User Role")
print("=" * 50)
print()

try:
    engine = create_engine(settings.DATABASE_URL)
    
    with engine.connect() as conn:
        # Check current role
        result = conn.execute(
            text("SELECT id, email, role FROM users WHERE email = :email"),
            {"email": USER_EMAIL}
        )
        user = result.fetchone()
        
        if not user:
            print(f"❌ User not found: {USER_EMAIL}")
            print("   Please check the email address")
            exit(1)
        
        print(f"Current user:")
        print(f"  ID: {user[0]}")
        print(f"  Email: {user[1]}")
        print(f"  Current Role: {user[2]}")
        print()
        
        # Update to super_admin
        conn.execute(
            text("UPDATE users SET role = 'super_admin' WHERE email = :email"),
            {"email": USER_EMAIL}
        )
        conn.commit()
        
        print(f"✅ SUCCESS!")
        print(f"   Updated {USER_EMAIL} to 'super_admin'")
        print()
        print("You can now:")
        print("  - Train models")
        print("  - Manage users")
        print("  - Access all features")
        print()
        
except Exception as e:
    print(f"❌ Error: {e}")
    print()
    print("Make sure:")
    print("  - Backend is running")
    print("  - Database is accessible")
    exit(1)
