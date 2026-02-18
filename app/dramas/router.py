from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.config import get_supabase
from app.auth.dependencies import require_admin, require_admin_or_subadmin

router = APIRouter(prefix="/dramas", tags=["dramas"])


class DramaCreate(BaseModel):
    drama_name: str
    display_date: str
    custom_sms: str


class DramaUpdate(BaseModel):
    drama_name: str | None = None
    display_date: str | None = None
    custom_sms: str | None = None


@router.get("/")
def list_dramas(user: dict = Depends(require_admin_or_subadmin)):
    sb = get_supabase()
    result = sb.table("dramas").select("*").execute()
    return result.data


@router.post("/")
def create_drama(req: DramaCreate, admin: dict = Depends(require_admin)):
    sb = get_supabase()
    result = sb.table("dramas").insert(
        {
            "drama_name": req.drama_name,
            "display_date": req.display_date,
            "custom_sms": req.custom_sms,
            "created_by": admin["sub"],
        }
    ).execute()
    return result.data[0]


@router.put("/{drama_id}")
def update_drama(
    drama_id: str, req: DramaUpdate, user: dict = Depends(require_admin_or_subadmin)
):
    sb = get_supabase()
    update_data = req.model_dump(exclude_none=True)

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    update_data["updated_by"] = user["sub"]

    if "display_date" in update_data:
        sb.table("sms_logs").delete().eq("drama_id", drama_id).execute()

    result = sb.table("dramas").update(update_data).eq("id", drama_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Drama not found")

    return result.data[0]


@router.delete("/{drama_id}")
def delete_drama(drama_id: str, admin: dict = Depends(require_admin)):
    sb = get_supabase()
    sb.table("sms_logs").delete().eq("drama_id", drama_id).execute()
    result = sb.table("dramas").delete().eq("id", drama_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Drama not found")

    return {"message": "Drama deleted"}
