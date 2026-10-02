from dataclasses import dataclass

import pytest
from fastapi.testclient import TestClient

from app import create_app
from config import Settings


@dataclass
class Clock:
    now: float = 1000

    def __call__(self):
        return self.now

    def advance(self, seconds):
        self.now += seconds


@pytest.fixture
def settings():
    return Settings("smtp.example.com", 587, "test-sender", "test-password",
                    "sender@example.com", "test-only-secret-" * 4, "http://localhost:5173")


@pytest.fixture
def client(settings):
    with TestClient(create_app(settings)) as client:
        yield client
