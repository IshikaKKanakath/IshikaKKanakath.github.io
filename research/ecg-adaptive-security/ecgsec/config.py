"""Frozen experiment config with module hashes (proposal step 1, 'done when').

Usage:
    cfg = load_config("configs/default.yaml")
    freeze(cfg, pipeline, out="runs/<name>/frozen_config.json")
The frozen file records every hyperparameter plus a SHA-256 of each module's
weights and of the retrieval index, so a result can be tied to one exact build.
"""
from __future__ import annotations

import hashlib
import json
import os
from typing import Any, Dict

import yaml


def load_config(path: str) -> Dict[str, Any]:
    with open(path) as f:
        return yaml.safe_load(f)


def sha256_bytes(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()


def sha256_file(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def hash_state_dict(sd: Dict[str, Any]) -> str:
    """Hash a torch state_dict deterministically (tensor bytes in key order)."""
    h = hashlib.sha256()
    for k in sorted(sd):
        v = sd[k]
        h.update(k.encode())
        try:
            h.update(v.detach().cpu().contiguous().numpy().tobytes())
        except AttributeError:
            h.update(repr(v).encode())
    return h.hexdigest()


def freeze(cfg: Dict[str, Any], pipeline, out: str) -> Dict[str, Any]:
    frozen = {"config": cfg, "hashes": pipeline.module_hashes()}
    os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
    with open(out, "w") as f:
        json.dump(frozen, f, indent=2)
    return frozen


def assert_frozen(pipeline, frozen_path: str) -> None:
    """Refuse to run an experiment if any module hash drifted from the frozen config."""
    with open(frozen_path) as f:
        frozen = json.load(f)
    now = pipeline.module_hashes()
    drift = {k: (frozen["hashes"].get(k), now.get(k)) for k in now if frozen["hashes"].get(k) != now.get(k)}
    if drift:
        raise RuntimeError(f"module hashes drifted from frozen config: {drift}")
