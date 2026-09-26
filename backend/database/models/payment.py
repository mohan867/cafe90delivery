import enum
import uuid
from decimal import Decimal
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, Text, Numeric, DateTime, Enum, ForeignKey, CheckConstraint, Index, Boolean, text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database.connection import db

class PaymentAttemptStatus(str, enum.Enum):
    CREATED = "CREATED"
    AUTHORIZED = "AUTHORIZED"
    CAPTURED = "CAPTURED"
    FAILED = "FAILED"
    REFUND_PENDING = "REFUND_PENDING"
    REFUNDED = "REFUNDED"

class PaymentAttempt(db.Model):
    __tablename__ = "payment_attempts"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()")
    )
    order_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    razorpay_order_id: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    amount_paise: Mapped[int] = mapped_column(nullable=False)
    currency: Mapped[str] = mapped_column(String(10), default="INR", nullable=False)
    status: Mapped[PaymentAttemptStatus] = mapped_column(
        Enum(PaymentAttemptStatus, name="payment_attempt_status_enum", native_enum=False),
        default=PaymentAttemptStatus.CREATED,
        nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    transactions: Mapped[list["PaymentTransaction"]] = relationship("PaymentTransaction", back_populates="attempt", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": str(self.id),
            "order_id": str(self.order_id),
            "razorpay_order_id": self.razorpay_order_id,
            "amount_paise": self.amount_paise,
            "amount_inr": self.amount_paise / 100.0,
            "currency": self.currency,
            "status": self.status.value if isinstance(self.status, PaymentAttemptStatus) else self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

class PaymentTransaction(db.Model):
    __tablename__ = "payment_transactions"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()")
    )
    payment_attempt_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("payment_attempts.id", ondelete="CASCADE"), nullable=False, index=True)
    razorpay_payment_id: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    razorpay_signature: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    signature_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    amount_paise: Mapped[int] = mapped_column(nullable=False)
    payment_method_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True) # card, upi, netbanking
    error_code: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    error_description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    attempt: Mapped["PaymentAttempt"] = relationship("PaymentAttempt", back_populates="transactions")

    def to_dict(self):
        return {
            "id": str(self.id),
            "payment_attempt_id": str(self.payment_attempt_id),
            "razorpay_payment_id": self.razorpay_payment_id,
            "signature_verified": self.signature_verified,
            "amount_paise": self.amount_paise,
            "amount_inr": self.amount_paise / 100.0,
            "payment_method_type": self.payment_method_type,
            "error_code": self.error_code,
            "error_description": self.error_description,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

class PaymentWebhookLog(db.Model):
    __tablename__ = "payment_webhook_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()")
    )
    event_id: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True) # Razorpay Event ID for Idempotency
    event_type: Mapped[str] = mapped_column(String(100), nullable=False) # e.g. payment.captured, payment.failed
    payload_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    processed: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    def to_dict(self):
        return {
            "id": str(self.id),
            "event_id": self.event_id,
            "event_type": self.event_type,
            "processed": self.processed,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
