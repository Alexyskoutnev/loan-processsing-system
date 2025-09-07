import base64

def _b64encode(b: bytes) -> str:
    return base64.b64encode(b).decode("utf-8")

def _b64decode(s: str) -> bytes:
    return base64.b64decode(s.encode("utf-8"))
