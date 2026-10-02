from flask import Blueprint, request, g
from pydantic import ValidationError
from middleware.auth import token_required, require_role
from database.models.user import UserRole
from schemas.order_schema import PlaceOrderSchema, UpdateOrderStatusSchema
from services.order_service import OrderService
from utils.response import success_response, error_response
from utils.limiter import limiter

order_bp = Blueprint("order", __name__)

@order_bp.route("/", methods=["POST"])
@token_required
@require_role(UserRole.CUSTOMER)
@limiter.limit("5 per minute")
def place_order():
    try:
        json_data = request.get_json() or {}
        validated = PlaceOrderSchema(**json_data)
        
        order, err = OrderService.place_order(
            user_id=g.current_user.id,
            checkout_data=validated.model_dump()
        )
        if err:
            return error_response(message=err, code="ORDER_FAILED", status_code=400)
            
        return success_response(data=order, message="Order placed successfully!", status_code=201)
    except ValidationError as ve:
        return error_response(message="Validation error", code="VALIDATION_ERROR", details=ve.errors(), status_code=422)

@order_bp.route("/my-orders", methods=["GET"])
@token_required
@require_role(UserRole.CUSTOMER)
def get_my_orders():
    orders = OrderService.get_customer_orders(g.current_user.id)
    return success_response(data=orders)

@order_bp.route("/<order_id>", methods=["GET"])
@token_required
def get_order_details(order_id):
    is_admin = (g.user_role == UserRole.ADMIN.value)
    order, err = OrderService.get_order_by_id(order_id, user_id=g.current_user.id, is_admin=is_admin)
    if err:
        return error_response(message=err, code="NOT_FOUND", status_code=404)
    return success_response(data=order)

@order_bp.route("/<order_id>/status", methods=["PUT"])
@token_required
@require_role(UserRole.ADMIN)
def update_status(order_id):
    try:
        json_data = request.get_json() or {}
        validated = UpdateOrderStatusSchema(**json_data)
        
        order, err = OrderService.update_order_status(
            order_id_str=order_id,
            new_status_str=validated.status,
            changed_by_user_id=g.current_user.id,
            notes=validated.notes
        )
        if err:
            return error_response(message=err, code="UPDATE_STATUS_FAILED", status_code=400)
            
        return success_response(data=order, message=f"Order status updated to {validated.status}")
    except ValidationError as ve:
        return error_response(message="Validation error", code="VALIDATION_ERROR", details=ve.errors(), status_code=422)
@order_bp.route("/all", methods=["GET"])
@token_required
@require_role(UserRole.ADMIN)
def get_all_orders():
    status = request.args.get("status")
    orders = OrderService.get_all_orders(status=status)
    return success_response(data=orders)

@order_bp.route("/<order_id>/cancel", methods=["POST"])
@token_required
@require_role(UserRole.CUSTOMER)
def cancel_order(order_id):
    order, err = OrderService.cancel_customer_order(order_id, g.current_user.id)
    if err:
        return error_response(message=err, code="CANCEL_FAILED", status_code=400)
    return success_response(data=order, message="Order cancelled successfully!")

@order_bp.route("/<order_id>/stream-location", methods=["GET"])
@token_required
def stream_order_location(order_id):
    from flask import Response, stream_with_context, current_app
    import json
    import time

    is_admin = (g.user_role == UserRole.ADMIN.value)
    order, err = OrderService.get_order_by_id(order_id, user_id=g.current_user.id, is_admin=is_admin)
    if err:
        return error_response(message=err, code="UNAUTHORIZED", status_code=403)

    def event_generator():
        while True:
            with current_app.app_context():
                current_order, err_stream = OrderService.get_order_by_id(order_id, user_id=g.current_user.id, is_admin=is_admin)
                if current_order:
                    payload = {
                        "order_id": current_order["id"],
                        "status": current_order["status"],
                        "partner_latitude": current_order.get("partner_latitude"),
                        "partner_longitude": current_order.get("partner_longitude"),
                        "assigned_to": current_order.get("assigned_to")
                    }
                    yield f"data: {json.dumps(payload)}\n\n"
                    if current_order["status"] in ["DELIVERED", "CANCELLED"]:
                        break
            time.sleep(3)

    response = Response(stream_with_context(event_generator()), content_type="text/event-stream")
    response.headers["X-Accel-Buffering"] = "no"
    response.headers["Cache-Control"] = "no-cache"
    return response

