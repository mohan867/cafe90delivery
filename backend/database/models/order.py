import enum
import uuid
from decimal import Decimal
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import String, Text, Numeric, DateTime, Enum, ForeignKey, CheckConstraint, Index, text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database.connection import db

class PaymentMethod(str, enum.Enum):
    COD = "COD"
    CARD = "CARD"
    UPI = "UPI"

class PaymentStatus(str, enum.Enum):
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"

class OrderStatus(str, enum.Enum):
    PENDING = "PENDING"
    CONFIRMED = "CONFIRMED"
    PREPARING = "PREPARING"
    READY_FOR_PICKUP = "READY_FOR_PICKUP"
    OUT_FOR_DELIVERY = "OUT_FOR_DELIVERY"
    DELIVERED = "DELIVERED"
    CANCELLED = "CANCELLED"

class Order(db.Model):
    __tablename__ = "orders"
    __table_args__ = (
        CheckConstraint("subtotal >= 0", name="chk_order_subtotal_positive"),
        CheckConstraint("delivery_fee >= 0", name="chk_order_delivery_fee_positive"),
        CheckConstraint("total_amount >= 0", name="chk_order_total_positive"),
        Index("idx_orders_customer_created", "customer_id", text("created_at DESC")),
        Index("idx_orders_partner_status", "delivery_partner_id", "status"),
        Index("idx_orders_unassigned_pool", "status", "delivery_partner_id", postgresql_where=text("delivery_partner_id IS NULL")),
    )


    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()")
    )
    order_number: Mapped[str] = mapped_column(String(20), unique=True, nullable=False, index=True)
    idempotency_key: Mapped[Optional[str]] = mapped_column(String(100), unique=True, nullable=True, index=True)
    customer_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    delivery_partner_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    
    delivery_address: Mapped[str] = mapped_column(Text, nullable=False)
    delivery_latitude: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 7), nullable=True)
    delivery_longitude: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 7), nullable=True)
    delivery_landmark: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    delivery_distance_km: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2), nullable=True)
    pricing_rule_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("delivery_charge_rules.id", ondelete="SET NULL"), nullable=True)
    
    subtotal: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    delivery_fee: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=Decimal("30.00"))
    total_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    
    payment_method: Mapped[PaymentMethod] = mapped_column(
        Enum(PaymentMethod, name="payment_method_enum", native_enum=False),
        nullable=False,
        default=PaymentMethod.COD
    )
    payment_status: Mapped[PaymentStatus] = mapped_column(
        Enum(PaymentStatus, name="payment_status_enum", native_enum=False),
        nullable=False,
        default=PaymentStatus.PENDING
    )
    status: Mapped[OrderStatus] = mapped_column(
        Enum(OrderStatus, name="order_status_enum", native_enum=False),
        nullable=False,
        default=OrderStatus.PENDING,
        index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    customer: Mapped["User"] = relationship("User", back_populates="customer_orders", foreign_keys=[customer_id])
    delivery_partner: Mapped[Optional["User"]] = relationship("User", back_populates="assigned_orders", foreign_keys=[delivery_partner_id])
    items: Mapped[List["OrderItem"]] = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    timeline: Mapped[List["OrderStatusHistory"]] = relationship("OrderStatusHistory", back_populates="order", cascade="all, delete-orphan", order_by="OrderStatusHistory.created_at")

    def to_dict(self):
        return {
            "id": str(self.id),
            "order_number": self.order_number,
            "idempotency_key": self.idempotency_key,
            "customer_id": str(self.customer_id),
            "customer_name": self.customer.full_name if self.customer else "Customer",
            "customer_phone": self.customer.phone if self.customer else "",
            "delivery_partner_id": str(self.delivery_partner_id) if self.delivery_partner_id else None,
            "assigned_to": self.delivery_partner.full_name if self.delivery_partner else None,
            "partner_latitude": self.delivery_partner.current_latitude if self.delivery_partner else None,
            "partner_longitude": self.delivery_partner.current_longitude if self.delivery_partner else None,
            "delivery_address": self.delivery_address,
            "delivery_landmark": self.delivery_landmark or "",
            "delivery_latitude": float(self.delivery_latitude) if self.delivery_latitude else None,
            "delivery_longitude": float(self.delivery_longitude) if self.delivery_longitude else None,
            "subtotal": float(self.subtotal),
            "delivery_fee": float(self.delivery_fee),
            "total_amount": float(self.total_amount),
            "payment_method": self.payment_method.value if isinstance(self.payment_method, PaymentMethod) else self.payment_method,
            "payment_status": self.payment_status.value if isinstance(self.payment_status, PaymentStatus) else self.payment_status,
            "status": self.status.value if isinstance(self.status, OrderStatus) else self.status,
            "items": [item.to_dict() for item in self.items],
            "timeline": [t.to_dict() for t in self.timeline],
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def to_pool_dict(self):
        """Masks sensitive customer PII (phone number, exact street address, and exact lat/lng) for unclaimed driver pool."""
        d = self.to_dict()
        d["customer_phone"] = "Masked (Unlocks upon claim)"
        d["delivery_latitude"] = None
        d["delivery_longitude"] = None
        if self.delivery_landmark and len(self.delivery_landmark.strip()) > 0:
            d["delivery_address"] = f"Area: {self.delivery_landmark.strip()}"
        else:
            parts = [p.strip() for p in self.delivery_address.split(",") if p.strip()]
            area_str = parts[-2] if len(parts) >= 2 else (parts[0] if parts else "Local District")
            d["delivery_address"] = f"Area: {area_str}"
        return d


class OrderItem(db.Model):
    __tablename__ = "order_items"
    __table_args__ = (
        CheckConstraint("quantity > 0", name="chk_order_item_quantity_positive"),
        CheckConstraint("unit_price >= 0", name="chk_order_item_price_positive"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()")
    )
    order_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    food_item_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("food_items.id", ondelete="SET NULL"), nullable=True)
    item_name: Mapped[str] = mapped_column(String(100), nullable=False) # Snapshot
    unit_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False) # Snapshot
    quantity: Mapped[int] = mapped_column(nullable=False)
    subtotal: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)

    order: Mapped["Order"] = relationship("Order", back_populates="items")

    def to_dict(self):
        return {
            "id": str(self.id),
            "food_item_id": str(self.food_item_id) if self.food_item_id else None,
            "name": self.item_name,
            "unit_price": float(self.unit_price),
            "quantity": self.quantity,
            "subtotal": float(self.subtotal)
        }

class OrderStatusHistory(db.Model):
    __tablename__ = "order_status_history"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()")
    )
    order_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(30), nullable=False)
    changed_by_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    order: Mapped["Order"] = relationship("Order", back_populates="timeline")

    def to_dict(self):
        return {
            "id": str(self.id),
            "status": self.status,
            "changed_by": str(self.changed_by_user_id) if self.changed_by_user_id else None,
            "notes": self.notes or "",
            "timestamp": self.created_at.isoformat() if self.created_at else None
        }
