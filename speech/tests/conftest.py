"""
Pytest configuration shared by all speech-module tests.

Ensures the `backend/` directory is on `sys.path` so tests can do
`from speech.xxx import Yyy`, exactly like the rest of the CodeStorm
codebase will.
"""

import sys
from pathlib import Path

_BACKEND_DIR = Path(__file__).resolve().parents[2]
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))
