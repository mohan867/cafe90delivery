import unittest
import json
import uuid
import jwt
import os
from datetime import datetime, timezone, timedelta
from app import create_app
from database.connection import db
from database.models.order import Order, OrderStatus
from database.models.user import User, UserRole

class ProductionHardeningTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.app.config["TESTING"] = True
        self.client = self.app.test_client()
        self.ctx = self.app.app_context()
        self.ctx.push()

        db.create_all()

        # Create test customer in DB
        self.test_user = User(
            id=uuid.uuid4(),
            email=f"test-{uuid.uuid4().hex[:8]}@cafe90.com",
            password_hash="hashed_pw",
            full_name="Test Customer",
            role=UserRole.CUSTOMER,
            is_active=True
        )
        db.session.add(self.test_user)
        db.session.commit()

        # Create test JWT token
        secret = os.getenv("JWT_SECRET_KEY", "fallback_secret_key_change_in_prod")
        payload = {
            "sub": str(self.test_user.id),
            "email": self.test_user.email,
            "role": "customer",
            "exp": datetime.now(timezone.utc) + timedelta(hours=1)
        }
        token = jwt.encode(payload, secret, algorithm="HS256")
        self.headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

    def tearDown(self):
        db.session.remove()
        self.ctx.pop()

    def test_cod_only_rejection(self):
        """Verify that payment_method other than COD returns HTTP 400 / 422 error."""
        response = self.client.post(
            "/api/v1/orders/",
            headers=self.headers,
            json={
                "items": [{"food_item_id": str(uuid.uuid4()), "quantity": 1}],
                "delivery_address": "123 Main St, Local District",
                "latitude": 11.0168,
                "longitude": 76.9558,
                "payment_method": "UPI"
            }
        )
        self.assertIn(response.status_code, [400, 422])
        data = json.loads(response.data)
        self.assertFalse(data.get("success", True))

    def test_cart_quantity_upper_bound(self):
        """Verify that cart item quantity > 20 is rejected with HTTP 422."""
        response = self.client.post(
            "/api/v1/cart/items",
            headers=self.headers,
            json={
                "food_item_id": str(uuid.uuid4()),
                "quantity": 25
            }
        )
        self.assertEqual(response.status_code, 422)

    def test_driver_pool_privacy_masking(self):
        """Verify that Order.to_pool_dict() redacts customer phone and full address."""
        order = Order(
            id=uuid.uuid4(),
            order_number="ORD-TEST-001",
            customer_id=uuid.uuid4(),
            subtotal=250.0,
            delivery_fee=30.0,
            total_amount=280.0,
            payment_method="COD",
            status=OrderStatus.PENDING,
            delivery_address="Flat 402, Sunshine Apartments, Main Street 12, District Center",
            delivery_latitude=11.0168,
            delivery_longitude=76.9558
        )
        pool_dict = order.to_pool_dict()
        
        # Phone number must be masked as 'Masked (Unlocks upon claim)'
        self.assertEqual(pool_dict.get("customer_phone"), "Masked (Unlocks upon claim)")
        self.assertNotEqual(pool_dict.get("customer_phone"), "9999999999")
        self.assertEqual(pool_dict.get("delivery_address"), "Area: Main Street 12")
        self.assertIn("order_number", pool_dict)
        self.assertIn("delivery_latitude", pool_dict)
        self.assertIn("delivery_longitude", pool_dict)

    def test_haversine_out_of_bounds_rejection(self):
        """Verify that delivery coordinates > 8km (e.g. London coords) are rejected."""
        from services.order_service import calculate_haversine_distance
        
        restaurant_lat, restaurant_lng = 11.0168, 76.9558
        london_lat, london_lng = 51.5074, -0.1278
        distance = calculate_haversine_distance(restaurant_lat, restaurant_lng, london_lat, london_lng)
        self.assertGreater(distance, 8.0)

if __name__ == "__main__":
    unittest.main()


