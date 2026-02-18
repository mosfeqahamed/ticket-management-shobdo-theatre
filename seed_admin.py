import os
import bcrypt
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

sb = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_ROLE_KEY"))

ADMIN_EMAIL = "mosfeq.2012@gmail.com"
ADMIN_PASSWORD = "Osmanhadi1234"

hashed = bcrypt.hashpw(ADMIN_PASSWORD.encode(), bcrypt.gensalt()).decode()

sb.table("users").insert(
    {
        "email": ADMIN_EMAIL,
        "password_hash": hashed,
        "role": "admin",
    }
).execute()

print(f"Admin created: {ADMIN_EMAIL}")
