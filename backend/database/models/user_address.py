import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, DateTime, Float, ForeignKey, Index, text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database.connection import db

class UserAddress(db.Model):
    __tablename__ = "user_addresses"
    __table_args__ = (
        Index("idx_user_addresses_user_label", "user_id", "label"),
    )


    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()")
    )
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    label: Mapped[str] = mapped_column(String(50), nullable=False, default="Home")
    address_line: Mapped[str] = mapped_column(String(500), nullable=False)
    latitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    longitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    user: Mapped["User"] = relationship("User", back_populates="addresses")

    def to_dict(self):
        return {
            "id": str(self.id),
            "user_id": str(self.user_id),
            "label": self.label,
            "address_line": self.address_line,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
