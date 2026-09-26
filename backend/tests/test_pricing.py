import unittest
from decimal import Decimal
from services.pricing_service import PricingService

from app import create_app
from database.connection import db

class TestPricingService(unittest.TestCase):
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


    def test_default_distance_boundaries(self):
        # 0.00 km -> 20.00
        charge, rule_id, err = PricingService.calculate_delivery_charge(0.0)
        self.assertIsNone(err)
        self.assertEqual(charge, Decimal("20.00"))

        # 1.99 km -> 20.00
        charge, rule_id, err = PricingService.calculate_delivery_charge(1.99)
        self.assertIsNone(err)
        self.assertEqual(charge, Decimal("20.00"))

        # 2.00 km -> 35.00
        charge, rule_id, err = PricingService.calculate_delivery_charge(2.00)
        self.assertIsNone(err)
        self.assertEqual(charge, Decimal("35.00"))

        # 4.99 km -> 35.00
        charge, rule_id, err = PricingService.calculate_delivery_charge(4.99)
        self.assertIsNone(err)
        self.assertEqual(charge, Decimal("35.00"))

        # 5.00 km -> 50.00
        charge, rule_id, err = PricingService.calculate_delivery_charge(5.00)
        self.assertIsNone(err)
        self.assertEqual(charge, Decimal("50.00"))

        # 8.00 km -> 50.00
        charge, rule_id, err = PricingService.calculate_delivery_charge(8.00)
        self.assertIsNone(err)
        self.assertEqual(charge, Decimal("50.00"))

        # 8.01 km -> Error (exceeds radius)
        charge, rule_id, err = PricingService.calculate_delivery_charge(8.01)
        self.assertIsNotNone(err)
        self.assertIn("exceeds our 8.0 km", err)

    def test_rule_boundary_validation(self):
        # Negative min
        err = PricingService.validate_rule_bounds(Decimal("-1.00"), Decimal("2.00"))
        self.assertEqual(err, "Minimum distance cannot be negative.")

        # max <= min
        err = PricingService.validate_rule_bounds(Decimal("3.00"), Decimal("2.00"))
        self.assertEqual(err, "Maximum distance must be strictly greater than minimum distance.")

        # max > 8.00
        err = PricingService.validate_rule_bounds(Decimal("5.00"), Decimal("9.00"))
        self.assertEqual(err, "Maximum distance cannot exceed maximum district radius of 8.0 km.")

if __name__ == "__main__":
    unittest.main()
