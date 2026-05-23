import os
import uuid
import boto3
import httpx
from typing import List
from botocore.config import Config
from sqlmodel import Session
from sqlalchemy import text
from loguru import logger
from shared.database import engine
from shared.models import KnowledgeChunk



def get_telnyx_s3_client():
    """Initializes and returns an S3 client configured for Telnyx Cloud Storage."""
    api_key = os.environ.get("TELNYX_API_KEY", "")
    region = os.environ.get("TELNYX_STORAGE_REGION", "us-central-1")
    endpoint = f"https://{region}.telnyxcloudstorage.com"
    
    return boto3.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id=api_key,
        aws_secret_access_key="dummy-not-required",
        config=Config(signature_version="s3v4")
    )

def _ensure_bucket_exists(s3_client, bucket_name: str):
    """Checks if a bucket exists. If not, creates it programmatically."""
    try:
        s3_client.head_bucket(Bucket=bucket_name)
    except Exception as e:
        logger.info(f"Bucket {bucket_name} not found or inaccessible. Attempting creation... Details: {e}")
        try:
            s3_client.create_bucket(Bucket=bucket_name)
            logger.info(f"Successfully created Telnyx Storage bucket: {bucket_name}")
        except Exception as create_err:
            logger.error(f"Failed to create bucket {bucket_name}: {create_err}")
            raise create_err

async def _trigger_telnyx_embeddings(bucket_name: str):
    """Triggers Telnyx's server-side document embedding API for the specified bucket."""
    api_key = os.environ.get("TELNYX_API_KEY")
    if not api_key:
        logger.error("Missing TELNYX_API_KEY — cannot trigger document embeddings API")
        return
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    payload = {
        "bucket_name": bucket_name
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                "https://api.telnyx.com/v2/ai/embeddings/embed-documents",
                headers=headers,
                json=payload,
                timeout=30.0
            )
            if response.status_code not in [200, 201]:
                logger.error(f"Failed to trigger Telnyx embed-documents API: {response.status_code} - {response.text}")
            else:
                logger.info(f"Successfully triggered Telnyx document embedding for bucket {bucket_name}")
        except Exception as e:
            logger.error(f"Exception during Telnyx embed-documents API trigger: {e}")

class IngestionService:
    """Handles ingesting text into Telnyx Storage and RAG search pipeline."""

    async def ingest_text(
        self,
        content: str,
        tenant_id: uuid.UUID,
        agent_id: uuid.UUID,
        source: str = "manual"
    ) -> int:
        """
        Upload raw document content directly to the agent's Telnyx S3 bucket
        and trigger the native Telnyx document embedding API.
        """
        if not content or len(content.strip()) < 10:
            logger.warning("Content too short to ingest.")
            return 0

        bucket_name = f"aixcaller-agent-{str(agent_id).lower()}"
        doc_id = uuid.uuid4()
        key = f"document_{doc_id.hex}.txt"
        
        logger.info(f"Ingesting raw document {key} into Telnyx Bucket {bucket_name} for agent {agent_id}...")

        try:
            s3 = get_telnyx_s3_client()
            _ensure_bucket_exists(s3, bucket_name)
            
            # 1. Upload the entire text document to S3
            s3.put_object(
                Bucket=bucket_name,
                Key=key,
                Body=content.encode("utf-8"),
                ContentType="text/plain"
            )
            
            # 2. Record the document upload locally as metadata
            with Session(engine) as db:
                chunk = KnowledgeChunk(
                    id=doc_id,
                    tenant_id=tenant_id,
                    agent_id=agent_id,
                    content=f"Uploaded full document to Telnyx: {key}",
                    source=source
                )
                db.add(chunk)
                db.commit()

            # 3. Trigger Telnyx embed documents indexing API
            await _trigger_telnyx_embeddings(bucket_name)
            
            logger.info(f"Successfully uploaded {key} and triggered embeddings for agent {agent_id}.")
            return 1  # 1 document stored

        except Exception as e:
            logger.error(f"Failed to ingest KB text into Telnyx Storage: {e}")
            raise e

    async def delete_agent_kb(self, agent_id: uuid.UUID):
        """Delete all knowledge base chunks for a specific agent locally and in Telnyx S3."""
        bucket_name = f"aixcaller-agent-{str(agent_id).lower()}"
        logger.info(f"Clearing KB and S3 bucket {bucket_name} for agent {agent_id}...")

        # 1. Clear database records
        with Session(engine) as db:
            db.execute(
                text("DELETE FROM knowledge_chunks WHERE agent_id = CAST(:agent_id AS UUID)"),
                {"agent_id": str(agent_id)}
            )
            db.commit()
        logger.info(f"Deleted KB database records for agent {agent_id}.")

        # 2. Clear Telnyx Cloud Storage bucket objects and the bucket itself
        try:
            s3 = get_telnyx_s3_client()
            response = s3.list_objects_v2(Bucket=bucket_name)
            if "Contents" in response:
                objects = [{"Key": obj["Key"]} for obj in response["Contents"]]
                s3.delete_objects(Bucket=bucket_name, Delete={"Objects": objects})
                logger.info(f"Deleted all objects from Telnyx bucket {bucket_name}")
            
            # Delete the bucket
            s3.delete_bucket(Bucket=bucket_name)
            logger.info(f"Deleted Telnyx Bucket {bucket_name}")
        except Exception as e:
            logger.warning(f"Error while cleaning up Telnyx Bucket {bucket_name} (it might not exist): {e}")
