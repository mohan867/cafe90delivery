from pydantic import BaseModel, Field, condecimal
from decimal import Decimal
from typing import Optional

class FoodItemCreateSchema(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    category_id: str
    description: Optional[str] = None
    price: condecimal(gt=Decimal('0'), max_digits=10, decimal_places=2) # type: ignore
    image_url: Optional[str] = None
    diet_type: str = Field("veg", pattern="^(veg|non-veg)$")
    is_available: bool = True

class FoodItemUpdateSchema(BaseModel):
    name: Optional[str] = None
    category_id: Optional[str] = None
    description: Optional[str] = None
    price: Optional[condecimal(gt=Decimal('0'), max_digits=10, decimal_places=2)] = None # type: ignore
    image_url: Optional[str] = None
    diet_type: Optional[str] = None
    is_available: Optional[bool] = None

class FoodCategorySchema(BaseModel):
    name: str = Field(..., min_length=2, max_length=50)
    description: Optional[str] = None
    display_order: int = 0
