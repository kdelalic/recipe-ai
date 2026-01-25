import os
import sys
from typing import AsyncGenerator

import pytest
from httpx import ASGITransport, AsyncClient

# Ensure backend directory is in python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app


@pytest.fixture
def anyio_backend():
    return "asyncio"

@pytest.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    """
    Fixture that exists for the duration of a test to provide a test client.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
