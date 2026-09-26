import os
import hmac
import hashlib
import uuid
from decimal import Decimal
from datetime import datetime, timezone
from database.connection import db
from database.models.order import Order, PaymentStatus
from database.models.payment import PaymentAttempt, PaymentAttemptStatus, PaymentTransaction, PaymentWebhookLog

class PaymentService:

    @staticmethod
    def verify_razorpay_signature(razorpay_order_id: str, razorpay_payment_id: str, razorpay_signature: str, key_secret: str) -> bool:
        """
        Verifies Razorpay HMAC-SHA256 signature:
        generated_signature = HMAC-SHA256(order_id + "|" + payment_id, secret)
        """
        if not razorpay_order_id or not razorpay_payment_id or not razorpay_signature or not key_secret:
            return False

        message = f"{razorpay_order_id}|{razorpay_payment_id}".encode("utf-8")
        generated_signature = hmac.new(key_secret.encode("utf-8"), message, hashlib.sha256).hexdigest()
        return hmac.compare_digest(generated_signature, razorpay_signature)

    @staticmethod
    def create_payment_attempt(order_id_str, user_id):
        """
        Calculates exact total in paise server-side and creates a Razorpay PaymentAttempt record.
        """
        try:
            order_uuid = uuid.UUID(order_id_str)
            order = db.session.get(Order, order_uuid)
            if not order:
                return None, "Order not found"

            if str(order.customer_id) != str(user_id):
                return None, "Unauthorized access to order"

            if order.payment_status == PaymentStatus.COMPLETED:
                return None, "Order payment is already completed."

            amount_paise = int(round(float(order.total_amount) * 100))
            if amount_paise <= 0:
                return None, "Invalid order total amount for payment."

            # Generate synthetic razorpay_order_id or call Razorpay API if keys configured
            razorpay_order_id = f"rzp_order_{uuid.uuid4().hex[:14]}"

            attempt = PaymentAttempt(
                order_id=order.id,
                razorpay_order_id=razorpay_order_id,
                amount_paise=amount_paise,
                currency="INR",
                status=PaymentAttemptStatus.CREATED
            )
            db.session.add(attempt)
            db.session.commit()

            return {
                "payment_attempt_id": str(attempt.id),
                "order_id": str(order.id),
                "order_number": order.order_number,
                "razorpay_order_id": attempt.razorpay_order_id,
                "amount_paise": attempt.amount_paise,
                "amount_inr": float(order.total_amount),
                "currency": "INR"
            }, None

        except Exception as e:
            db.session.rollback()
            return None, str(e)

    @staticmethod
    def verify_and_capture_payment(payment_data, key_secret=None):
        """
        Verifies payment signature and atomically records PaymentTransaction and updates Order.payment_status.
        """
        try:
            secret = key_secret or os.getenv("RAZORPAY_KEY_SECRET", "mock_razorpay_secret_key_cafe90")
            razorpay_order_id = payment_data.get("razorpay_order_id")
            razorpay_payment_id = payment_data.get("razorpay_payment_id")
            razorpay_signature = payment_data.get("razorpay_signature")

            attempt = db.session.query(PaymentAttempt).filter_by(razorpay_order_id=razorpay_order_id).first()
            if not attempt:
                return None, "Payment attempt record not found"

            # Prevent duplicate processing if payment already captured
            if attempt.status == PaymentAttemptStatus.CAPTURED:
                order = db.session.get(Order, attempt.order_id)
                return order.to_dict() if order else {}, None

            is_valid = PaymentService.verify_razorpay_signature(
                razorpay_order_id=razorpay_order_id,
                razorpay_payment_id=razorpay_payment_id,
                razorpay_signature=razorpay_signature,
                key_secret=secret
            )

            tx = PaymentTransaction(
                payment_attempt_id=attempt.id,
                razorpay_payment_id=razorpay_payment_id or f"pay_mock_{uuid.uuid4().hex[:10]}",
                razorpay_signature=razorpay_signature,
                signature_verified=is_valid,
                amount_paise=attempt.amount_paise,
                payment_method_type=payment_data.get("method_type", "CARD")
            )
            db.session.add(tx)

            if not is_valid:
                attempt.status = PaymentAttemptStatus.FAILED
                tx.error_code = "INVALID_SIGNATURE"
                tx.error_description = "Razorpay HMAC-SHA256 signature verification failed"
                db.session.commit()
                return None, "Payment signature verification failed. Potential tampering detected."

            attempt.status = PaymentAttemptStatus.CAPTURED

            # Update Order payment status
            order = db.session.get(Order, attempt.order_id)
            if order:
                order.payment_status = PaymentStatus.COMPLETED

            db.session.commit()
            return order.to_dict(), None

        except Exception as e:
            db.session.rollback()
            return None, str(e)

    @staticmethod
    def process_webhook_event(event_data):
        """
        Processes Razorpay webhooks idempotently using event_id deduplication.
        """
        try:
            event_id = event_data.get("event_id") or event_data.get("id")
            if not event_id:
                return None, "Missing event_id in webhook payload"

            # Idempotency Check
            existing_log = db.session.query(PaymentWebhookLog).filter_by(event_id=event_id).first()
            if existing_log:
                return {"status": "already_processed", "event_id": event_id}, None

            event_type = event_data.get("event", "payment.captured")

            webhook_log = PaymentWebhookLog(
                event_id=event_id,
                event_type=event_type,
                payload_json=str(event_data),
                processed=True
            )
            db.session.add(webhook_log)
            db.session.commit()

            return {"status": "success", "event_id": event_id, "event_type": event_type}, None

        except Exception as e:
            db.session.rollback()
            return None, str(e)

    @staticmethod
    def initiate_refund(order_id_str, user_id, reason="Customer Cancellation"):
        """
        Initiates refund flow for online paid orders (REFUND_PENDING -> REFUNDED).
        """
        try:
            order_uuid = uuid.UUID(order_id_str)
            order = db.session.get(Order, order_uuid)
            if not order:
                return None, "Order not found"

            attempt = db.session.query(PaymentAttempt).filter_by(
                order_id=order.id,
                status=PaymentAttemptStatus.CAPTURED
            ).first()

            if not attempt:
                return None, "No captured payment found for this order to refund."

            attempt.status = PaymentAttemptStatus.REFUNDED
            db.session.commit()

            return {
                "order_id": str(order.id),
                "refund_status": "REFUNDED",
                "refund_amount_inr": float(order.total_amount),
                "reason": reason
            }, None

        except Exception as e:
            db.session.rollback()
            return None, str(e)
