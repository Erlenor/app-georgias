"""Google Secret Manager integration with .env fallback for local development."""

import os
import logging

logger = logging.getLogger(__name__)

_USE_SECRET_MANAGER = os.environ.get("USE_SECRET_MANAGER", "false").lower() == "true"
_GCP_PROJECT_ID = os.environ.get("GCP_PROJECT_ID", "")


def get_secret(secret_name: str, default: str = "") -> str:
    """Retrieve a secret value.

    In production (USE_SECRET_MANAGER=true), fetches from Google Secret Manager.
    In development, falls back to environment variables.

    Args:
        secret_name: Name of the secret (used as env var name and Secret Manager ID).
        default: Default value if secret is not found.

    Returns:
        Secret value as a string.
    """
    if _USE_SECRET_MANAGER and _GCP_PROJECT_ID:
        try:
            from google.cloud import secretmanager  # type: ignore

            client = secretmanager.SecretManagerServiceClient()
            name = f"projects/{_GCP_PROJECT_ID}/secrets/{secret_name}/versions/latest"
            response = client.access_secret_version(request={"name": name})
            return response.payload.data.decode("UTF-8").strip()
        except Exception as exc:
            logger.warning(
                "Secret Manager lookup failed for '%s': %s. Falling back to env.",
                secret_name,
                exc,
            )

    value = os.environ.get(secret_name, default)
    if not value:
        logger.warning("Secret '%s' not found in env vars.", secret_name)
    return value
