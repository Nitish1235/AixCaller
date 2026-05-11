import os
from dodopayments import AsyncDodoPayments
from loguru import logger

class DodoPaymentsService:
    def __init__(self):
        self.client = AsyncDodoPayments(
            bearer_token=os.environ.get("DODO_PAYMENTS_API_KEY", "dummy_key_to_prevent_crash_until_configured"),
            environment=os.environ.get("DODO_PAYMENTS_ENVIRONMENT", "test_mode")
        )

    async def create_checkout_session(
        self,
        customer_email: str,
        product_id: str,
        tenant_id: str,
        metadata: dict | None = None,
    ):
        """
        Creates a Dodo Payments checkout session for a subscription or credit top-up.
        `metadata` is merged with tenant_id so we can route the webhook back to
        the correct plan tier.
        """
        try:
            merged_metadata = {"tenant_id": tenant_id, **(metadata or {})}
            session = await self.client.checkout_sessions.create(
                product_cart=[{"product_id": product_id, "quantity": 1}],
                customer={"email": customer_email},
                metadata=merged_metadata,
                return_url=os.environ.get("DASHBOARD_URL", "http://localhost:3000/dashboard")
            )
            return session.checkout_url
        except Exception as e:
            logger.error(f"Dodo Payments error: {e}")
            return None

    async def verify_webhook(self, payload: bytes, signature: str):
        """
        Verifies the webhook signature from Dodo Payments.
        """
        # Logic for verifying Dodo webhooks would go here
        # Usually uses the DODO_PAYMENTS_WEBHOOK_KEY
        pass
