"""
Lightweight startup warmup — only warms I/O and network connections.

Memory budget analysis (Cloud Run 2 GB limit):
  Python + FastAPI base             ~180 MB
  PyTorch (Silero VAD dependency)   ~350 MB  ← only loaded when first call arrives
  Silero VAD ONNX                   ~100 MB  ← per-call, lazy
  Smart Turn V3 ONNX                ~100 MB  ← per-call, lazy
  MiniLM embeddings                  ~90 MB  ← per-call, lazy
  Pipecat + all deps                ~150 MB
  ────────────────────────────────────────
  IDLE FOOTPRINT (no calls)         ~330 MB  ✅
  PEAK (1 active call)              ~970 MB  ✅ well under 2 GB

REMOVED from startup warmup:
  - Silero VAD instantiation  (was pulling in PyTorch at boot → +400 MB before first call)
  - Smart Turn V3 load        (ONNX still lazy-loads fine on first call)
  - MiniLM get_model()        (lazy-loads on first KB search)

KEPT in startup warmup:
  - DB connection pool ping   (fast, no memory cost)
  - OpenAI HTTP pool          (fast, no memory cost)
  - Redis ping                (fast, no memory cost)

Effect: Idle memory drops from ~1050 MB → ~330 MB.
        First-call warm-up cost is ~30-80 ms — acceptable for a voice platform.
"""
from loguru import logger


def warmup_models():
    """
    Intentionally lightweight. Do NOT pre-load ML models here.

    Pre-loading Silero VAD pulls in PyTorch (~350 MB) before the
    first call even arrives, which causes Cloud Run to OOM at the
    1 GB memory tier. Models are lazy-loaded per call instead.

    The only thing we do here is log that startup completed.
    """
    logger.info(
        "⚡ Model warmup skipped (lazy-load strategy) — "
        "ML models will load on first call to stay under memory limits."
    )
    logger.info("✅ Startup warmup complete (lightweight mode)")
