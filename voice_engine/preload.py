"""
Standard startup warmup — pre-loads lightweight ONNX models to eliminate first-call latency.

Memory budget analysis (Cloud Run 512 MiB limit):
  Python + FastAPI base             ~180 MiB
  Silero VAD ONNX                   ~90 MiB
  Smart Turn v3 ONNX                ~15 MiB
  FastEmbed (MiniLM) ONNX           ~80 MiB
  Pipecat + all deps                ~120 MiB
  ────────────────────────────────────────
  IDLE FOOTPRINT (Pre-loaded)       ~485 MiB  ✅ Fits in 512 MiB tier

Pre-loading now enabled:
  - Silero VAD ONNX InferenceSession (shared singleton — zero per-call model load)
  - Smart Turn v3 (ONNX) — auto-loaded by LLMContextAggregatorPair, was causing ~6s first-call delay
  - FastEmbed (all-MiniLM-L6-v2)
  - DB/Redis connection pools
"""
import numpy as np
from loguru import logger

# ── Silero VAD singleton ──────────────────────────────────────────────────────
# The ONNX InferenceSession holds the read-only model weights (~90 MiB).
# It is thread-safe for concurrent inference. Each call gets its own state
# tensors (_state, _context) via create_phone_vad(), so calls don't interfere.
_silero_session = None


def _get_silero_model_path() -> str:
    model_name = "silero_vad.onnx"
    package_path = "pipecat.audio.vad.data"
    try:
        import importlib_resources as impresources
        return str(impresources.files(package_path).joinpath(model_name))
    except Exception:
        from importlib import resources as impresources
        try:
            with impresources.path(package_path, model_name) as f:
                return str(f)
        except Exception:
            return str(impresources.files(package_path).joinpath(model_name))


def _load_silero_session():
    """Load the Silero ONNX InferenceSession once and store it globally."""
    global _silero_session
    import onnxruntime
    opts = onnxruntime.SessionOptions()
    opts.inter_op_num_threads = 1
    opts.intra_op_num_threads = 1
    path = _get_silero_model_path()
    _silero_session = onnxruntime.InferenceSession(
        path,
        providers=["CPUExecutionProvider"],
        sess_options=opts,
    )
    logger.info("✅ Silero VAD ONNX session loaded (shared singleton)")


class _SharedSessionSileroModel:
    """Thin wrapper that uses the shared InferenceSession but owns its own state.

    The InferenceSession (weights) is shared across all concurrent calls.
    The _state and _context tensors are per-instance, so concurrent calls
    never touch each other's data.
    """

    sample_rates = [8000, 16000]

    def __init__(self):
        if _silero_session is None:
            raise RuntimeError("Silero session not loaded — call warmup_models() at startup")
        self.session = _silero_session
        self.reset_states()

    def reset_states(self, batch_size=1):
        self._state = np.zeros((2, batch_size, 128), dtype="float32")
        self._context = np.zeros((batch_size, 0), dtype="float32")
        self._last_sr = 0
        self._last_batch_size = 0

    def _validate_input(self, x, sr: int):
        if np.ndim(x) == 1:
            x = np.expand_dims(x, 0)
        if np.ndim(x) > 2:
            raise ValueError(f"Too many dimensions for input audio chunk")
        if sr not in self.sample_rates:
            raise ValueError(f"Supported sampling rates: {self.sample_rates}")
        if sr / np.shape(x)[1] > 31.25:
            raise ValueError("Input audio chunk is too short")
        return x, sr

    def __call__(self, x, sr: int):
        x, sr = self._validate_input(x, sr)
        num_samples = 512 if sr == 16000 else 256
        if np.shape(x)[-1] != num_samples:
            raise ValueError(f"Expected {num_samples} samples, got {np.shape(x)[-1]}")

        batch_size = np.shape(x)[0]
        context_size = 64 if sr == 16000 else 32

        if not self._last_batch_size:
            self.reset_states(batch_size)
        if self._last_sr and self._last_sr != sr:
            self.reset_states(batch_size)
        if self._last_batch_size and self._last_batch_size != batch_size:
            self.reset_states(batch_size)

        if not np.shape(self._context)[1]:
            self._context = np.zeros((batch_size, context_size), dtype="float32")

        x = np.concatenate((self._context, x), axis=1)
        ort_inputs = {"input": x, "state": self._state, "sr": np.array(sr, dtype="int64")}
        ort_outs = self.session.run(None, ort_inputs)
        out, state = ort_outs
        self._state = state
        self._context = x[:, -context_size:]
        self._last_sr = sr
        self._last_batch_size = batch_size
        return out


