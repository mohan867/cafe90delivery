import enum
import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, Boolean, DateTime, Enum, Float, text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database.connection import db

class UserRole(str, enum.Enum):
    CUSTOMER = "customer"
    ADMIN = "admin"
    DELIVERY_PARTNER = "delivery_partner"

class PartnerStatus(str, enum.Enum):
    AVAILABLE = "AVAILABLE"
    ON_DELIVERY = "ON_DELIVERY"
    ON_LEAVE = "ON_LEAVE"
    OFF_DUTY = "OFF_DUTY"

class User(db.Model):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()")
    )
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(100), nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role_enum", native_enum=False),
        nullable=False,
        default=UserRole.CUSTOMER,
        index=True
    )
    partner_status: Mapped[PartnerStatus] = mapped_column(
        Enum(PartnerStatus, name="partner_status_enum", native_enum=False),
        nullable=False,
        default=PartnerStatus.AVAILABLE
    )
    current_latitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    current_longitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
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

    # Relationships
    cart: Mapped[Optional["Cart"]] = relationship("Cart", back_populates="user", uselist=False, cascade="all, delete-orphan")
    customer_orders: Mapped[list["Order"]] = relationship("Order", back_populates="customer", foreign_keys="Order.customer_id")
    assigned_orders: Mapped[list["Order"]] = relationship("Order", back_populates="delivery_partner", foreign_keys="Order.delivery_partner_id")
    addresses: Mapped[list["UserAddress"]] = relationship("UserAddress", back_populates="user", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": str(self.id),
            "email": self.email,
            "full_name": self.full_name,
            "phone": self.phone or "",
            "role": self.role.value if isinstance(self.role, UserRole) else self.role,
            "partner_status": self.partner_status.value if isinstance(self.partner_status, PartnerStatus) else self.partner_status,
            "current_latitude": self.current_latitude,
            "current_longitude": self.current_longitude,
            "avatar_url": self.avatar_url or "",
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
