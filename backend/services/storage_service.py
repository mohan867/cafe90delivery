import os
import logging
from typing import Optional, Tuple

logger = logging.getLogger(__name__)

DEFAULT_FOOD_IMAGE = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80"

class StorageService:
    @staticmethod
    def is_cloudinary_configured() -> bool:
        cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME")
        api_key = os.getenv("CLOUDINARY_API_KEY")
        api_secret = os.getenv("CLOUDINARY_API_SECRET")
        return bool(cloud_name and api_key and api_secret)

    @staticmethod
    def init_cloudinary():
        if StorageService.is_cloudinary_configured():
            import cloudinary
            cloudinary.config(
                cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
                api_key=os.getenv("CLOUDINARY_API_KEY"),
                api_secret=os.getenv("CLOUDINARY_API_SECRET"),
                secure=True
            )

    @staticmethod
    def upload_image(file_or_base64, folder: str = "cafe90/menu") -> Tuple[Optional[str], Optional[str]]:
        """
        Uploads an image (file object, base64 string, or safe URL) to Cloudinary CDN with strict validation.
        Returns tuple: (image_url, error_message).
        """
        if not file_or_base64:
            return DEFAULT_FOOD_IMAGE, None

        # 1. Base64 payload validation
        if isinstance(file_or_base64, str) and file_or_base64.startswith("data:image/"):
            header, _, data = file_or_base64.partition(",")
            mime_type = header.split(";")[0].replace("data:", "").lower()
            if mime_type not in ["image/jpeg", "image/png", "image/webp"]:
                return None, "Invalid image format. Only JPEG, PNG, and WebP images are allowed."
            if len(data) > 7 * 1024 * 1024:  # ~5MB raw payload
                return None, "Image file size exceeds the 5MB maximum limit."

        # 2. File stream object validation
        elif hasattr(file_or_base64, "filename"):
            filename = getattr(file_or_base64, "filename", "") or ""
            ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
            if ext not in ["jpg", "jpeg", "png", "webp"]:
                return None, "Invalid image file extension. Allowed: jpg, jpeg, png, webp."

        if StorageService.is_cloudinary_configured():
            try:
                import cloudinary.uploader
                StorageService.init_cloudinary()
                
                result = cloudinary.uploader.upload(
                    file_or_base64,
                    folder=folder,
                    transformation=[
                        {"width": 800, "height": 600, "crop": "limit"},
                        {"quality": "auto"},
                        {"fetch_format": "auto"}
                    ]
                )
                return result.get("secure_url"), None
            except Exception as e:
                logger.error(f"Cloudinary upload failed: {e}")
                return None, f"Cloudinary upload failed: {str(e)}"
        
        # Fallback if Cloudinary credentials are not set
        if isinstance(file_or_base64, str) and (file_or_base64.startswith("http://") or file_or_base64.startswith("https://")):
            # Basic SSRF prevention: reject localhost / internal loopback IPs
            if "localhost" in file_or_base64 or "127.0.0.1" in file_or_base64 or "169.254." in file_or_base64:
                return None, "Invalid remote image URL host."
            return file_or_base64, None

        # Local storage fallback for base64 payload when Cloudinary is not active
        if isinstance(file_or_base64, str) and file_or_base64.startswith("data:image/"):
            try:
                import base64
                import uuid
                header, _, data_str = file_or_base64.partition(",")
                ext = "png"
                if "jpeg" in header or "jpg" in header:
                    ext = "jpg"
                elif "webp" in header:
                    ext = "webp"
                
                upload_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static", "uploads")
                os.makedirs(upload_dir, exist_ok=True)
                filename = f"{uuid.uuid4().hex}.{ext}"
                filepath = os.path.join(upload_dir, filename)
                with open(filepath, "wb") as f:
                    f.write(base64.b64decode(data_str))
                return f"/static/uploads/{filename}", None
            except Exception as ex:
                logger.error(f"Local storage fallback failed: {ex}")

        logger.warning("Cloudinary credentials not configured; returning fallback CDN image URL.")
        return DEFAULT_FOOD_IMAGE, None

