import httpx
from app.config import SMS_API_KEY, SMS_API_URL, SMS_SENDER_ID


def send_sms(to: str, body: str) -> str:
    """Send SMS via SMS.NET.BD API. Returns the request_id on success."""
    params = {
        "api_key": SMS_API_KEY,
        "msg": body,
        "to": to,
    }
    if SMS_SENDER_ID:
        params["sender_id"] = SMS_SENDER_ID

    response = httpx.post(SMS_API_URL, data=params, timeout=30)
    result = response.json()

    if result.get("error") != 0:
        raise Exception(result.get("msg", "SMS sending failed"))

    return str(result["data"]["request_id"])
