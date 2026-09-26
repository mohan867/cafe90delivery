from flask import Blueprint, request, g
from pydantic import ValidationError
from middleware.auth import token_required, require_role
from database.models.user import UserRole
from services.delivery_service import DeliveryService
from utils.response import success_response, error_response

delivery_bp = Blueprint("delivery", __name__)

@delivery_bp.route("/available-pool", methods=["GET"])
@token_required
@require_role(UserRole.DELIVERY_PARTNER)
def available_pool():
    orders = DeliveryService.get_available_pool()
    return success_response(data=orders)

@delivery_bp.route("/assigned-orders", methods=["GET"])
@token_required
@require_role(UserRole.DELIVERY_PARTNER)
def assigned_orders():
    orders = DeliveryService.get_assigned_orders(g.current_user.id)
    return success_response(data=orders)

@delivery_bp.route("/orders/<order_id>/claim", methods=["POST"])
@token_required
@require_role(UserRole.DELIVERY_PARTNER)
def claim_task(order_id):
    order, err = DeliveryService.claim_delivery_task(
        partner_id=g.current_user.id,
        order_id_str=order_id
    )
    if err:
        return error_response(message=err, code="TASK_CLAIM_FAILED", status_code=409)
        
    return success_response(data=order, message="Order claimed successfully!")

@delivery_bp.route("/orders/<order_id>/status", methods=["PUT"])
@token_required
@require_role(UserRole.DELIVERY_PARTNER)
def update_delivery_status(order_id):
    json_data = request.get_json() or {}
    status = json_data.get("status")
    
    if not status:
        return error_response(message="Status is required", code="VALIDATION_ERROR", status_code=400)
        
    order, err = DeliveryService.update_delivery_status(
        partner_id=g.current_user.id,
        order_id_str=order_id,
        new_status_str=status
    )
    if err:
        return error_response(message=err, code="UPDATE_FAILED", status_code=400)
        
    return success_response(data=order, message=f"Delivery status updated to {status}")

@delivery_bp.route("/status", methods=["PUT"])
@token_required
@require_role(UserRole.DELIVERY_PARTNER)
def update_partner_status():
    json_data = request.get_json() or {}
    status = json_data.get("status")
    if not status:
        return error_response(message="Status is required", code="VALIDATION_ERROR", status_code=400)

    partner, err = DeliveryService.update_partner_work_status(g.current_user.id, status)
    if err:
        return error_response(message=err, code="UPDATE_FAILED", status_code=400)

    return success_response(data=partner, message="Partner availability updated")

@delivery_bp.route("/my-stats", methods=["GET"])
@token_required
@require_role(UserRole.DELIVERY_PARTNER)
def get_my_stats():
    stats, err = DeliveryService.get_partner_history_and_stats(g.current_user.id)
    if err:
        return error_response(message=err, code="STATS_FAILED", status_code=400)
    return success_response(data=stats)

@delivery_bp.route("/location", methods=["PUT"])
@token_required
@require_role(UserRole.DELIVERY_PARTNER)
def update_live_location():
    json_data = request.get_json() or {}
    lat = json_data.get("latitude")
    lng = json_data.get("longitude")
    if lat is None or lng is None:
        return error_response(message="Latitude and longitude are required", code="VALIDATION_ERROR", status_code=400)

    partner, err = DeliveryService.update_partner_live_location(g.current_user.id, lat, lng)
    if err:
        return error_response(message=err, code="UPDATE_FAILED", status_code=400)

    return success_response(data=partner, message="Partner location updated")

@delivery_bp.route("/profile/avatar", methods=["PUT"])
@token_required
@require_role(UserRole.DELIVERY_PARTNER)
def update_profile_avatar():
    json_data = request.get_json() or {}
    avatar_input = json_data.get("avatar") or json_data.get("avatar_url")
    if not avatar_input:
        return error_response(message="Avatar image data or URL is required", code="VALIDATION_ERROR", status_code=400)

    partner, err = DeliveryService.update_partner_avatar(g.current_user.id, avatar_input)
    if err:
        return error_response(message=err, code="UPDATE_FAILED", status_code=400)

    return success_response(data=partner, message="Profile picture updated successfully")

