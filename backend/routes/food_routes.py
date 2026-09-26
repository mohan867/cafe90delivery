from flask import Blueprint, request
from pydantic import ValidationError
from middleware.auth import token_required, require_role
from database.models.user import UserRole
from schemas.food_schema import FoodItemCreateSchema, FoodItemUpdateSchema
from services.food_service import FoodService
from utils.response import success_response, error_response

food_bp = Blueprint("food", __name__)

@food_bp.route("/categories", methods=["GET"])
def get_categories():
    categories = FoodService.get_all_categories()
    return success_response(data=categories)

@food_bp.route("/", methods=["GET"])
def get_food_items():
    category = request.args.get("category")
    diet_type = request.args.get("diet_type")
    search = request.args.get("search")
    page = int(request.args.get("page", 1))
    limit = int(request.args.get("limit", 50))
    
    result = FoodService.get_food_items(
        category_name=category,
        diet_type=diet_type,
        search=search,
        page=page,
        limit=limit
    )
    return success_response(data=result["items"], meta=result["meta"])

@food_bp.route("/<item_id>", methods=["GET"])
def get_single_item(item_id):
    item, err = FoodService.get_food_item_by_id(item_id)
    if err:
        return error_response(message=err, code="NOT_FOUND", status_code=404)
    return success_response(data=item)

@food_bp.route("/", methods=["POST"])
@token_required
@require_role(UserRole.ADMIN)
def add_food():
    try:
        json_data = request.get_json() or {}
        validated = FoodItemCreateSchema(**json_data)
        
        item, err = FoodService.create_food_item(validated.model_dump())
        if err:
            return error_response(message=err, code="CREATE_FAILED", status_code=400)
            
        return success_response(data=item, message="Food item created successfully", status_code=201)
    except ValidationError as ve:
        return error_response(message="Validation error", code="VALIDATION_ERROR", details=ve.errors(), status_code=422)

@food_bp.route("/<item_id>", methods=["PUT"])
@token_required
@require_role(UserRole.ADMIN)
def update_food(item_id):
    try:
        json_data = request.get_json() or {}
        validated = FoodItemUpdateSchema(**json_data)
        
        item, err = FoodService.update_food_item(item_id, validated.model_dump(exclude_unset=True))
        if err:
            return error_response(message=err, code="UPDATE_FAILED", status_code=400)
            
        return success_response(data=item, message="Food item updated successfully")
    except ValidationError as ve:
        return error_response(message="Validation error", code="VALIDATION_ERROR", details=ve.errors(), status_code=422)

@food_bp.route("/<item_id>", methods=["DELETE"])
@token_required
@require_role(UserRole.ADMIN)
def delete_food(item_id):
    ok, err = FoodService.delete_food_item(item_id)
    if not ok:
        return error_response(message=err, code="DELETE_FAILED", status_code=400)
    return success_response(message="Food item deleted successfully")
