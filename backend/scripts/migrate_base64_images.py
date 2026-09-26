#!/usr/bin/env python3
"""
Base64 Image Migration Script for Cafe90.
Cleans up legacy Base64-encoded data URLs stored in food_items.image_url
by replacing them with Cloudinary CDN URLs or optimized fallback image URLs.
"""

import sys
import os

# Ensure backend directory is on sys.path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app import create_app
from database.connection import db
from database.models.food import FoodItem
from services.storage_service import StorageService, DEFAULT_FOOD_IMAGE

def migrate_images():
    app = create_app()
    with app.app_context():
        print("[MIGRATION] Checking food items for legacy Base64 image URLs...")
        
        base64_items = db.session.query(FoodItem).filter(
            FoodItem.image_url.like('data:image/%')
        ).all()
        
        if not base64_items:
            print("[MIGRATION] No Base64 image URLs found. Database is clean!")
            return

        print(f"[MIGRATION] Found {len(base64_items)} item(s) with Base64 image URLs.")
        updated_count = 0

        for item in base64_items:
            print(f"  - Processing item '{item.name}' ({item.id})...")
            new_url, err = StorageService.upload_image(item.image_url, folder="cafe90/migrated_menu")
            
            if err:
                print(f"    [WARNING] Upload failed for '{item.name}': {err}. Using default fallback URL.")
                item.image_url = DEFAULT_FOOD_IMAGE
            else:
                item.image_url = new_url
                print(f"    -> Updated to: {new_url}")

            updated_count += 1

        db.session.commit()
        print(f"[MIGRATION] Successfully cleaned up and migrated {updated_count} food item image(s).")

if __name__ == "__main__":
    migrate_images()
