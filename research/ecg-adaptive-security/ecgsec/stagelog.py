"""One JSON stage log per submission (proposal step 1).

Every call to Pipeline.submit() returns a StageLog. The attack code, the E4
crossing, and the factor-restoration experiment all read from these logs, so
this is the one contract that must not drift once experiments start.
"""
from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class RetrievedItem:
    item_id: str
    kind: str                # "case" or "fact"
    label: str               # label of the retrieved case / topic of the fact
    score: float             # retrieval similarity
    supports_claim: Optional[bool] = None  # support direction relative to the draft's main claim


@dataclass
class StageLog:
    # identity
    record_id: str
    subject_id: str
    submission_idx: int = 0            # counts complete submissions (A2 budget B)
    # stage: encoder
    latent: List[float] = field(default_factory=list)
    latent_shift: Optional[List[float]] = None      # z_attacked - z_clean, if clean reference known
    latent_shift_std: Optional[List[float]] = None  # standardized by training-fold std
    # stage: discretization
    factors: List[int] = field(default_factory=list)  # z_d bins
    # stage: diagnosis
    posterior: Dict[str, float] = field(default_factory=dict)
    top_hypothesis: str = ""
    path_contrib: Dict[str, float] = field(default_factory=dict)  # factor -> log-odds contribution for top hypothesis
    # stage: retrieval
    retrieved: List[RetrievedItem] = field(default_factory=list)
    # stage: generation
    draft_claims: Dict[str, str] = field(default_factory=dict)   # e.g. {"diagnosis": "MI", "rhythm": "sinus"}
    report_text: str = ""
    # stage: verifier
    verifier_score: float = 0.0
    verifier_threshold: float = 0.0
    decision: str = ""          # "release" | "regenerate" | "abstain"
    # ground truth
    reference_label: str = ""
    claim_correct: Optional[bool] = None    # draft diagnosis == reference label
    incorrect_release: Optional[bool] = None  # released AND not correct
    # bookkeeping
    overrides: Dict[str, Any] = field(default_factory=dict)  # which overrides were active
    extra: Dict[str, Any] = field(default_factory=dict)

    def to_json(self) -> str:
        return json.dumps(asdict(self))

    @staticmethod
    def from_json(s: str) -> "StageLog":
        d = json.loads(s)
        d["retrieved"] = [RetrievedItem(**r) for r in d.get("retrieved", [])]
        return StageLog(**d)

    def released(self) -> bool:
        return self.decision == "release"


STAGES = ["latent", "diagnosis", "retrieval", "report", "gate"]


def earliest_divergent_stage(clean: StageLog, attacked: StageLog,
                             latent_tol: float = 0.5) -> Optional[str]:
    """E1: first module whose logged state differs between the clean and attacked run.

    latent: any standardized factor shift beyond `latent_tol` std, or a bin change.
    diagnosis: top hypothesis changes.
    retrieval: retrieved id set changes.
    report: draft diagnosis claim changes.
    gate: decision changes.
    """
    if attacked.factors != clean.factors:
        return "latent"
    if attacked.latent_shift_std is not None and max(abs(v) for v in attacked.latent_shift_std) > latent_tol:
        return "latent"
    if attacked.top_hypothesis != clean.top_hypothesis:
        return "diagnosis"
    if {r.item_id for r in attacked.retrieved} != {r.item_id for r in clean.retrieved}:
        return "retrieval"
    if attacked.draft_claims.get("diagnosis") != clean.draft_claims.get("diagnosis"):
        return "report"
    if attacked.decision != clean.decision:
        return "gate"
    return None


def write_jsonl(logs: List[StageLog], path: str) -> None:
    with open(path, "w") as f:
        for lg in logs:
            f.write(lg.to_json() + "\n")


def read_jsonl(path: str) -> List[StageLog]:
    with open(path) as f:
        return [StageLog.from_json(line) for line in f if line.strip()]
