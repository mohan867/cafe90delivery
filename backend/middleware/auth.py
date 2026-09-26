import os
import uuid
from functools import wraps
from flask import request, g, current_app
import jwt
from database.connection import db
from database.models.user import User, UserRole
from utils.response import error_response

def token_required(f):
    """
    Middleware decorator to verify JWT Bearer token and attach active user to Flask g.current_user.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.cookies.get("auth_token")
        
        if not token:
            auth_header = request.headers.get("Authorization", "")
            if auth_header.startswith("Bearer "):
                parts = auth_header.split()
                if len(parts) == 2:
                    token = parts[1]
                
        if not token:
            return error_response(
                message="Authentication token is missing",
                code="UNAUTHORIZED",
                status_code=401
            )
            
        try:
            secret = current_app.config["SECRET_KEY"]
            payload = jwt.decode(token, secret, algorithms=["HS256"])
            
            jti = payload.get("jti") or str(uuid.uuid5(uuid.NAMESPACE_URL, token))
            from database.models.revoked_token import RevokedToken
            revoked = db.session.query(RevokedToken).filter_by(jti=jti).first()
            if revoked:
                return error_response(
                    message="Token has been revoked. Please login again.",
                    code="TOKEN_REVOKED",
                    status_code=401
                )
            
            user_id_str = payload.get("sub")
            if not user_id_str:
                return error_response(
                    message="Invalid token claims: missing sub",
                    code="UNAUTHORIZED",
                    status_code=401
                )
                
            user_uuid = uuid.UUID(user_id_str)
            user = db.session.get(User, user_uuid)
            
            if not user or not user.is_active:
                return error_response(
                    message="User account associated with token not found or inactive",
                    code="UNAUTHORIZED",
                    status_code=401
                )
                
            g.current_user = user
            g.user_role = user.role.value if isinstance(user.role, UserRole) else str(user.role)
            
        except jwt.ExpiredSignatureError:
            return error_response(
                message="Authentication token has expired. Please login again.",
                code="TOKEN_EXPIRED",
                status_code=401
            )
        except (jwt.InvalidTokenError, ValueError) as e:
            return error_response(
                message=f"Invalid token: {str(e)}",
                code="UNAUTHORIZED",
                status_code=401
            )
        except Exception as e:
            return error_response(
                message="Authentication check failed",
                code="INTERNAL_SERVER_ERROR",
                details=str(e),
                status_code=500
            )
            
        return f(*args, **kwargs)
    return decorated

def require_role(*allowed_roles):
    """
    RBAC decorator to enforce specified roles. Must be used after @token_required.
    Usage: @token_required @require_role('admin', 'customer')
    """
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            if not hasattr(g, 'current_user') or not g.current_user:
                return error_response(
                    message="Authentication required",
                    code="UNAUTHORIZED",
                    status_code=401
                )
                
            current_role = g.user_role
            # Convert roles to strings for uniform comparison
            str_allowed_roles = [r.value if isinstance(r, UserRole) else str(r) for r in allowed_roles]
            
            if current_role not in str_allowed_roles:
                return error_response(
                    message="Unauthorized access. Your role cannot perform this action.",
                    code="FORBIDDEN",
                    status_code=403
                )
                
            return f(*args, **kwargs)
        return decorated
    return decorator
