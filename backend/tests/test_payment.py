import unittest
import uuid
import hmac
import hashlib
from decimal import Decimal
from app import create_app
from database.connection import db
from database.models import *
from services.payment_service import PaymentService
from services.order_service import OrderService

class TestPaymentService(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = create_app()
        cls.ctx = cls.app.app_context()
        cls.ctx.push()
        db.create_all()

    @classmethod
    def tearDownClass(cls):
        db.session.remove()
        cls.ctx.pop()

    def setUp(self):
        self.secret = "test_razorpay_secret_12345"
        self.customer = User(
            id=uuid.uuid4(),
            email=f"pay-cust-{uuid.uuid4().hex[:6]}@cafe90.com",
            password_hash="hashed_pw",
            full_name="Payment Test Customer",
            role=UserRole.CUSTOMER,
            is_active=True
        )
        db.session.add(self.customer)

        category = db.session.query(FoodCategory).first()
        self.created_category = False
        if not category:
            category = FoodCategory(id=uuid.uuid4(), name=f"Test Category {uuid.uuid4().hex[:6]}")
            db.session.add(category)
            self.created_category = True
            
        food = FoodItem(id=uuid.uuid4(), name=f"Test Pizza {uuid.uuid4().hex[:4]}", price=300.0, category_id=category.id)
        db.session.add(food)
        db.session.commit()

        # Place an order
        from services.cart_service import CartService
        CartService.add_item_to_cart(self.customer.id, str(food.id), 1)

        order_dict, err = OrderService.place_order(
            user_id=self.customer.id,
            checkout_data={
                "delivery_address": "Payment Test Street 10",
                "payment_method": "COD"
            }
        )
        self.order_id = order_dict["id"]
        self.category_id = category.id
        self.food_id = food.id

    def tearDown(self):
        try:
            from database.models.order import Order, OrderItem, OrderStatusHistory
            from database.models.cart import Cart, CartItem
            from database.models.payment import PaymentAttempt, WebhookEvent

            if hasattr(self, 'customer') and self.customer:
                customer_id = self.customer.id
                orders = db.session.query(Order).filter_by(customer_id=customer_id).all()
                for o in orders:
                    db.session.query(OrderStatusHistory).filter_by(order_id=o.id).delete()
                    db.session.query(PaymentAttempt).filter_by(order_id=o.id).delete()
                    db.session.query(OrderItem).filter_by(order_id=o.id).delete()
                    db.session.delete(o)
                
                carts = db.session.query(Cart).filter_by(user_id=customer_id).all()
                for c in carts:
                    db.session.query(CartItem).filter_by(cart_id=c.id).delete()
                    db.session.delete(c)

                if hasattr(self, 'food_id'):
                    db.session.query(OrderItem).filter_by(food_item_id=self.food_id).delete()
                    db.session.query(CartItem).filter_by(food_item_id=self.food_id).delete()
                    db.session.query(FoodItem).filter_by(id=self.food_id).delete()

                if getattr(self, 'created_category', False) and hasattr(self, 'category_id'):
                    db.session.query(FoodCategory).filter_by(id=self.category_id).delete()

                db.session.query(User).filter_by(id=customer_id).delete()
                db.session.commit()
        except Exception as e:
            db.session.rollback()

    def test_hmac_signature_verification_success(self):
        order_id = "order_N1234567890"
        payment_id = "pay_P1234567890"
        msg = f"{order_id}|{payment_id}".encode("utf-8")
        valid_sig = hmac.new(self.secret.encode("utf-8"), msg, hashlib.sha256).hexdigest()

        is_valid = PaymentService.verify_razorpay_signature(order_id, payment_id, valid_sig, self.secret)
        self.assertTrue(is_valid)

    def test_hmac_signature_verification_tampered_failure(self):
        order_id = "order_N1234567890"
        payment_id = "pay_P1234567890"
        tampered_sig = "invalid_signature_hex_code_9999"

        is_valid = PaymentService.verify_razorpay_signature(order_id, payment_id, tampered_sig, self.secret)
        self.assertFalse(is_valid)

    def test_create_and_capture_payment_flow(self):
        attempt_res, err = PaymentService.create_payment_attempt(self.order_id, self.customer.id)
        self.assertIsNone(err)
        self.assertIsNotNone(attempt_res)
        self.assertEqual(attempt_res["amount_paise"], 33000) # (300 + 30 delivery) * 100

        rzp_order_id = attempt_res["razorpay_order_id"]
        rzp_payment_id = f"pay_{uuid.uuid4().hex[:10]}"
        msg = f"{rzp_order_id}|{rzp_payment_id}".encode("utf-8")
        sig = hmac.new(self.secret.encode("utf-8"), msg, hashlib.sha256).hexdigest()

        capture_res, cap_err = PaymentService.verify_and_capture_payment({
            "razorpay_order_id": rzp_order_id,
            "razorpay_payment_id": rzp_payment_id,
            "razorpay_signature": sig
        }, key_secret=self.secret)

        self.assertIsNone(cap_err)
        self.assertIsNotNone(capture_res)
        self.assertEqual(capture_res["payment_status"], "COMPLETED")

    def test_webhook_event_idempotency(self):
        evt_data = {
            "event_id": f"evt_{uuid.uuid4().hex}",
            "event": "payment.captured",
            "payload": {"payment": {"id": "pay_test_123"}}
        }

        res1, err1 = PaymentService.process_webhook_event(evt_data)
        self.assertIsNone(err1)
        self.assertEqual(res1["status"], "success")

        # Duplicate delivery of same event_id
        res2, err2 = PaymentService.process_webhook_event(evt_data)
        self.assertIsNone(err2)
        self.assertEqual(res2["status"], "already_processed")

if __name__ == "__main__":
    unittest.main()
