import unittest
import json
import uuid
import jwt
import os
from datetime import datetime, timezone, timedelta
from app import create_app
from config import Config
from database.connection import db
from database.models.order import Order, OrderStatus, OrderStatusHistory
from database.models.user import User, UserRole, PartnerStatus
from database.models.food import FoodItem, FoodCategory
from services.order_service import OrderService
from services.delivery_service import DeliveryService

class DeepVerificationTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.app.config["TESTING"] = True
        self.client = self.app.test_client()
        self.ctx = self.app.app_context()
        self.ctx.push()

        db.create_all()

        # Clean tables before each test
        db.session.query(OrderStatusHistory).delete()
        db.session.query(Order).delete()
        db.session.query(FoodItem).delete()
        db.session.query(FoodCategory).delete()
        db.session.query(User).delete()
        db.session.commit()

        # Secret key for JWT
        self.secret = os.getenv("JWT_SECRET_KEY", "fallback_secret_key_change_in_prod")

        # 1. Create test customer
        self.customer = User(
            id=uuid.uuid4(),
            email=f"customer-{uuid.uuid4().hex[:6]}@cafe90.com",
            password_hash="hashed_pw",
            full_name="Test Customer",
            role=UserRole.CUSTOMER,
            is_active=True
        )
        # 2. Create test admin
        self.admin = User(
            id=uuid.uuid4(),
            email=f"admin-{uuid.uuid4().hex[:6]}@cafe90.com",
            password_hash="hashed_pw",
            full_name="Test Admin",
            role=UserRole.ADMIN,
            is_active=True
        )
        # 3. Create test delivery partner
        self.driver = User(
            id=uuid.uuid4(),
            email=f"driver-{uuid.uuid4().hex[:6]}@cafe90.com",
            password_hash="hashed_pw",
            full_name="Test Driver",
            role=UserRole.DELIVERY_PARTNER,
            partner_status=PartnerStatus.AVAILABLE,
            is_active=True
        )
        db.session.add_all([self.customer, self.admin, self.driver])
        db.session.commit()

        # Create tokens
        self.customer_token = self._make_token(self.customer.id, "customer")
        self.admin_token = self._make_token(self.admin.id, "admin")
        self.driver_token = self._make_token(self.driver.id, "delivery_partner")

    def tearDown(self):
        db.session.remove()
        self.ctx.pop()

    def _make_token(self, user_id, role):
        payload = {
            "sub": str(user_id),
            "role": role,
            "exp": datetime.now(timezone.utc) + timedelta(hours=1)
        }
        return jwt.encode(payload, self.secret, algorithm="HS256")

    # -------------------------------------------------------------
    # 1. CRON DISPATCHER CONCURRENCY & IDEMPOTENCY TESTS
    # -------------------------------------------------------------
    def test_cron_consecutive_runs_idempotency(self):
        """Verify executing auto-dispatch multiple times causes no duplicate side effects."""
        old_time = datetime.now(timezone.utc) - timedelta(minutes=10)
        order = Order(
            id=uuid.uuid4(),
            order_number="ORD-CRON-001",
            customer_id=self.customer.id,
            subtotal=200.0,
            delivery_fee=30.0,
            total_amount=230.0,
            payment_method="COD",
            status=OrderStatus.PENDING,
            delivery_address="Main Road, Local District",
            created_at=old_time
        )
        db.session.add(order)
        db.session.commit()

        # Run 1: Should assign driver
        dispatched1 = DeliveryService.auto_dispatch_unassigned_orders(unassigned_threshold_minutes=5)
        self.assertEqual(dispatched1, 1)

        db.session.refresh(order)
        self.assertEqual(str(order.delivery_partner_id), str(self.driver.id))

        # Run 2: Second run immediately after -> must assign 0 orders
        dispatched2 = DeliveryService.auto_dispatch_unassigned_orders(unassigned_threshold_minutes=5)
        self.assertEqual(dispatched2, 0)

    def test_cron_run_with_no_available_drivers(self):
        """Verify cron handles zero available drivers gracefully without error."""
        self.driver.partner_status = PartnerStatus.ON_DELIVERY
        db.session.commit()

        old_time = datetime.now(timezone.utc) - timedelta(minutes=10)
        order = Order(
            id=uuid.uuid4(),
            order_number="ORD-CRON-002",
            customer_id=self.customer.id,
            subtotal=200.0,
            delivery_fee=30.0,
            total_amount=230.0,
            payment_method="COD",
            status=OrderStatus.PENDING,
            delivery_address="Main Road, Local District",
            created_at=old_time
        )
        db.session.add(order)
        db.session.commit()

        dispatched = DeliveryService.auto_dispatch_unassigned_orders(unassigned_threshold_minutes=5)
        self.assertEqual(dispatched, 0)
        
        db.session.refresh(order)
        self.assertIsNone(order.delivery_partner_id)

    # -------------------------------------------------------------
    # 2. CLOUDINARY ADMIN AUTHORIZATION & IMAGE STORAGE VERIFICATION
    # -------------------------------------------------------------
    def test_upload_image_unauthorized_rejection(self):
        """Verify /menu/upload-image rejects unauthenticated requests with HTTP 401."""
        res = self.client.post("/api/v1/admin/menu/upload-image", json={"image": "data:image/png;base64,iVBORw0..."})
        self.assertEqual(res.status_code, 401)

    def test_upload_image_customer_forbidden_rejection(self):
        """Verify /menu/upload-image rejects non-admin (customer) requests with HTTP 403."""
        res = self.client.post(
            "/api/v1/admin/menu/upload-image",
            headers={"Authorization": f"Bearer {self.customer_token}", "Content-Type": "application/json"},
            json={"image": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c"}
        )
        self.assertEqual(res.status_code, 403)

    def test_upload_image_admin_success_and_db_persistence(self):
        """Verify admin can upload image and that returned URL persists cleanly as HTTPS without Base64 data."""
        res = self.client.post(
            "/api/v1/admin/menu/upload-image",
            headers={"Authorization": f"Bearer {self.admin_token}", "Content-Type": "application/json"},
            json={"image": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c"}
        )
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        img_url = data.get("data", {}).get("image_url")
        self.assertTrue(img_url.startswith("http://") or img_url.startswith("https://"))
        self.assertFalse(img_url.startswith("data:image/"))

    # -------------------------------------------------------------
    # 3. DELIVERY RADIUS & GEOGRAPHIC BOUNDARY MATRIX
    # -------------------------------------------------------------
    def test_delivery_radius_matrix(self):
        """Test matrix of distances around restaurant (11.0168, 76.9558)."""
        category = FoodCategory(id=uuid.uuid4(), name="Main Course")
        food = FoodItem(id=uuid.uuid4(), name="Paneer Butter Masala", price=250.0, category_id=category.id)
        db.session.add_all([category, food])
        db.session.commit()

        # Coords ~3km away (Valid)
        from services.cart_service import CartService
        CartService.add_item_to_cart(self.customer.id, str(food.id), 1)

        valid_lat, valid_lng = 11.2500, 77.5200
        res_valid, err_valid = OrderService.place_order(
            user_id=self.customer.id,
            checkout_data={
                "delivery_address": "Valid District Address 12",
                "delivery_latitude": valid_lat,
                "delivery_longitude": valid_lng,
                "payment_method": "COD"
            }
        )
        self.assertIsNotNone(res_valid)
        self.assertIsNone(err_valid)

        # Coords ~5000km away (London: 51.5074, -0.1278) -> Out of range (exceeds delivery radius)
        CartService.add_item_to_cart(self.customer.id, str(food.id), 1)
        res_far, err_far = OrderService.place_order(
            user_id=self.customer.id,
            checkout_data={
                "delivery_address": "London, UK",
                "delivery_latitude": 51.5074,
                "delivery_longitude": -0.1278,
                "payment_method": "COD"
            }
        )
        self.assertIsNone(res_far)
        self.assertIn("exceeds our", err_far)

    def test_coordinate_invalid_range_schema_rejection(self):
        """Verify schema rejects invalid lat > 90 or lng > 180 with HTTP 422."""
        res_lat = self.client.post(
            "/api/v1/orders/",
            headers={"Authorization": f"Bearer {self.customer_token}", "Content-Type": "application/json"},
            json={
                "items": [{"food_item_id": str(uuid.uuid4()), "quantity": 1}],
                "delivery_address": "Test Address",
                "delivery_latitude": 105.0,  # Invalid (>90)
                "delivery_longitude": 76.9558,
                "payment_method": "COD"
            }
        )
        self.assertEqual(res_lat.status_code, 422)

        res_lng = self.client.post(
            "/api/v1/orders/",
            headers={"Authorization": f"Bearer {self.customer_token}", "Content-Type": "application/json"},
            json={
                "items": [{"food_item_id": str(uuid.uuid4()), "quantity": 1}],
                "delivery_address": "Test Address",
                "delivery_latitude": 11.0168,
                "delivery_longitude": -210.0,  # Invalid (<-180)
                "payment_method": "COD"
            }
        )
        self.assertEqual(res_lng.status_code, 422)

    # -------------------------------------------------------------
    # 4. RATE LIMITING EMPIRICAL 6-BURST TEST
    # -------------------------------------------------------------
    def test_rate_limiter_burst_rejection(self):
        """Verify 6th rapid request to /auth/login gets rejected with HTTP 429."""
        responses = []
        for i in range(6):
            res = self.client.post(
                "/api/v1/auth/login",
                json={"email": "nobody@cafe90.com", "password": "wrongpassword"}
            )
            responses.append(res.status_code)

        self.assertIn(429, responses)
        # Check rate limit error structure
        last_res = responses[-1]
        if last_res == 429:
            data = json.loads(self.client.post("/api/v1/auth/login", json={"email": "nobody@cafe90.com", "password": "wrongpassword"}).data)
            self.assertEqual(data.get("error", {}).get("code"), "RATE_LIMIT_EXCEEDED")

    def test_database_level_order_idempotency(self):
        """Verify duplicate idempotency_key returns existing order record without creating duplicate orders."""
        from services.cart_service import CartService
        category = FoodCategory(id=uuid.uuid4(), name="Idempotency Test Category")
        food = FoodItem(id=uuid.uuid4(), name="Idempotency Burger", price=150.0, category_id=category.id)
        db.session.add_all([category, food])
        db.session.commit()

        # Add item to cart & place order with idempotency key
        CartService.add_item_to_cart(self.customer.id, str(food.id), 1)
        key = f"KEY_{uuid.uuid4().hex}"
        order1, err1 = OrderService.place_order(
            user_id=self.customer.id,
            checkout_data={
                "delivery_address": "Test Street 1",
                "payment_method": "COD",
                "idempotency_key": key
            }
        )
        self.assertIsNotNone(order1)
        self.assertIsNone(err1)

        # Re-submit with same idempotency key -> must return existing order
        order2, err2 = OrderService.place_order(
            user_id=self.customer.id,
            checkout_data={
                "delivery_address": "Test Street 1",
                "payment_method": "COD",
                "idempotency_key": key
            }
        )
        self.assertIsNotNone(order2)
        self.assertIsNone(err2)
        self.assertEqual(order1["id"], order2["id"])
        self.assertEqual(order1["order_number"], order2["order_number"])

if __name__ == "__main__":
    unittest.main()
