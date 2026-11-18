import hashlib
import hmac
import json
import os
import secrets
from pathlib import Path

from fastapi import HTTPException

PASSWORD_ITERATIONS = 600_000


def create_password_entry(password: str) -> dict[str, str]:
    salt = secrets.token_bytes(16)
    password_hash = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt, PASSWORD_ITERATIONS
    )
    return {"salt": salt.hex(), "password_hash": password_hash.hex()}


def _load_teacher_records() -> dict[str, dict[str, str]]:
    credentials_path = Path(
        os.environ.get(
            "TEACHERS_FILE", str(Path(__file__).with_name("teachers.json"))
        )
    )
    try:
        contents = credentials_path.read_text(encoding="utf-8")
    except FileNotFoundError as error:
        raise HTTPException(
            status_code=503,
            detail="Teacher login is not configured. Create a teacher account first.",
        ) from error

    try:
        data = json.loads(contents)
    except json.JSONDecodeError as error:
        raise RuntimeError("Teacher credentials file contains invalid JSON.") from error

    records = data.get("teachers") if isinstance(data, dict) else None
    if not isinstance(records, dict):
        raise RuntimeError("Teacher credentials file must contain a teachers object.")

    for username, record in records.items():
        if (
            not isinstance(username, str)
            or not username.strip()
            or not isinstance(record, dict)
            or not isinstance(record.get("salt"), str)
            or not isinstance(record.get("password_hash"), str)
        ):
            raise RuntimeError("Teacher credentials file contains an invalid entry.")
        try:
            salt = bytes.fromhex(record["salt"])
            password_hash = bytes.fromhex(record["password_hash"])
        except ValueError as error:
            raise RuntimeError(
                "Teacher credentials file contains an invalid password hash."
            ) from error
        if len(salt) != 16 or len(password_hash) != 32:
            raise RuntimeError(
                "Teacher credentials file contains an invalid password hash."
            )

    return records


def verify_teacher_credentials(username: str, password: str) -> bool:
    record = _load_teacher_records().get(username)
    if record is None:
        return False

    password_hash = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        bytes.fromhex(record["salt"]),
        PASSWORD_ITERATIONS,
    ).hex()
    return hmac.compare_digest(password_hash, record["password_hash"])
