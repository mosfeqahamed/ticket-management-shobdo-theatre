from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.config import get_supabase
from app.auth.dependencies import (
    hash_password,
    verify_password,
    create_token,
    require_admin,
)

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    email: str
    password: str


class CreateSubAdminRequest(BaseModel):
    email: str
    password: str


@router.post("/login")
def login(req: LoginRequest):
    sb = get_supabase()
    result = sb.table("users").select("*").eq("email", req.email).execute()

    if not result.data:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    user = result.data[0]

    if not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_token(user["id"], user["role"])
    return {"access_token": token, "role": user["role"]}


@router.post("/sub-admin")
def create_sub_admin(req: CreateSubAdminRequest, admin: dict = Depends(require_admin)):
    sb = get_supabase()

    existing = sb.table("users").select("id").eq("email", req.email).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="Email already exists")

    sb.table("users").insert(
        {
            "email": req.email,
            "password_hash": hash_password(req.password),
            "role": "sub-admin",
        }
    ).execute()

    return {"message": "Sub-admin created"}
