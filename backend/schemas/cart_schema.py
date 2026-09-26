from pydantic import BaseModel, Field

class AddToCartSchema(BaseModel):
    food_item_id: str
    quantity: int = Field(1, ge=1, le=20)

class UpdateCartItemSchema(BaseModel):
    quantity: int = Field(..., ge=1, le=20)

