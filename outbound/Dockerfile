FROM python:3.11-slim

WORKDIR /app

# Install system dependencies needed for compiling python packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies first (layer caching)
# Build context is root (.) so paths are relative to project root
COPY outbound/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy outbound service code and shared database layer
COPY outbound /app/outbound
COPY shared /app/shared

ENV PORT=8080
ENV PYTHONPATH=/app

CMD ["sh", "-c", "exec uvicorn outbound.main:app --host 0.0.0.0 --port ${PORT}"]
