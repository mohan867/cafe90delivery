import uuid
from database.connection import db
from database.models.cart import Cart, CartItem
from database.models.food import FoodItem

class CartService:
    @staticmethod
    def get_or_create_cart(user_id):
        cart = db.session.query(Cart).filter_by(user_id=user_id).first()
        if not cart:
            cart = Cart(user_id=user_id)
            db.session.add(cart)
            db.session.commit()
        return cart

    @staticmethod
    def get_cart_details(user_id):
        cart = CartService.get_or_create_cart(user_id)
        
        cart_items = db.session.query(CartItem).filter_by(cart_id=cart.id).all()
        
        formatted_items = [ci.to_dict() for ci in cart_items]
        subtotal = sum(item["subtotal"] for item in formatted_items)
        delivery_fee = 30.0 if formatted_items else 0.0
        
        return {
            "cart_id": str(cart.id),
            "items": formatted_items,
            "cart_count": sum(ci.quantity for ci in cart_items),
            "subtotal": round(subtotal, 2),
            "delivery_fee": delivery_fee,
            "total_amount": round(subtotal + delivery_fee, 2)
        }

    @staticmethod
    def add_item_to_cart(user_id, food_item_id_str, quantity=1):
        try:
            food_uuid = uuid.UUID(food_item_id_str)
            food_item = db.session.get(FoodItem, food_uuid)
            if not food_item or not food_item.is_available:
                return None, "Food item is not available"
                
            cart = CartService.get_or_create_cart(user_id)
            
            existing_item = db.session.query(CartItem).filter_by(
                cart_id=cart.id,
                food_item_id=food_uuid
            ).first()
            
            if existing_item:
                existing_item.quantity += quantity
            else:
                cart_item = CartItem(
                    cart_id=cart.id,
                    food_item_id=food_uuid,
                    quantity=quantity
                )
                db.session.add(cart_item)
                
            db.session.commit()
            return CartService.get_cart_details(user_id), None
        except Exception as e:
            db.session.rollback()
            return None, str(e)

    @staticmethod
    def update_cart_item_quantity(user_id, cart_item_id_str, quantity):
        try:
            item_uuid = uuid.UUID(cart_item_id_str)
            cart = CartService.get_or_create_cart(user_id)
            
            cart_item = db.session.query(CartItem).filter_by(
                id=item_uuid,
                cart_id=cart.id
            ).first()
            
            if not cart_item:
                return None, "Cart item not found"
                
            if quantity <= 0:
                db.session.delete(cart_item)
            else:
                cart_item.quantity = quantity
                
            db.session.commit()
            return CartService.get_cart_details(user_id), None
        except Exception as e:
            db.session.rollback()
            return None, str(e)

    @staticmethod
    def remove_cart_item(user_id, cart_item_id_str):
        try:
            item_uuid = uuid.UUID(cart_item_id_str)
            cart = CartService.get_or_create_cart(user_id)
            
            cart_item = db.session.query(CartItem).filter_by(
                id=item_uuid,
                cart_id=cart.id
            ).first()
            
            if not cart_item:
                return None, "Cart item not found"
                
            db.session.delete(cart_item)
            db.session.commit()
            return CartService.get_cart_details(user_id), None
        except Exception as e:
            db.session.rollback()
            return None, str(e)
