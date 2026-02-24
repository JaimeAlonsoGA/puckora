"""
Keepa API client stub.
In production: use httpx to call https://api.keepa.com/product
"""
import httpx
from app.core.config import settings


class KeepaClient:
    base_url = "https://api.keepa.com"

    async def get_product(self, asin: str, marketplace_id: int = 1) -> dict:
        """
        Stub — returns empty dict.
        Replace with real Keepa API call.
        Keepa marketplace IDs: 1=US, 3=UK, 4=DE, 5=FR, 8=IT, 9=ES, etc.
        """
        if not settings.keepa_api_key:
            return {}

        async with httpx.AsyncClient() as client:
            r = await client.get(
                f"{self.base_url}/product",
                params={
                    "key": settings.keepa_api_key,
                    "domain": marketplace_id,
                    "asin": asin,
                    "stats": 1,
                    "history": 1,
                },
                timeout=15,
            )
            r.raise_for_status()
            return r.json()


keepa_client = KeepaClient()
