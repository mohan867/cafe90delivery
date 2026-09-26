#!/usr/bin/env python3
"""
Standalone Cron Dispatcher for Cafe90 Background Tasks.
Executed periodically (e.g. via Render Cron Job or crontab) to safely transition pending
orders and dispatch unassigned tasks without adding side effects to HTTP GET requests.
"""

import sys
import os

# Ensure backend directory is on sys.path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app import create_app
from services.order_service import OrderService
from services.delivery_service import DeliveryService

def run_cron_tasks():
    app = create_app()
    with app.app_context():
        print("[CRON] Starting periodic background order & dispatch tasks...")
        
        try:
            confirmed_count = OrderService.auto_confirm_pending_orders(window_minutes=5)
            print(f"[CRON] Auto-confirmed {confirmed_count} pending order(s).")
        except Exception as e:
            print(f"[CRON ERROR] Failed during auto_confirm_pending_orders: {e}")

        try:
            dispatched_count = DeliveryService.auto_dispatch_unassigned_orders(unassigned_threshold_minutes=5)
            print(f"[CRON] Auto-dispatched {dispatched_count} unassigned order(s).")
        except Exception as e:
            print(f"[CRON ERROR] Failed during auto_dispatch_unassigned_orders: {e}")

        print("[CRON] Periodic background tasks completed successfully.")

if __name__ == "__main__":
    run_cron_tasks()
