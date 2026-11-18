import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi import HTTPException

from src.app import app, require_teacher
from src.auth import create_password_entry, verify_teacher_credentials


class TeacherAuthenticationTests(unittest.TestCase):
    def test_password_entry_verifies_only_matching_password(self):
        record = create_password_entry("correct horse battery staple")
        self.assertNotEqual(record["password_hash"], "correct horse battery staple")
        self.assertTrue(
            self._verify_record("teacher", "correct horse battery staple", record)
        )
        self.assertFalse(self._verify_record("teacher", "wrong password", record))

    def test_teacher_credentials_are_read_from_configured_json_file(self):
        record = create_password_entry("correct horse battery staple")
        with tempfile.TemporaryDirectory() as directory:
            credentials_file = Path(directory) / "teachers.json"
            credentials_file.write_text(
                json.dumps({"teachers": {"teacher": record}}), encoding="utf-8"
            )
            with patch.dict(os.environ, {"TEACHERS_FILE": str(credentials_file)}):
                self.assertTrue(
                    verify_teacher_credentials(
                        "teacher", "correct horse battery staple"
                    )
                )
                self.assertFalse(
                    verify_teacher_credentials("student", "correct horse battery staple")
                )

    def test_missing_teacher_config_returns_service_unavailable(self):
        with tempfile.TemporaryDirectory() as directory:
            missing_file = Path(directory) / "missing.json"
            with patch.dict(os.environ, {"TEACHERS_FILE": str(missing_file)}):
                with self.assertRaises(HTTPException) as error:
                    verify_teacher_credentials("teacher", "password")
        self.assertEqual(error.exception.status_code, 503)

    def test_write_routes_require_teacher_but_activity_listing_is_public(self):
        protected_paths = {
            "/auth/login",
            "/activities/{activity_name}/signup",
            "/activities/{activity_name}/unregister",
        }
        for route in app.routes:
            if getattr(route, "path", None) in protected_paths:
                dependencies = [dependency.call for dependency in route.dependant.dependencies]
                self.assertIn(require_teacher, dependencies)

        activities_route = next(
            route for route in app.routes if getattr(route, "path", None) == "/activities"
        )
        dependencies = [
            dependency.call for dependency in activities_route.dependant.dependencies
        ]
        self.assertNotIn(require_teacher, dependencies)

    def _verify_record(self, username, password, record):
        with tempfile.TemporaryDirectory() as directory:
            credentials_file = Path(directory) / "teachers.json"
            credentials_file.write_text(
                json.dumps({"teachers": {username: record}}), encoding="utf-8"
            )
            with patch.dict(os.environ, {"TEACHERS_FILE": str(credentials_file)}):
                return verify_teacher_credentials(username, password)


if __name__ == "__main__":
    unittest.main()
