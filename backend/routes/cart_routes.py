from flask import Blueprint, request, g
from pydantic import ValidationError
from middleware.auth import token_required, require_role
from database.models.user import UserRole
from schemas.cart_schema import AddToCartSchema, UpdateCartItemSchema
from services.cart_service import CartService
from utils.response import success_response, error_response
from utils.limiter import limiter

cart_bp = Blueprint("cart", __name__)

@cart_bp.route("/", methods=["GET"])
@token_required
@require_role(UserRole.CUSTOMER)
def get_cart():
    cart_details = CartService.get_cart_details(g.current_user.id)
    return success_response(data=cart_details)

@cart_bp.route("/items", methods=["POST"])
@token_required
@require_role(UserRole.CUSTOMER)
@limiter.limit("30 per minute")
def add_to_cart():
    try:
        json_data = request.get_json() or {}
        validated = AddToCartSchema(**json_data)
        
        cart_details, err = CartService.add_item_to_cart(
            user_id=g.current_user.id,
            food_item_id_str=validated.food_item_id,
            quantity=validated.quantity
        )
        if err:
            return error_response(message=err, code="ADD_TO_CART_FAILED", status_code=400)
            
        return success_response(data=cart_details, message="Item added to cart")
    except ValidationError as ve:
        return error_response(message="Validation error", code="VALIDATION_ERROR", details=ve.errors(), status_code=422)

@cart_bp.route("/items/<item_id>", methods=["PUT"])
@token_required
@require_role(UserRole.CUSTOMER)
def update_cart_item(item_id):
    try:
        json_data = request.get_json() or {}
        validated = UpdateCartItemSchema(**json_data)
        
        cart_details, err = CartService.update_cart_item_quantity(
            user_id=g.current_user.id,
            cart_item_id_str=item_id,
            quantity=validated.quantity
        )
        if err:
            return error_response(message=err, code="UPDATE_CART_FAILED", status_code=400)
            
        return success_response(data=cart_details, message="Cart quantity updated")
    except ValidationError as ve:
        return error_response(message="Validation error", code="VALIDATION_ERROR", details=ve.errors(), status_code=422)

@cart_bp.route("/items/<item_id>", methods=["DELETE"])
@token_required
@require_role(UserRole.CUSTOMER)
def remove_cart_item(item_id):
    cart_details, err = CartService.remove_cart_item(
        user_id=g.current_user.id,
        cart_item_id_str=item_id
    )
    if err:
        return error_response(message=err, code="REMOVE_CART_FAILED", status_code=400)
        
    return success_response(data=cart_details, message="Item removed from cart")
