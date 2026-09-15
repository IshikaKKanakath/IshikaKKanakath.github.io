"""ecgsec: harness for 'Adaptive Security of ECG-Language Models' (proposal v4).

Module map (proposal Section 7 step -> module):
  step 1 pipeline wrap + stage log   -> pipeline.py, stagelog.py, config.py
  step 2 baseline + cohort C         -> experiments.py (baseline), stats.py
  step 3 admissibility + A0 attack   -> admissibility.py, attacks.py
  step 4 adaptive attack A1/A2       -> surrogate.py, attacks.py
  step 5 Causal-RAG 2x2 crossing     -> experiments.py (e4_crossing)
  step 6 latent factor restoration   -> experiments.py (e5_restoration)
  step 7 counterfactual reversal     -> experiments.py (e6_reversal)
  step 8 verifiers V1/V2/V3          -> verifiers.py, experiments.py (e8_verifiers)
"""
__version__ = "0.1.0"
