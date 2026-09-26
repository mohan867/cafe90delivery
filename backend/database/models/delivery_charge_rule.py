import uuid
from decimal import Decimal
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, Numeric, Boolean, DateTime, ForeignKey, CheckConstraint, text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database.connection import db

class DeliveryChargeRule(db.Model):
    __tablename__ = "delivery_charge_rules"
    __table_args__ = (
        CheckConstraint("min_distance_km >= 0", name="chk_rule_min_distance_positive"),
        CheckConstraint("max_distance_km > min_distance_km", name="chk_rule_max_gt_min"),
        CheckConstraint("charge >= 0", name="chk_rule_charge_positive"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()")
    )
    min_distance_km: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    max_distance_km: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    charge: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )
    created_by_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    def to_dict(self):
        return {
            "id": str(self.id),
            "min_distance_km": float(self.min_distance_km),
            "max_distance_km": float(self.max_distance_km),
            "charge": float(self.charge),
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

class DeliveryChargeRuleLog(db.Model):
    __tablename__ = "delivery_charge_rule_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()")
    )
    rule_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("delivery_charge_rules.id", ondelete="SET NULL"), nullable=True)
    changed_by_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action: Mapped[str] = mapped_column(String(50), nullable=False)  # CREATE, UPDATE, DISABLE, DELETE
    details: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    def to_dict(self):
        return {
            "id": str(self.id),
            "rule_id": str(self.rule_id) if self.rule_id else None,
            "changed_by": str(self.changed_by_user_id) if self.changed_by_user_id else None,
            "action": self.action,
            "details": self.details or "",
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
