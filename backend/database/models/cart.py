import uuid
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import DateTime, ForeignKey, UniqueConstraint, CheckConstraint, text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database.connection import db

class Cart(db.Model):
    __tablename__ = "carts"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()")
    )
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
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

    user: Mapped["User"] = relationship("User", back_populates="cart")
    items: Mapped[List["CartItem"]] = relationship("CartItem", back_populates="cart", cascade="all, delete-orphan")

class CartItem(db.Model):
    __tablename__ = "cart_items"
    __table_args__ = (
        UniqueConstraint("cart_id", "food_item_id", name="uq_cart_food_item"),
        CheckConstraint("quantity > 0", name="chk_cart_quantity_positive"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()")
    )
    cart_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("carts.id", ondelete="CASCADE"), nullable=False, index=True)
    food_item_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("food_items.id", ondelete="CASCADE"), nullable=False)
    quantity: Mapped[int] = mapped_column(nullable=False, default=1)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    cart: Mapped["Cart"] = relationship("Cart", back_populates="items")
    food_item: Mapped["FoodItem"] = relationship("FoodItem")

    def to_dict(self):
        item_price = float(self.food_item.price) if self.food_item else 0.0
        return {
            "id": str(self.id),
            "cart_id": str(self.cart_id),
            "food_item_id": str(self.food_item_id),
            "name": self.food_item.name if self.food_item else "",
            "price": item_price,
            "quantity": self.quantity,
            "img": self.food_item.image_url if self.food_item else "",
            "subtotal": round(item_price * self.quantity, 2)
        }
