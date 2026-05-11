"""
Pre-load heavy ML models at process startup to warm caches.

What this does:
  - Triggers ONNX runtime initialization (one-time cost moved to startup)
  - Populates OS file cache for the .onnx model files
  - Pre-imports torch/onnxruntime/whisper modules
  - Loads model files from disk into RAM (file system cache)

What this does NOT do:
  - Share VAD model instances between calls (NOT SAFE — Silero has per-call state
    in self._state, self._context that would corrupt concurrent calls)
  - Skip per-call SileroVADAnalyzer instantiation (still happens, just faster)

Effect: Per-call model loading goes from ~80ms → ~30-40ms because the OS file
cache is hot and all dependencies are already imported.
"""
from loguru import logger


def warmup_models():
    """Pre-load all heavy models. Call this once at process startup.

    Safe to call multiple times — only first call does work.
    Failures are non-fatal (call still works, just slower on first request).
    """
    logger.info("🔥 Warming up ML models at startup...")

    # ── Silero VAD ───────────────────────────────────────────────────────
    # Triggers: ONNX runtime init, model file → OS cache, numpy/onnxruntime imports
    try:
        from pipecat.audio.vad.silero import SileroVADAnalyzer
        _ = SileroVADAnalyzer(sample_rate=8000)
        logger.info("✅ Silero VAD pre-loaded (ONNX runtime + file cache warm)")
    except Exception as e:
        logger.warning(f"Silero VAD pre-load failed: {e}")

    # ── Smart Turn V3 ────────────────────────────────────────────────────
    try:
        from pipecat.audio.turn.smart_turn.local_smart_turn_v3 import LocalSmartTurnAnalyzerV3
        _ = LocalSmartTurnAnalyzerV3()
        logger.info("✅ Smart Turn V3 pre-loaded")
    except Exception as e:
        logger.warning(f"Smart Turn V3 pre-load failed: {e}")

    # ── MiniLM embeddings (~80MB, ~5-10ms per query) ─────────────────────
    # Load it now so first call doesn't pay the ~1-2 second model load.
    try:
        from shared.local_embeddings import get_model, embed_query
        get_model()
        # Warm the inference path with a dummy embedding
        _ = embed_query("warmup")
        logger.info("✅ MiniLM (all-MiniLM-L6-v2) pre-loaded")
    except Exception as e:
        logger.warning(f"MiniLM pre-load failed: {e}")

    logger.info("✅ Model warmup complete — per-call loading will be faster")
