from flask import Blueprint, request, g, current_app
from pydantic import ValidationError
from schemas.auth_schema import RegisterSchema, LoginSchema
from services.auth_service import AuthService
from utils.response import success_response, error_response
from utils.logger import logger
from utils.limiter import limiter

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/register", methods=["POST"])
@limiter.limit("5 per minute")
def register():
    try:
        json_data = request.get_json() or {}
        validated = RegisterSchema(**json_data)
        
        user, err = AuthService.register_customer(
            name=validated.name,
            email=validated.email,
            password=validated.password,
            phone=validated.phone
        )
        
        if err:
            return error_response(message=err, code="REGISTRATION_FAILED", status_code=409)
            
        res = success_response(
            data={"user": user.to_dict()},
            message="Account created successfully!",
            status_code=201
        )
        return res
    except ValidationError as ve:
        return error_response(
            message="Validation error",
            code="VALIDATION_ERROR",
            details=ve.errors(),
            status_code=422
        )
    except Exception as e:
        logger.error(f"Error in /register: {e}", exc_info=True)
        return error_response(message="Registration failed due to a server error.", code="INTERNAL_SERVER_ERROR", status_code=500)

@auth_bp.route("/login", methods=["POST"])
@limiter.limit("5 per minute")
def login():
    try:
        json_data = request.get_json() or {}
        validated = LoginSchema(**json_data)
        
        auth_data, err = AuthService.login_user(
            email=validated.email,
            password=validated.password
        )
        
        if err:
            return error_response(message=err, code="INVALID_CREDENTIALS", status_code=401)
            
        token = auth_data.get("token")
        response = success_response(
            data={"user": auth_data.get("user"), "token": token},
            message="Login successful",
            status_code=200
        )
        
        is_secure = request.is_secure or (current_app.config.get("ENVIRONMENT") == "production")
        response.set_cookie(
            key="auth_token",
            value=token,
            httponly=True,
            samesite="None" if is_secure else "Lax",
            secure=is_secure,
            max_age=86400  # 24 hours
        )
        return response
    except ValidationError as ve:
        return error_response(
            message="Validation error",
            code="VALIDATION_ERROR",
            details=ve.errors(),
            status_code=422
        )
    except Exception as e:
        logger.error(f"Error in /login: {e}", exc_info=True)
        return error_response(message="Login failed due to a database/server error.", code="INTERNAL_SERVER_ERROR", status_code=500)

@auth_bp.route("/me", methods=["GET"])
def me():
    from middleware.auth import token_required
    @token_required
    def get_me():
        return success_response(data={"user": g.current_user.to_dict()})
    return get_me()

