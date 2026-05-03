FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for audio and Pipecat
RUN apt-get update && apt-get install -y \
    build-essential \
    libportaudio2 \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Copy voice engine code
COPY voice_engine/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY voice_engine/ /app/voice_engine

EXPOSE 8080

# Optimization for Cloud Run
ENV PYTHONUNBUFFERED=1

CMD ["uvicorn", "voice_engine.main:app", "--host", "0.0.0.0", "--port", "8080"]
