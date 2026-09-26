from flask import Blueprint, request, g
from pydantic import ValidationError
from middleware.auth import token_required, require_role
from database.models.user import UserRole
from schemas.auth_schema import CreateStaffSchema
from schemas.order_schema import AssignOrderSchema
from services.admin_service import AdminService
from utils.response import success_response, error_response
from utils.limiter import limiter

admin_bp = Blueprint("admin", __name__)

@admin_bp.route("/dashboard", methods=["GET"])
@token_required
@require_role(UserRole.ADMIN)
def dashboard_stats():
    stats = AdminService.get_dashboard_stats()
    return success_response(data=stats)

@admin_bp.route("/customers", methods=["GET"])
@token_required
@require_role(UserRole.ADMIN)
def customer_list():
    customers = AdminService.get_all_customers()
    return success_response(data=customers)

@admin_bp.route("/staff", methods=["GET"])
@token_required
@require_role(UserRole.ADMIN)
def staff_list():
    staff = AdminService.get_all_staff()
    return success_response(data=staff)

@admin_bp.route("/staff", methods=["POST"])
@token_required
@require_role(UserRole.ADMIN)
def create_staff():
    try:
        json_data = request.get_json() or {}
        validated = CreateStaffSchema(**json_data)
        
        staff, err = AdminService.create_staff(validated.model_dump())
        if err:
            return error_response(message=err, code="CREATE_STAFF_FAILED", status_code=400)
            
        return success_response(data=staff, message="Staff created successfully", status_code=201)
    except ValidationError as ve:
        return error_response(message="Validation error", code="VALIDATION_ERROR", details=ve.errors(), status_code=422)

@admin_bp.route("/orders/<order_id>/assign", methods=["PUT"])
@token_required
@require_role(UserRole.ADMIN)
def assign_order(order_id):
    try:
        json_data = request.get_json() or {}
        validated = AssignOrderSchema(**json_data)
        
        order, err = AdminService.assign_order(
            order_id_str=order_id,
            delivery_partner_id_str=validated.delivery_partner_id
        )
        if err:
            return error_response(message=err, code="ASSIGN_FAILED", status_code=400)
            
        return success_response(data=order, message="Order assigned to delivery partner")
    except ValidationError as ve:
        return error_response(message="Validation error", code="VALIDATION_ERROR", details=ve.errors(), status_code=422)
@admin_bp.route("/users/<user_id>", methods=["GET"])
@token_required
@require_role(UserRole.ADMIN)
def user_details(user_id):
    user_data, err = AdminService.get_user_details(user_id)
    if err:
        return error_response(message=err, code="USER_NOT_FOUND", status_code=404)
    return success_response(data=user_data)

@admin_bp.route("/contact", methods=["POST"])
@limiter.limit("5 per minute")
def submit_contact_feedback():
    json_data = request.get_json() or {}
    name = json_data.get("name")
    email = json_data.get("email")
    subject = json_data.get("subject")
    message = json_data.get("message")
    
    if not all([name, email, subject, message]):
        return error_response(message="All fields are required", code="INVALID_INPUT", status_code=400)

    user_id = None
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        try:
            import jwt
            from flask import current_app
            secret = current_app.config["SECRET_KEY"]
            payload = jwt.decode(token, secret, algorithms=["HS256"])
            if payload and "sub" in payload:
                import uuid
                user_id = uuid.UUID(payload["sub"])
        except Exception:
            pass
        
    feedback = AdminService.create_feedback({
        "name": name,
        "email": email,
        "subject": subject,
        "message": message,
        "user_id": user_id
    })
    return success_response(data=feedback, message="Feedback submitted successfully", status_code=201)

@admin_bp.route("/feedback/my-requests", methods=["GET"])
@token_required
def get_my_feedbacks():
    user = getattr(g, "current_user", None)
    if not user:
        return error_response(message="User context not found", code="UNAUTHORIZED", status_code=401)
    feedbacks = AdminService.get_user_feedbacks(user_id=user.id, email=user.email)
    return success_response(data=feedbacks)

@admin_bp.route("/feedback", methods=["GET"])
@token_required
@require_role(UserRole.ADMIN)
def get_feedbacks():
    feedbacks = AdminService.get_all_feedbacks()
    return success_response(data=feedbacks)

@admin_bp.route("/feedback/<feedback_id>/status", methods=["PUT"])
@token_required
@require_role(UserRole.ADMIN)
def update_feedback_status(feedback_id):
    json_data = request.get_json() or {}
    status = json_data.get("status")
    admin_reply = json_data.get("admin_reply")
    if not status:
        return error_response(message="Status is required", code="INVALID_INPUT", status_code=400)

    feedback, err = AdminService.update_feedback_status(feedback_id, status, admin_reply=admin_reply)
    if err:
        return error_response(message=err, code="UPDATE_FAILED", status_code=400)
        
    return success_response(data=feedback, message="Feedback status updated")

@admin_bp.route("/menu/upload-image", methods=["POST"])
@token_required
@require_role(UserRole.ADMIN)
def upload_menu_image():
    from services.storage_service import StorageService
    json_data = request.get_json(silent=True) or {}
    image_input = json_data.get("image") or json_data.get("image_url")
    
    if not image_input and "file" in request.files:
        image_input = request.files["file"]
        
    if not image_input:
        return error_response(message="No image provided", code="INVALID_INPUT", status_code=400)
        
    img_url, err = StorageService.upload_image(image_input)
    if err:
        return error_response(message=err, code="UPLOAD_FAILED", status_code=500)
        
    return success_response(data={"image_url": img_url}, message="Image uploaded successfully")

@admin_bp.route("/pricing-rules", methods=["GET"])
@token_required
@require_role(UserRole.ADMIN)
def get_pricing_rules():
    from services.pricing_service import PricingService
    rules = PricingService.get_all_rules()
    return success_response(data=rules)

@admin_bp.route("/pricing-rules", methods=["POST"])
@token_required
@require_role(UserRole.ADMIN)
def create_pricing_rule():
    from services.pricing_service import PricingService
    from flask import g
    json_data = request.get_json() or {}
    rule, err = PricingService.create_rule(json_data, g.current_user.id)
    if err:
        return error_response(message=err, code="RULE_CREATE_FAILED", status_code=400)
    return success_response(data=rule, message="Pricing rule created successfully", status_code=201)

@admin_bp.route("/pricing-rules/<rule_id>", methods=["PUT"])
@token_required
@require_role(UserRole.ADMIN)
def update_pricing_rule(rule_id):
    from services.pricing_service import PricingService
    from flask import g
    json_data = request.get_json() or {}
    rule, err = PricingService.update_rule(rule_id, json_data, g.current_user.id)
    if err:
        return error_response(message=err, code="RULE_UPDATE_FAILED", status_code=400)
    return success_response(data=rule, message="Pricing rule updated successfully")