@auth_bp.route("/logout", methods=["POST"])
def logout():
    token = request.cookies.get("auth_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            parts = auth_header.split()
            if len(parts) == 2:
                token = parts[1]
    if token:
        AuthService.logout_user(token)

    is_prod = (current_app.config.get("ENVIRONMENT") == "production")
    response = success_response(message="Logged out successfully")
    response.set_cookie(
        key="auth_token",
        value="",
        expires=0,
        httponly=True,
        samesite="None" if is_prod else "Lax",
        secure=is_prod
    )
    return response

@auth_bp.route("/refresh", methods=["POST"])
def refresh_token():
    token = request.cookies.get("auth_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            parts = auth_header.split()
            if len(parts) == 2:
                token = parts[1]
                
    if not token:
        return error_response(message="Authentication token is missing", code="UNAUTHORIZED", status_code=401)

    auth_data, err = AuthService.refresh_token(token)
    if err:
        return error_response(message=err, code="TOKEN_REFRESH_FAILED", status_code=401)

    new_token = auth_data.get("token")
    response = success_response(
        data={"user": auth_data.get("user")},
        message="Token refreshed successfully",
        status_code=200
    )

    is_prod = (current_app.config.get("ENVIRONMENT") == "production")
    response.set_cookie(
        key="auth_token",
        value=new_token,
        httponly=True,
        samesite="None" if is_prod else "Lax",
        secure=is_prod,
        max_age=86400  # 24 hours
    )
    return response


# ── User Saved Addresses Endpoints (Max 5 Limit) ─────────
import uuid
from database.connection import db
from database.models.user_address import UserAddress
from middleware.auth import token_required

@auth_bp.route("/addresses", methods=["GET"])
@token_required
def get_user_addresses():
    try:
        addresses = db.session.query(UserAddress).filter_by(user_id=g.current_user.id).order_by(UserAddress.created_at.desc()).all()
        return success_response(data=[a.to_dict() for a in addresses])
    except Exception as e:
        logger.error(f"Error fetching user addresses: {e}", exc_info=True)
        return error_response(message="Failed to fetch saved addresses.", code="INTERNAL_SERVER_ERROR", status_code=500)

@auth_bp.route("/addresses", methods=["POST"])
@token_required
def add_user_address():
    try:
        data = request.get_json() or {}
        address_line = data.get("address_line")
        label = data.get("label", "Home")
        latitude = data.get("latitude")
        longitude = data.get("longitude")

        if not address_line or not address_line.strip():
            return error_response(message="Address line is required.", code="VALIDATION_ERROR", status_code=400)

        clean_addr = address_line.strip()
        if len(clean_addr) > 500:
            return error_response(message="Address line cannot exceed 500 characters.", code="VALIDATION_ERROR", status_code=422)
        if len(label) > 50:
            return error_response(message="Label cannot exceed 50 characters.", code="VALIDATION_ERROR", status_code=422)
        existing_addresses = db.session.query(UserAddress).filter_by(user_id=g.current_user.id).all()

        # Check 1: Duplicate location check (same address line under another label)
        for existing in existing_addresses:
            if existing.address_line.strip().lower() == clean_addr.lower():
                if existing.label.lower() == label.lower():
                    return success_response(
                        data=[a.to_dict() for a in existing_addresses],
                        message=f"Location is already saved as '{existing.label}'.",
                        status_code=200
                    )
                else:
                    return error_response(
                        message=f"This location is already saved in your account under label '{existing.label}'.",
                        code="DUPLICATE_LOCATION",
                        status_code=400
                    )

        # Check 2: Same label check (e.g. saving new location under existing label "Home" updates the existing entry)
        same_label_addr = next((a for a in existing_addresses if a.label.lower() == label.lower()), None)
        if same_label_addr:
            same_label_addr.address_line = clean_addr
            same_label_addr.latitude = latitude
            same_label_addr.longitude = longitude
            db.session.commit()
            
            updated_list = db.session.query(UserAddress).filter_by(user_id=g.current_user.id).order_by(UserAddress.created_at.desc()).all()
            return success_response(
                data=[a.to_dict() for a in updated_list],
                message=f"Saved location '{label}' updated successfully!",
                status_code=200
            )

        # Enforce max 5 saved locations limit per user
        if len(existing_addresses) >= 5:
            return error_response(message="Maximum limit of 5 saved locations reached for your account.", code="MAX_LIMIT_REACHED", status_code=400)

        new_addr = UserAddress(
            user_id=g.current_user.id,
            label=label,
            address_line=clean_addr,
            latitude=latitude,
            longitude=longitude
        )
        db.session.add(new_addr)
        db.session.commit()

        addresses = db.session.query(UserAddress).filter_by(user_id=g.current_user.id).order_by(UserAddress.created_at.desc()).all()
        return success_response(data=[a.to_dict() for a in addresses], message="Location saved successfully!", status_code=201)
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error saving address: {e}", exc_info=True)
        return error_response(message="Failed to save address.", code="INTERNAL_SERVER_ERROR", status_code=500)

@auth_bp.route("/addresses/<address_id>", methods=["DELETE"])
@token_required
def delete_user_address(address_id):
    try:
        addr_uuid = uuid.UUID(address_id)
        addr = db.session.query(UserAddress).filter_by(id=addr_uuid, user_id=g.current_user.id).first()
        if not addr:
            return error_response(message="Address not found", code="NOT_FOUND", status_code=404)

        db.session.delete(addr)
        db.session.commit()

        addresses = db.session.query(UserAddress).filter_by(user_id=g.current_user.id).order_by(UserAddress.created_at.desc()).all()
        return success_response(data=[a.to_dict() for a in addresses], message="Address deleted")
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting address: {e}", exc_info=True)
        return error_response(message="Failed to delete address.", code="INTERNAL_SERVER_ERROR", status_code=500)