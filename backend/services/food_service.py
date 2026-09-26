import uuid
from decimal import Decimal
from database.connection import db
from database.models.food import FoodCategory, FoodItem, DietType

class FoodService:
    @staticmethod
    def get_all_categories():
        categories = db.session.query(FoodCategory).filter_by(is_active=True).order_by(FoodCategory.display_order.asc()).all()
        return [c.to_dict() for c in categories]

    @staticmethod
    def get_food_items(category_name=None, diet_type=None, search=None, include_unavailable=True, page=1, limit=100):
        query = db.session.query(FoodItem)
        if not include_unavailable:
            query = query.filter_by(is_available=True)
        
        if category_name and category_name != "All":
            query = query.join(FoodCategory).filter(FoodCategory.name == category_name)
            
        if diet_type and diet_type != "all":
            query = query.filter(FoodItem.diet_type == diet_type)
            
        if search:
            query = query.filter(FoodItem.name.ilike(f"%{search}%"))
            
        total_count = query.count()
        items = query.order_by(FoodItem.name.asc()).offset((page - 1) * limit).limit(limit).all()
        
        return {
            "items": [item.to_dict() for item in items],
            "meta": {
                "total": total_count,
                "page": page,
                "limit": limit
            }
        }

    @staticmethod
    def get_food_item_by_id(item_id_str):
        try:
            item_uuid = uuid.UUID(item_id_str)
            item = db.session.get(FoodItem, item_uuid)
            if not item or not item.is_available:
                return None, "Food item not found"
            return item.to_dict(), None
        except ValueError:
            return None, "Invalid Food Item ID format"

    @staticmethod
    def create_food_item(data):
        try:
            category_uuid = uuid.UUID(data["category_id"])
            category = db.session.get(FoodCategory, category_uuid)
            if not category:
                return None, "Category not found"
                
            diet = DietType.NON_VEG if data.get("diet_type") == "non-veg" else DietType.VEG
            
            food = FoodItem(
                category_id=category_uuid,
                name=data["name"].strip(),
                description=data.get("description"),
                price=Decimal(str(data["price"])),
                image_url=data.get("image_url"),
                diet_type=diet,
                is_available=data.get("is_available", True)
            )
            db.session.add(food)
            db.session.commit()
            return food.to_dict(), None
        except Exception as e:
            db.session.rollback()
            return None, str(e)

    @staticmethod
    def update_food_item(item_id_str, data):
        try:
            item_uuid = uuid.UUID(item_id_str)
            food = db.session.get(FoodItem, item_uuid)
            if not food:
                return None, "Food item not found"
                
            if "category_id" in data and data["category_id"]:
                try:
                    cat_uuid = uuid.UUID(data["category_id"])
                    cat = db.session.get(FoodCategory, cat_uuid)
                    if cat:
                        food.category_id = cat_uuid
                except ValueError:
                    pass
            if "name" in data and data["name"]:
                food.name = data["name"].strip()
            if "price" in data and data["price"] is not None:
                food.price = Decimal(str(data["price"]))
            if "description" in data:
                food.description = data["description"]
            if "image_url" in data:
                food.image_url = data["image_url"]
            if "is_available" in data:
                food.is_available = bool(data["is_available"])
            if "diet_type" in data:
                food.diet_type = DietType.NON_VEG if data["diet_type"] == "non-veg" else DietType.VEG

                
            db.session.commit()
            return food.to_dict(), None
        except Exception as e:
            db.session.rollback()
            return None, str(e)

    @staticmethod
    def delete_food_item(item_id_str):
        try:
            item_uuid = uuid.UUID(item_id_str)
            food = db.session.get(FoodItem, item_uuid)
            if not food:
                return False, "Food item not found"
            food.is_available = False # Soft delete
            db.session.commit()
            return True, None
        except Exception as e:
            db.session.rollback()
            return False, str(e)
