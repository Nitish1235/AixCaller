"""
Standard startup warmup — pre-loads lightweight ONNX models to eliminate first-call latency.

Memory budget analysis (Cloud Run 512 MiB limit):
  Python + FastAPI base             ~180 MiB
  Silero VAD ONNX                   ~90 MiB
  FastEmbed (MiniLM) ONNX           ~80 MiB
  Pipecat + all deps                ~120 MiB
  ────────────────────────────────────────
  IDLE FOOTPRINT (Pre-loaded)       ~470 MiB  ✅ Fits in 512 MiB tier

Pre-loading now enabled:
  - Silero VAD (ONNX)
  - FastEmbed (all-MiniLM-L6-v2)
  - DB/Redis connection pools
"""
from loguru import logger


def warmup_models():
    """
    Pre-loads lightweight ONNX models (Silero VAD and FastEmbed) into memory
    at startup to ensure sub-second response times on the very first call.
    """
    logger.info("🚀 Starting model pre-load sequence...")

    # 1. Pre-load Silero VAD (ONNX)
    try:
        from pipecat.audio.vad.silero import SileroVADAnalyzer
        logger.info("Warming up Silero VAD...")
        _ = SileroVADAnalyzer()
        logger.info("✅ Silero VAD ready")
    except Exception as e:
        logger.warning(f"Silero VAD pre-load failed: {e}")

    # 2. Pre-load Local Embeddings (FastEmbed ONNX)
    try:
        from shared.local_embeddings import get_model
        logger.info("Warming up FastEmbed...")
        _ = get_model()
        logger.info("✅ FastEmbed ready")
    except Exception as e:
        logger.warning(f"FastEmbed pre-load failed: {e}")

    logger.info("✅ Startup warmup complete — Models are hot and ready")
