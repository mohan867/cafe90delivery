import os
import uuid
import datetime
import jwt
from flask import current_app
from flask_bcrypt import Bcrypt
from database.connection import db
from database.models.user import User, UserRole
from database.models.cart import Cart

bcrypt = Bcrypt()

class AuthService:
    @staticmethod
    def register_customer(name: str, email: str, password: str, phone: str = None):
        email_clean = email.strip().lower()
        
        # Check if email exists
        existing_user = db.session.query(User).filter_by(email=email_clean).first()
        if existing_user:
            return None, "Email is already registered. Please login."
            
        hashed_password = bcrypt.generate_password_hash(password).decode("utf-8")
        
        new_user = User(
            email=email_clean,
            password_hash=hashed_password,
            full_name=name.strip(),
            phone=phone.strip() if phone else None,
            role=UserRole.CUSTOMER
        )
        
        db.session.add(new_user)
        db.session.flush() # Obtain new_user.id
        
        # Initialize empty cart for customer
        user_cart = Cart(user_id=new_user.id)
        db.session.add(user_cart)
        
        db.session.commit()
        return new_user, None

    @staticmethod
    def login_user(email: str, password: str):
        email_clean = email.strip().lower()
        user = db.session.query(User).filter_by(email=email_clean).first()
        
        if not user or not user.is_active:
            return None, "Invalid email or password."
            
        if not bcrypt.check_password_hash(user.password_hash, password):
            return None, "Invalid email or password."
            
        secret = current_app.config["SECRET_KEY"]
        
        role_str = user.role.value if isinstance(user.role, UserRole) else str(user.role)
        
        token_payload = {
            "sub": str(user.id),
            "jti": str(uuid.uuid4()),
            "email": user.email,
            "role": role_str,
            "exp": datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=1)
        }
        
        token = jwt.encode(token_payload, secret, algorithm="HS256")
        
        return {
            "token": token,
            "user": user.to_dict()
        }, None

    @staticmethod
    def logout_user(token: str):
        """Revokes JWT token by writing its jti to the revoked_tokens PostgreSQL table."""
        if not token:
            return True
        try:
            secret = current_app.config["SECRET_KEY"]
            payload = jwt.decode(token, secret, algorithms=["HS256"], options={"verify_exp": False})
            jti = payload.get("jti") or str(uuid.uuid5(uuid.NAMESPACE_URL, token))
            exp_ts = payload.get("exp")
            
            if exp_ts:
                expires_at = datetime.datetime.fromtimestamp(exp_ts, datetime.timezone.utc)
            else:
                expires_at = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=1)
                
            from database.models.revoked_token import RevokedToken
            existing = db.session.query(RevokedToken).filter_by(jti=jti).first()
            if not existing:
                revoked = RevokedToken(jti=jti, expires_at=expires_at)
                db.session.add(revoked)
                db.session.commit()
            return True
        except Exception as e:
            db.session.rollback()
            return False

    @staticmethod
    def refresh_token(token: str):
        """
        Refreshes an active JWT token.
        Verifies signature, revocation status, user account status, and issues a fresh 24-hour token.
        """
        if not token:
            return None, "Token is missing"
        try:
            secret = current_app.config["SECRET_KEY"]
            payload = jwt.decode(token, secret, algorithms=["HS256"])
            
            jti = payload.get("jti") or str(uuid.uuid5(uuid.NAMESPACE_URL, token))
            from database.models.revoked_token import RevokedToken
            revoked = db.session.query(RevokedToken).filter_by(jti=jti).first()
            if revoked:
                return None, "Token has been revoked"

            user_id_str = payload.get("sub")
            if not user_id_str:
                return None, "Invalid token claims"

            user_uuid = uuid.UUID(user_id_str)
            user = db.session.get(User, user_uuid)
            if not user or not user.is_active:
                return None, "User account associated with token not found or inactive"

            # Revoke previous token jti
            AuthService.logout_user(token)

            role_str = user.role.value if isinstance(user.role, UserRole) else str(user.role)
            new_payload = {
                "sub": str(user.id),
                "jti": str(uuid.uuid4()),
                "email": user.email,
                "role": role_str,
                "exp": datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=1)
            }
            new_token = jwt.encode(new_payload, secret, algorithm="HS256")

            return {
                "token": new_token,
                "user": user.to_dict()
            }, None
        except jwt.ExpiredSignatureError:
            return None, "Token has expired. Please login again."
        except Exception as e:
            return None, f"Token refresh failed: {str(e)}"


