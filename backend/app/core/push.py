import requests
from typing import List, Optional

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


def send_expo_push(tokens: List[str], title: str, body: str, data: Optional[dict] = None):
    valid = [t for t in tokens if t and t.startswith("ExponentPushToken")]
    if not valid:
        return
    messages = [
        {"to": t, "title": title, "body": body, "data": data or {}, "sound": "default"}
        for t in valid
    ]
    try:
        requests.post(EXPO_PUSH_URL, json=messages, timeout=5)
    except Exception:
        pass
