import uuid
from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy import func, or_
from flask_bcrypt import Bcrypt
from database.connection import db
from database.models.user import User, UserRole, PartnerStatus
from database.models.order import Order, OrderStatus
from database.models.feedback import Feedback, FeedbackStatus

bcrypt = Bcrypt()

class AdminService:
    @staticmethod
    def get_dashboard_stats():
        total_customers = db.session.query(func.count(User.id)).filter_by(role=UserRole.CUSTOMER).scalar() or 0
        total_orders = db.session.query(func.count(Order.id)).scalar() or 0
        pending_orders = db.session.query(func.count(Order.id)).filter_by(status=OrderStatus.PENDING).scalar() or 0
        delivered_orders = db.session.query(func.count(Order.id)).filter_by(status=OrderStatus.DELIVERED).scalar() or 0
        
        total_revenue_result = db.session.query(func.sum(Order.total_amount)).filter_by(status=OrderStatus.DELIVERED).scalar()
        total_revenue = float(total_revenue_result) if total_revenue_result else 0.0
        
        active_partners = db.session.query(func.count(User.id)).filter_by(role=UserRole.DELIVERY_PARTNER, is_active=True).scalar() or 0
        feedbacks_count = db.session.query(func.count(Feedback.id)).filter_by(status=FeedbackStatus.NEW).scalar() or 0

        return {
            "total_customers": total_customers,
            "total_orders": total_orders,
            "pending_orders": pending_orders,
            "delivered_orders": delivered_orders,
            "total_revenue": total_revenue,
            "active_partners": active_partners,
            "new_feedbacks": feedbacks_count
        }

    @staticmethod
    def get_all_customers():
        customers = db.session.query(User).filter_by(role=UserRole.CUSTOMER).order_by(User.created_at.desc()).all()
        return [c.to_dict() for c in customers]

    @staticmethod
    def get_user_details(user_id_str):
        try:
            user_uuid = uuid.UUID(user_id_str)
            user = db.session.get(User, user_uuid)
            if not user:
                return None, "User not found"

            orders = db.session.query(Order).filter(
                (Order.customer_id == user_uuid) | (Order.delivery_partner_id == user_uuid)
            ).order_by(Order.created_at.desc()).all()

            total_spent_res = db.session.query(func.sum(Order.total_amount)).filter(
                Order.customer_id == user_uuid,
                Order.status == OrderStatus.DELIVERED
            ).scalar()
            total_spent = float(total_spent_res) if total_spent_res else 0.0

            user_data = user.to_dict()
            user_data["orders"] = [o.to_dict() for o in orders]
            user_data["assigned_orders"] = [o.to_dict() for o in user.assigned_orders]
            user_data["total_orders"] = len(orders)
            user_data["total_spent"] = total_spent

            return user_data, None
        except ValueError:
            return None, "Invalid User ID format"

    @staticmethod
    def get_all_staff():
        from datetime import datetime, timezone, timedelta
        from database.models.order import PaymentMethod, OrderStatus, Order

        now = datetime.now(timezone.utc)
        seven_days_ago = now - timedelta(days=7)

        staff_members = db.session.query(User).filter(
            User.role.in_([UserRole.ADMIN, UserRole.DELIVERY_PARTNER])
        ).order_by(User.created_at.desc()).all()

        # Batch SQL Aggregation query across all delivery partners in 1 query
        stats_query = db.session.query(
            Order.delivery_partner_id,
            func.count(Order.id).filter(Order.status == OrderStatus.DELIVERED).label("overall_delivered_count"),
            func.count(Order.id).filter(
                Order.status == OrderStatus.DELIVERED,
                Order.payment_method.in_([PaymentMethod.COD, "COD", "cod"])
            ).label("overall_cod_count"),
            func.coalesce(func.sum(Order.total_amount).filter(
                Order.status == OrderStatus.DELIVERED,
                Order.payment_method.in_([PaymentMethod.COD, "COD", "cod"])
            ), 0).label("overall_cod_amount"),
            func.count(Order.id).filter(
                Order.status == OrderStatus.DELIVERED,
                Order.payment_method.in_([PaymentMethod.COD, "COD", "cod"]),
                Order.created_at >= seven_days_ago
            ).label("weekly_cod_count"),
            func.coalesce(func.sum(Order.total_amount).filter(
                Order.status == OrderStatus.DELIVERED,
                Order.payment_method.in_([PaymentMethod.COD, "COD", "cod"]),
                Order.created_at >= seven_days_ago
            ), 0).label("weekly_cod_amount")
        ).filter(
            Order.delivery_partner_id.is_not(None)
        ).group_by(Order.delivery_partner_id).all()

        stats_map = {
            row.delivery_partner_id: {
                "overall_delivered_count": row.overall_delivered_count or 0,
                "overall_cod_count": row.overall_cod_count or 0,
                "overall_cod_amount": float(row.overall_cod_amount or 0.0),
                "weekly_cod_count": row.weekly_cod_count or 0,
                "weekly_cod_amount": float(row.weekly_cod_amount or 0.0),
            } for row in stats_query
        }

        result = []
        for s in staff_members:
            s_dict = s.to_dict()
            if s.role == UserRole.DELIVERY_PARTNER:
                partner_stats = stats_map.get(s.id, {
                    "overall_delivered_count": 0,
                    "overall_cod_count": 0,
                    "overall_cod_amount": 0.0,
                    "weekly_cod_count": 0,
                    "weekly_cod_amount": 0.0,
                })
                s_dict.update(partner_stats)
            else:
                s_dict["weekly_cod_count"] = 0
                s_dict["weekly_cod_amount"] = 0.0
                s_dict["overall_cod_count"] = 0
                s_dict["overall_cod_amount"] = 0.0
                s_dict["overall_delivered_count"] = 0

            result.append(s_dict)

        return result

    @staticmethod
    def create_staff(data):
        email_clean = data["email"].strip().lower()
        if db.session.query(User).filter_by(email=email_clean).first():
            return None, "Email is already registered"
            
        hashed_password = bcrypt.generate_password_hash(data["password"]).decode("utf-8")
        
        role = UserRole.DELIVERY_PARTNER if data["role"] == "delivery_partner" else UserRole.ADMIN
        
        new_staff = User(
            email=email_clean,
            password_hash=hashed_password,
            full_name=data["name"].strip(),
            phone=data.get("phone", "").strip(),
            role=role,
            partner_status=PartnerStatus.AVAILABLE
        )
        
        db.session.add(new_staff)
        db.session.commit()
        return new_staff.to_dict(), None

    @staticmethod
    def assign_order(order_id_str, delivery_partner_id_str):
        try:
            order_uuid = uuid.UUID(order_id_str)
            partner_uuid = uuid.UUID(delivery_partner_id_str)
            
            order = db.session.get(Order, order_uuid)
            if not order:
                return None, "Order not found"
                
            partner = db.session.get(User, partner_uuid)
            if not partner or partner.role != UserRole.DELIVERY_PARTNER:
                return None, "Invalid delivery partner"
                
            order.delivery_partner_id = partner_uuid
            order.status = OrderStatus.READY_FOR_PICKUP
            
            # AUTO STATUS CHANGE FOR DELIVERY PARTNER
            partner.partner_status = PartnerStatus.ON_DELIVERY

            db.session.commit()
            return order.to_dict(), None
        except ValueError:
            db.session.rollback()
            return None, "Invalid ID format"

    @staticmethod
    def create_feedback(data):
        user_id = data.get("user_id")
        if not user_id and data.get("email"):
            user = db.session.query(User).filter(func.lower(User.email) == data["email"].strip().lower()).first()
            if user:
                user_id = user.id

        feedback = Feedback(
            user_id=user_id,
            name=data["name"].strip(),
            email=data["email"].strip().lower(),
            subject=data["subject"].strip(),
            message=data["message"].strip()
        )
        db.session.add(feedback)
        db.session.commit()
        return feedback.to_dict()

    @staticmethod
    def get_all_feedbacks():
        feedbacks = db.session.query(Feedback).order_by(Feedback.created_at.desc()).all()
        return [f.to_dict() for f in feedbacks]

    @staticmethod
    def get_user_feedbacks(user_id=None, email=None):
        query = db.session.query(Feedback)
        conditions = []
        if user_id:
            conditions.append(Feedback.user_id == user_id)
        if email:
            conditions.append(func.lower(Feedback.email) == email.lower().strip())
        
        if not conditions:
            return []
        
        query = query.filter(or_(*conditions))
        feedbacks = query.order_by(Feedback.created_at.desc()).all()
        return [f.to_dict() for f in feedbacks]

    @staticmethod
    def update_feedback_status(feedback_id_str, status_str, admin_reply=None):
        try:
            fb_uuid = uuid.UUID(feedback_id_str)
        except ValueError:
            return None, "Invalid Feedback ID format"

        feedback = db.session.get(Feedback, fb_uuid)
        if not feedback:
            return None, "Feedback not found"
        
        try:
            normalized_status = str(status_str).upper().replace(" ", "_")
            feedback.status = FeedbackStatus(normalized_status)
        except ValueError:
            return None, f"Invalid Feedback status: {status_str}"

        if admin_reply is not None:
            feedback.admin_reply = admin_reply.strip()
        feedback.updated_at = datetime.now(timezone.utc)
        db.session.commit()
        return feedback.to_dict(), None
