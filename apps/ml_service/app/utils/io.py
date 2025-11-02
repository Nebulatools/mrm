from __future__ import annotations

import json
from pathlib import Path
from typing import Any


def ensure_directory(path: Path) -> Path:
    """
    Create (if needed) the directory pointed by ``path`` and return it.

    Parameters
    ----------
    path:
        Directory path to ensure.
    """
    path.mkdir(parents=True, exist_ok=True)
    return path


def write_json(path: Path, payload: Any) -> None:
    """
    Persist a JSON serialisable payload to disk ensuring parent directory exists.
    """
    ensure_directory(path.parent)
    with path.open('w', encoding='utf-8') as fh:
        json.dump(payload, fh, ensure_ascii=False, indent=2, sort_keys=True)


def read_json(path: Path, default: Any | None = None) -> Any:
    """
    Read a JSON file if it exists, otherwise return the provided default.
    """
    if not path.exists():
        return default
    with path.open('r', encoding='utf-8') as fh:
        return json.load(fh)