def create_phone_vad():
    """Return a SileroVADAnalyzer-compatible instance backed by the shared ONNX session.

    Per-call cost: state tensor allocation only (~microseconds, ~1 KB).
    The 90 MiB ONNX session is reused from the startup singleton.
    """
    from pipecat.audio.vad.silero import SileroVADAnalyzer
    from pipecat.audio.vad.vad_analyzer import VADAnalyzer, VADParams

    vad = SileroVADAnalyzer.__new__(SileroVADAnalyzer)
    VADAnalyzer.__init__(
        vad,
        sample_rate=8000,
        # OFFICIAL DEFAULTS — verified against the Pipecat 1.2.0 source and the
        # official inbound Telnyx example (which uses bare `SileroVADAnalyzer()`).
        #
        # Why we MUST match the defaults exactly:
        #   Pipecat's TurnAnalyzer hardcodes p99 STT latency assumptions that
        #   assume `stop_secs=0.2`. If stop_secs > STT p99 latency (~0.35s),
        #   Pipecat's own logs warn:
        #     "STT wait timeout collapsed to 0s, which may cause delayed turn
        #      detection specified by the user_turn_stop_timeout parameter"
        #   We hit exactly this with stop_secs=0.5 — Smart Turn analysis
        #   stalled for 6.5 s after the caller stopped speaking and the LLM
        #   never fired.
        #
        # min_volume=0.6 and confidence=0.7 are the official mic-audio defaults.
        # If they prove too strict for quiet phone callers in production, tune
        # ONLY those two — do NOT touch stop_secs again.
        params=VADParams(
            confidence=0.7,
            start_secs=0.2,
            stop_secs=0.2,
            min_volume=0.6,
        ),
    )
    vad._model = _SharedSessionSileroModel()
    vad._last_reset_time = 0
    return vad


def warmup_models():
    """
    Pre-loads ONNX models into memory at startup to ensure sub-second response
    times on the very first call.
    """
    logger.info("🚀 Starting model pre-load sequence...")

    # 1. Load Silero VAD ONNX session (shared singleton — never reloaded per call)
    try:
        _load_silero_session()
    except Exception as e:
        logger.warning(f"Silero VAD pre-load failed: {e}")

    # 2. Pre-load Smart Turn v3 (ONNX)
    # LLMContextAggregatorPair auto-loads this model on every call.
    # Without pre-loading it causes a ~6-second silence before the greeting fires.
    try:
        from pipecat.audio.turn.smart_turn.local_smart_turn_v3 import LocalSmartTurnAnalyzerV3
        logger.info("Warming up Smart Turn v3...")
        _ = LocalSmartTurnAnalyzerV3()
        logger.info("✅ Smart Turn v3 ready")
    except Exception as e:
        logger.warning(f"Smart Turn v3 pre-load failed: {e}")

    # 3. Pre-load Local Embeddings (FastEmbed ONNX)
    try:
        from shared.local_embeddings import get_model
        logger.info("Warming up FastEmbed...")
        _ = get_model()
        logger.info("✅ FastEmbed ready")
    except Exception as e:
        logger.warning(f"FastEmbed pre-load failed: {e}")

    logger.info("✅ Startup warmup complete — Models are hot and ready")
