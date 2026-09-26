import uuid
import random
from decimal import Decimal
from datetime import datetime, timezone
from sqlalchemy.orm import joinedload
from database.connection import db
from database.models.cart import Cart, CartItem
from database.models.food import FoodItem
from database.models.order import (
    Order, OrderItem, OrderStatusHistory, 
    OrderStatus, PaymentMethod, PaymentStatus
)

import math

def calculate_haversine_distance(lat1, lon1, lat2, lon2):
    R = 6371.0 # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2.0) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c

class OrderService:

    @staticmethod
    def _generate_order_number():
        date_str = datetime.now(timezone.utc).strftime("%Y%m%d")
        rand_digits = "".join([str(random.randint(0, 9)) for _ in range(4)])
        return f"ORD-{date_str}-{rand_digits}"

    @staticmethod
    def place_order(user_id, checkout_data):
        """
        ACID Order Checkout Engine:
        Executes inside a single database transaction. Locks cart, reads authoritative DB prices,
        creates Order + Line Items + Status Audit Trail, clears cart, and commits.
        """
        try:
            # 0. Idempotency Check: Prevent duplicate order processing if idempotency_key is supplied
            idempotency_key = checkout_data.get("idempotency_key")
            if idempotency_key:
                existing_order = db.session.query(Order).filter_by(idempotency_key=idempotency_key).first()
                if existing_order:
                    return existing_order.to_dict(), None

            # 1. Fetch user's cart
            cart = db.session.query(Cart).filter_by(user_id=user_id).first()
            if not cart:
                return None, "Cart is empty"

            # 2. Lock cart items with row-level lock
            cart_items = db.session.query(CartItem).filter_by(cart_id=cart.id).with_for_update().all()
            if not cart_items:
                return None, "Cart is empty. Please add items before placing an order."

            subtotal = Decimal("0.00")
            order_items_to_create = []

            # 3. Recalculate price server-side from PostgreSQL food_items table with row-level lock
            for ci in cart_items:
                food = db.session.query(FoodItem).filter_by(id=ci.food_item_id).with_for_update().first()
                if not food or not food.is_available:
                    return None, f"Item '{food.name if food else ci.food_item_id}' is currently unavailable"

                item_price = food.price # Mapped Decimal
                line_subtotal = item_price * ci.quantity
                subtotal += line_subtotal

                order_items_to_create.append({
                    "food_item_id": food.id,
                    "item_name": food.name,
                    "unit_price": item_price,
                    "quantity": ci.quantity,
                    "subtotal": line_subtotal
                })

            # Check client expected subtotal consistency if provided
            expected_subtotal = checkout_data.get("expected_subtotal")
            if expected_subtotal is not None:
                try:
                    exp_val = Decimal(str(expected_subtotal))
                    if abs(subtotal - exp_val) > Decimal("0.01"):
                        return None, "Menu prices have been updated since you added items to your cart. Please review your updated cart total."
                except Exception:
                    pass

            from services.pricing_service import PricingService
            from config import Config

            user_lat = checkout_data.get("delivery_latitude")
            user_lng = checkout_data.get("delivery_longitude")
            delivery_distance_km = None
            pricing_rule_id = None

            if user_lat is not None and user_lng is not None:
                rest_lat, rest_lng = Config.RESTAURANT_LATITUDE, Config.RESTAURANT_LONGITUDE
                dist_km = calculate_haversine_distance(rest_lat, rest_lng, float(user_lat), float(user_lng))
                fee, rule_id, err_msg = PricingService.calculate_delivery_charge(dist_km)
                if err_msg:
                    return None, err_msg
                delivery_fee = fee
                delivery_distance_km = Decimal(str(round(dist_km, 2)))
                pricing_rule_id = rule_id
            else:
                delivery_fee = Decimal("30.00")

            total_amount = subtotal + delivery_fee

            payment_method_str = checkout_data.get("payment_method", "COD").upper()
            if payment_method_str != "COD":
                return None, "Online payments are currently unavailable. Please select Cash on Delivery (COD)."

            pay_method = PaymentMethod.COD
            pay_status = PaymentStatus.PENDING

            # 4. Create Order Master Record
            new_order = Order(
                order_number=OrderService._generate_order_number(),
                idempotency_key=idempotency_key,
                customer_id=user_id,
                delivery_address=checkout_data["delivery_address"].strip(),
                delivery_landmark=checkout_data.get("delivery_landmark"),
                delivery_latitude=Decimal(str(checkout_data["delivery_latitude"])) if checkout_data.get("delivery_latitude") else None,
                delivery_longitude=Decimal(str(checkout_data["delivery_longitude"])) if checkout_data.get("delivery_longitude") else None,
                delivery_distance_km=delivery_distance_km,
                pricing_rule_id=pricing_rule_id,
                subtotal=subtotal,
                delivery_fee=delivery_fee,
                total_amount=total_amount,
                payment_method=pay_method,
                payment_status=pay_status,
                status=OrderStatus.PENDING
            )
            db.session.add(new_order)
            db.session.flush() # Generate new_order.id

            # 5. Attach Order Items (Historical Price Snapshots)
            for item_data in order_items_to_create:
                order_item = OrderItem(
                    order_id=new_order.id,
                    food_item_id=item_data["food_item_id"],
                    item_name=item_data["item_name"],
                    unit_price=item_data["unit_price"],
                    quantity=item_data["quantity"],
                    subtotal=item_data["subtotal"]
                )
                db.session.add(order_item)

            # 6. Record Initial Audit Trail Entry
            idempotency_key = checkout_data.get("idempotency_key")
            notes_str = f"Idempotency-Key: {idempotency_key}" if idempotency_key else "Order placed by customer"
            status_entry = OrderStatusHistory(
                order_id=new_order.id,
                status=OrderStatus.PENDING.value,
                changed_by_user_id=user_id,
                notes=notes_str
            )
            db.session.add(status_entry)

            # 7. Clear User Cart
            db.session.query(CartItem).filter_by(cart_id=cart.id).delete()

            # 8. Commit ACID Transaction
            db.session.commit()
            return new_order.to_dict(), None

        except Exception as e:
            db.session.rollback()
            return None, f"Order placement failed: {str(e)}"

    @staticmethod
    def auto_confirm_pending_orders(window_minutes=5):
        """Auto transitions PENDING orders created > window_minutes ago to CONFIRMED."""
        try:
            from datetime import datetime, timezone, timedelta
            cutoff_time = datetime.now(timezone.utc) - timedelta(minutes=window_minutes)
            
            pending_orders = db.session.query(Order).filter(
                Order.status == OrderStatus.PENDING,
                Order.created_at <= cutoff_time
            ).all()

            for order in pending_orders:
                order.status = OrderStatus.CONFIRMED
                history = OrderStatusHistory(
                    order_id=order.id,
                    status=OrderStatus.CONFIRMED.value,
                    changed_by_user_id=None,
                    notes=f"Auto-confirmed after {window_minutes}-minute customer cancellation window expired"
                )
                db.session.add(history)
            
            if pending_orders:
                db.session.commit()
        except Exception:
            db.session.rollback()

    @staticmethod
    def cancel_customer_order(order_id_str, user_id):
        """Allows customer to cancel PENDING order within 5 minutes of creation."""
        try:
            from datetime import datetime, timezone, timedelta
            order_uuid = uuid.UUID(order_id_str)
            order = db.session.get(Order, order_uuid)
            
            if not order:
                return None, "Order not found"
            if str(order.customer_id) != str(user_id):
                return None, "Unauthorized access to order"
            if order.status != OrderStatus.PENDING:
                return None, f"Order status is '{order.status.value}', which cannot be cancelled."
                
            elapsed_seconds = (datetime.now(timezone.utc) - order.created_at).total_seconds()
            if elapsed_seconds > 300: # 5 minutes window
                order.status = OrderStatus.CONFIRMED
                db.session.commit()
                return None, "Order can no longer be cancelled as the 5-minute cancellation window has expired."
                
            order.status = OrderStatus.CANCELLED
            history = OrderStatusHistory(
                order_id=order.id,
                status=OrderStatus.CANCELLED.value,
                changed_by_user_id=user_id,
                notes="Cancelled by customer within 5-minute window"
            )
            db.session.add(history)
            db.session.commit()
            return order.to_dict(), None
        except Exception as e:
            db.session.rollback()
            return None, str(e)

    @staticmethod
    def get_customer_orders(user_id):
        orders = db.session.query(Order).options(
            joinedload(Order.customer),
            joinedload(Order.delivery_partner),
            joinedload(Order.items),
            joinedload(Order.timeline)
        ).filter_by(customer_id=user_id).order_by(Order.created_at.desc()).all()
        return [order.to_dict() for order in orders]

    @staticmethod
    def get_order_by_id(order_id_str, user_id=None, is_admin=False):
        try:
            order_uuid = uuid.UUID(order_id_str)
            order = db.session.query(Order).options(
                joinedload(Order.customer),
                joinedload(Order.delivery_partner),
                joinedload(Order.items),
                joinedload(Order.timeline)
            ).filter_by(id=order_uuid).first()
            if not order:
                return None, "Order not found"
            
            user_uuid = user_id if isinstance(user_id, uuid.UUID) else (uuid.UUID(str(user_id)) if user_id else None)
            if not is_admin and order.customer_id != user_uuid and order.delivery_partner_id != user_uuid:
                return None, "Unauthorized access to order"
            return order.to_dict(), None
        except ValueError:
            return None, "Invalid Order ID format"

    @staticmethod
    def update_order_status(order_id_str, new_status_str, changed_by_user_id, notes=None):
        try:
            order_uuid = uuid.UUID(order_id_str)
            order = db.session.get(Order, order_uuid)
            if not order:
                return None, "Order not found"

            # 1. Terminal State Check: Cannot modify DELIVERED or CANCELLED orders
            if order.status in [OrderStatus.DELIVERED, OrderStatus.CANCELLED]:
                current_val = order.status.value if hasattr(order.status, "value") else str(order.status)
                return None, f"Order #{order.order_number} is already '{current_val}' and cannot be modified."

            try:
                target_status = OrderStatus(new_status_str)
            except ValueError:
                return None, f"Invalid order status '{new_status_str}'."

            # 2. Enforce Strict State Transition Matrix
            valid_transitions = {
                OrderStatus.PENDING: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
                OrderStatus.CONFIRMED: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
                OrderStatus.PREPARING: [OrderStatus.READY_FOR_PICKUP, OrderStatus.CANCELLED],
                OrderStatus.READY_FOR_PICKUP: [OrderStatus.OUT_FOR_DELIVERY, OrderStatus.CANCELLED],
                OrderStatus.OUT_FOR_DELIVERY: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
                OrderStatus.DELIVERED: [],
                OrderStatus.CANCELLED: []
            }

            allowed_targets = valid_transitions.get(order.status, [])
            if target_status not in allowed_targets:
                curr_val = order.status.value if hasattr(order.status, "value") else str(order.status)
                return None, f"Illegal status transition: cannot change order status from '{curr_val}' to '{target_status.value}'."

            # 3. Driver Requirement Check for OUT_FOR_DELIVERY
            if target_status == OrderStatus.OUT_FOR_DELIVERY and not order.delivery_partner_id:
                return None, "Cannot change status to OUT_FOR_DELIVERY without an assigned delivery partner. Please assign a delivery partner first."

            order.status = target_status
            
            history = OrderStatusHistory(
                order_id=order.id,
                status=target_status.value,
                changed_by_user_id=changed_by_user_id,
                notes=notes or f"Status updated to {target_status.value}"
            )
            db.session.add(history)
            db.session.commit()
            return order.to_dict(), None
        except ValueError:
            db.session.rollback()
            return None, "Invalid Order ID format"
        except Exception as e:
            db.session.rollback()
            return None, f"Status update failed: {str(e)}"

    @staticmethod
    def get_all_orders(status=None, limit=100):
        query = db.session.query(Order).options(
            joinedload(Order.customer),
            joinedload(Order.delivery_partner),
            joinedload(Order.items),
            joinedload(Order.timeline)
        )
        if status and status != "ALL":
            query = query.filter(Order.status == status)
            
        orders = query.order_by(Order.created_at.desc()).limit(limit).all()
        return [order.to_dict() for order in orders]

