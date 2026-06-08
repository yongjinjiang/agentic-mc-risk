"""
Structured, append-only audit log.

Every action the agent takes (plan, tool call, human decision, report) is
written as one JSON line with a UTC timestamp and the exact parameters used.
This is what makes an agentic workflow defensible in a regulated environment:
any output can be traced back to its inputs, seed, and the human who approved it.
"""

from __future__ import annotations
import json
import hashlib
from datetime import datetime, timezone
from pathlib import Path


class AuditLog:
    def __init__(self, path: str = "audit_log.jsonl"):
        self.path = Path(path)

    def record(self, actor: str, action: str, payload: dict) -> dict:
        event = {
            "ts": datetime.now(timezone.utc).isoformat(),
            "actor": actor,          # "agent" | "human" | "tool"
            "action": action,
            "payload": payload,
            "payload_hash": hashlib.sha256(
                json.dumps(payload, sort_keys=True, default=str).encode()
            ).hexdigest()[:12],
        }
        with self.path.open("a") as f:
            f.write(json.dumps(event, default=str) + "\n")
        return event
