from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException
from app.config import get_supabase
from app.auth.dependencies import require_admin
from app.sms.service import send_sms

router = APIRouter(prefix="/sms", tags=["sms"])


@router.post("/send/{drama_id}")
def manual_send(drama_id: str, admin: dict = Depends(require_admin)):
    sb = get_supabase()

    drama = sb.table("dramas").select("*").eq("id", drama_id).execute()
    if not drama.data:
        raise HTTPException(status_code=404, detail="Drama not found")

    drama = drama.data[0]
    contacts = sb.table("contacts").select("*").execute()

    sent_count = 0
    for contact in contacts.data:
        try:
            request_id = send_sms(contact["mobile_number"], drama["custom_sms"])
            sb.table("sms_logs").insert(
                {
                    "drama_id": drama_id,
                    "contact_id": contact["id"],
                    "status": "sent",
                    "sms_request_id": request_id,
                }
            ).execute()
            sent_count += 1
        except Exception as e:
            sb.table("sms_logs").insert(
                {
                    "drama_id": drama_id,
                    "contact_id": contact["id"],
                    "status": "failed",
                    "error": str(e),
                }
            ).execute()

    return {"message": f"SMS sent to {sent_count}/{len(contacts.data)} contacts"}


@router.get("/scheduled")
def scheduled_send():
    sb = get_supabase()
    target_date = (datetime.now(timezone.utc) + timedelta(days=2)).strftime("%Y-%m-%d")

    dramas = sb.table("dramas").select("*").eq("display_date", target_date).execute()

    if not dramas.data:
        return {"message": "No dramas scheduled for sending today"}

    contacts = sb.table("contacts").select("*").execute()

    if not contacts.data:
        return {"message": "No contacts in database"}

    total_sent = 0
    for drama in dramas.data:
        for contact in contacts.data:
            already_sent = (
                sb.table("sms_logs")
                .select("id")
                .eq("drama_id", drama["id"])
                .eq("contact_id", contact["id"])
                .eq("status", "sent")
                .execute()
            )

            if already_sent.data:
                continue

            try:
                request_id = send_sms(contact["mobile_number"], drama["custom_sms"])
                sb.table("sms_logs").insert(
                    {
                        "drama_id": drama["id"],
                        "contact_id": contact["id"],
                        "status": "sent",
                        "sms_request_id": request_id,
                    }
                ).execute()
                total_sent += 1
            except Exception as e:
                sb.table("sms_logs").insert(
                    {
                        "drama_id": drama["id"],
                        "contact_id": contact["id"],
                        "status": "failed",
                        "error": str(e),
                    }
                ).execute()

    return {"message": f"Scheduled send complete. {total_sent} SMS sent."}
