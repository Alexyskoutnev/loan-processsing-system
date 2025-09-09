import json
import logging
from typing import Any, cast


def safe_json_loads(s: str) -> dict[str, Any]:
    s = s.strip()
    if s.startswith("```"):
        lines = s.splitlines()
        if lines and lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]
        s = "\n".join(lines).strip()

    try:
        obj = cast(dict[str, Any], json.loads(s))
        return obj
    except Exception as e:
        logging.error(f"JSON parse failed: {e}; raw={s[:500]}")
        raise
