from pydantic import BaseModel, Field
from typing import Optional

class PlaceOrderSchema(BaseModel):
    delivery_address: str = Field(..., min_length=5, max_length=500)
    delivery_landmark: Optional[str] = Field(None, max_length=200)
    delivery_latitude: Optional[float] = Field(None, ge=-90.0, le=90.0)
    delivery_longitude: Optional[float] = Field(None, ge=-180.0, le=180.0)
    payment_method: str = Field("COD", pattern="^(COD)$")
    idempotency_key: Optional[str] = Field(None, max_length=100)


class UpdateOrderStatusSchema(BaseModel):
    status: str = Field(..., pattern="^(PENDING|CONFIRMED|PREPARING|READY_FOR_PICKUP|OUT_FOR_DELIVERY|DELIVERED|CANCELLED)$")
    notes: Optional[str] = None

class AssignOrderSchema(BaseModel):
    delivery_partner_id: str
