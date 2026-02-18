from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.config import get_supabase
from app.auth.dependencies import require_admin

router = APIRouter(prefix="/contacts", tags=["contacts"])


class ContactCreate(BaseModel):
    name: str
    mobile_number: str


class ContactUpdate(BaseModel):
    name: str | None = None
    mobile_number: str | None = None


@router.get("/")
def list_contacts(admin: dict = Depends(require_admin)):
    sb = get_supabase()
    result = sb.table("contacts").select("*").execute()
    return result.data


@router.post("/")
def create_contact(req: ContactCreate, admin: dict = Depends(require_admin)):
    sb = get_supabase()
    result = sb.table("contacts").insert(
        {
            "name": req.name,
            "mobile_number": req.mobile_number,
            "created_by": admin["sub"],
        }
    ).execute()
    return result.data[0]


@router.put("/{contact_id}")
def update_contact(
    contact_id: str, req: ContactUpdate, admin: dict = Depends(require_admin)
):
    sb = get_supabase()
    update_data = req.model_dump(exclude_none=True)

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    result = sb.table("contacts").update(update_data).eq("id", contact_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Contact not found")

    return result.data[0]


@router.delete("/{contact_id}")
def delete_contact(contact_id: str, admin: dict = Depends(require_admin)):
    sb = get_supabase()
    result = sb.table("contacts").delete().eq("id", contact_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Contact not found")

    return {"message": "Contact deleted"}
