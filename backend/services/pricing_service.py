import uuid
from decimal import Decimal
from datetime import datetime, timezone
from database.connection import db
from database.models.delivery_charge_rule import DeliveryChargeRule, DeliveryChargeRuleLog

DEFAULT_RULES = [
    {"min": Decimal("0.00"), "max": Decimal("2.00"), "charge": Decimal("20.00")},
    {"min": Decimal("2.00"), "max": Decimal("5.00"), "charge": Decimal("35.00")},
    {"min": Decimal("5.00"), "max": Decimal("8.00"), "charge": Decimal("50.00")},
]

class PricingService:
    @staticmethod
    def calculate_delivery_charge(distance_km: float):
        """
        Calculates dynamic delivery fee based on DB rules or standard district defaults.
        Boundaries operate on half-open interval [min_distance_km, max_distance_km).
        Returns tuple: (charge_decimal, rule_id, error_message).
        """
        dist = Decimal(str(round(distance_km, 2)))
        if dist > Decimal("8.00"):
            return None, None, f"Selected location ({dist:.1f} km away) exceeds our 8.0 km local district delivery radius."

        # Fetch active database rules
        active_rules = db.session.query(DeliveryChargeRule).filter_by(is_active=True).order_by(DeliveryChargeRule.min_distance_km.asc()).all()

        if active_rules:
            for rule in active_rules:
                # Half-open interval matching: min <= dist < max (or <= max if at max bound)
                if rule.min_distance_km <= dist < rule.max_distance_km or (dist == rule.max_distance_km and rule.max_distance_km == Decimal("8.00")):
                    return rule.charge, rule.id, None

            return None, None, f"No matching delivery pricing rule found for distance {dist:.2f} km."

        # Fallback to standard district defaults if database rules table is empty
        for rule in DEFAULT_RULES:
            if rule["min"] <= dist < rule["max"] or (dist == rule["max"] and rule["max"] == Decimal("8.00")):
                return rule["charge"], None, None

        return Decimal("30.00"), None, None

    @staticmethod
    def validate_rule_bounds(min_km: Decimal, max_km: Decimal, exclude_rule_id=None):
        """
        Validates distance boundaries against active DB rules to prevent overlaps and invalid ranges.
        """
        if min_km < Decimal("0.00"):
            return "Minimum distance cannot be negative."
        if max_km <= min_km:
            return "Maximum distance must be strictly greater than minimum distance."
        if max_km > Decimal("8.00"):
            return "Maximum distance cannot exceed maximum district radius of 8.0 km."

        query = db.session.query(DeliveryChargeRule).filter_by(is_active=True)
        if exclude_rule_id:
            query = query.filter(DeliveryChargeRule.id != exclude_rule_id)

        existing_rules = query.all()

        for existing in existing_rules:
            # Overlap check: min < existing.max AND max > existing.min
            if min_km < existing.max_distance_km and max_km > existing.min_distance_km:
                return f"Distance range [{min_km}, {max_km}) overlaps with active rule [{existing.min_distance_km}, {existing.max_distance_km})."

        return None

    @staticmethod
    def get_all_rules():
        rules = db.session.query(DeliveryChargeRule).order_by(DeliveryChargeRule.min_distance_km.asc()).all()
        return [r.to_dict() for r in rules]

    @staticmethod
    def create_rule(data, user_id):
        try:
            min_km = Decimal(str(data["min_distance_km"]))
            max_km = Decimal(str(data["max_distance_km"]))
            charge = Decimal(str(data["charge"]))

            err = PricingService.validate_rule_bounds(min_km, max_km)
            if err:
                return None, err

            rule = DeliveryChargeRule(
                min_distance_km=min_km,
                max_distance_km=max_km,
                charge=charge,
                is_active=data.get("is_active", True),
                created_by_user_id=user_id
            )
            db.session.add(rule)
            db.session.flush()

            # Audit Log
            log = DeliveryChargeRuleLog(
                rule_id=rule.id,
                changed_by_user_id=user_id,
                action="CREATE",
                details=f"Created rule [{min_km}-{max_km} km] @ ₹{charge}"
            )
            db.session.add(log)
            db.session.commit()
            return rule.to_dict(), None
        except Exception as e:
            db.session.rollback()
            return None, str(e)

    @staticmethod
    def update_rule(rule_id_str, data, user_id):
        try:
            rule_uuid = uuid.UUID(rule_id_str)
            rule = db.session.get(DeliveryChargeRule, rule_uuid)
            if not rule:
                return None, "Pricing rule not found"

            min_km = Decimal(str(data.get("min_distance_km", rule.min_distance_km)))
            max_km = Decimal(str(data.get("max_distance_km", rule.max_distance_km)))
            charge = Decimal(str(data.get("charge", rule.charge)))

            err = PricingService.validate_rule_bounds(min_km, max_km, exclude_rule_id=rule.id)
            if err:
                return None, err

            old_details = f"[{rule.min_distance_km}-{rule.max_distance_km} km] @ ₹{rule.charge}"

            rule.min_distance_km = min_km
            rule.max_distance_km = max_km
            rule.charge = charge
            if "is_active" in data:
                rule.is_active = bool(data["is_active"])

            # Audit Log
            log = DeliveryChargeRuleLog(
                rule_id=rule.id,
                changed_by_user_id=user_id,
                action="UPDATE",
                details=f"Updated from {old_details} to [{min_km}-{max_km} km] @ ₹{charge}"
            )
            db.session.add(log)
            db.session.commit()
            return rule.to_dict(), None
        except Exception as e:
            db.session.rollback()
            return None, str(e)
