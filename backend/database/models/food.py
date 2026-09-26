import enum
import uuid
from decimal import Decimal
from datetime import datetime, timezone
from typing import Optional, List
from sqlalchemy import String, Text, Numeric, Boolean, DateTime, Enum, ForeignKey, text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database.connection import db

class DietType(str, enum.Enum):
    VEG = "veg"
    NON_VEG = "non-veg"

class FoodCategory(db.Model):
    __tablename__ = "food_categories"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()")
    )
    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    display_order: Mapped[int] = mapped_column(default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    food_items: Mapped[List["FoodItem"]] = relationship("FoodItem", back_populates="category")

    def to_dict(self):
        return {
            "id": str(self.id),
            "name": self.name,
            "description": self.description or "",
            "display_order": self.display_order,
            "is_active": self.is_active,
        }

class FoodItem(db.Model):
    __tablename__ = "food_items"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()")
    )
    category_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("food_categories.id", ondelete="RESTRICT"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    image_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    diet_type: Mapped[DietType] = mapped_column(
        Enum(DietType, name="diet_type_enum", native_enum=False),
        nullable=False,
        default=DietType.VEG
    )
    is_available: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)
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

    category: Mapped["FoodCategory"] = relationship("FoodCategory", back_populates="food_items")

    def to_dict(self):
        return {
            "id": str(self.id),
            "category_id": str(self.category_id),
            "category_name": self.category.name if self.category else "",
            "name": self.name,
            "description": self.description or "",
            "price": float(self.price), # Serialized as float for JSON, stored as Decimal
            "image_url": self.image_url or "",
            "diet_type": self.diet_type.value if isinstance(self.diet_type, DietType) else self.diet_type,
            "is_available": self.is_available,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
