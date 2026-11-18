import argparse
import getpass
import json
import os
from pathlib import Path

from src.auth import create_password_entry


def main() -> None:
    parser = argparse.ArgumentParser(description="Add a teacher account.")
    parser.add_argument("username", help="Username assigned to the teacher")
    args = parser.parse_args()

    if (
        not args.username.strip()
        or args.username != args.username.strip()
        or ":" in args.username
    ):
        parser.error(
            "Username must not be empty, have surrounding whitespace, or contain ':'."
        )

    credentials_path = Path(
        os.environ.get(
            "TEACHERS_FILE", str(Path(__file__).with_name("teachers.json"))
        )
    )
    if credentials_path.exists():
        try:
            data = json.loads(credentials_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as error:
            parser.error(f"Credentials file contains invalid JSON: {error}")
        if not isinstance(data, dict) or not isinstance(data.get("teachers"), dict):
            parser.error("Credentials file must contain a teachers object.")
    else:
        data = {"teachers": {}}

    if args.username in data["teachers"]:
        parser.error(f"Teacher account {args.username!r} already exists.")

    password = getpass.getpass("Teacher password (at least 12 characters): ")
    if len(password) < 12:
        parser.error("Password must contain at least 12 characters.")
    if password != getpass.getpass("Confirm password: "):
        parser.error("Passwords do not match.")

    data["teachers"][args.username] = create_password_entry(password)
    credentials_path.parent.mkdir(parents=True, exist_ok=True)
    credentials_path.write_text(
        json.dumps(data, indent=2) + "\n", encoding="utf-8"
    )
    if os.name == "posix":
        credentials_path.chmod(0o600)
    print(f"Teacher account {args.username!r} added to {credentials_path}.")


if __name__ == "__main__":
    main()
