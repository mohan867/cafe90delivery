import unittest
import uuid
import time
from datetime import datetime, timezone, timedelta
from app import create_app
from database.connection import db
from database.models.user import User, UserRole, PartnerStatus
from services.delivery_service import DeliveryService

class TestLocationStreamAndFilters(unittest.TestCase):
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
        self.driver = User(
            id=uuid.uuid4(),
            email=f"speed-driver-{uuid.uuid4().hex[:6]}@cafe90.com",
            password_hash="hashed_pw",
            full_name="Speed Driver",
            role=UserRole.DELIVERY_PARTNER,
            partner_status=PartnerStatus.AVAILABLE,
            current_latitude=11.2448,
            current_longitude=77.5172,
            updated_at=datetime.now(timezone.utc),
            is_active=True
        )
        db.session.add(self.driver)
        db.session.commit()

    def test_speed_jump_rejection(self):
        """Verify speed jump > 80 km/h (e.g. 50km movement in 5 seconds) gets rejected."""
        # Initial pos: 11.2448, 77.5172
        # Teleport 50km away within 5 seconds
        res, err = DeliveryService.update_partner_live_location(self.driver.id, 11.7500, 77.9000)
        self.assertIsNone(res)
        self.assertIsNotNone(err)
        self.assertIn("GPS anomaly detected", err)

    def test_normal_speed_location_update(self):
        """Verify normal movement (e.g. 200m in 10s) succeeds."""
        # Set updated_at to 10 seconds ago
        self.driver.updated_at = datetime.now(timezone.utc) - timedelta(seconds=15)
        db.session.commit()

        # Move ~150 meters away (11.2460, 77.5180)
        res, err = DeliveryService.update_partner_live_location(self.driver.id, 11.2460, 77.5180)
        self.assertIsNotNone(res)
        self.assertIsNone(err)
        self.assertEqual(res["current_latitude"], 11.2460)

if __name__ == "__main__":
    unittest.main()
