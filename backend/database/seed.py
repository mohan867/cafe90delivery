import os
import sys
from decimal import Decimal

# Ensure backend root is in Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.append(parent_dir)

from app import create_app
from database.connection import db
from database.models.user import User, UserRole
from database.models.food import FoodCategory, FoodItem, DietType
from database.models.cart import Cart
from flask_bcrypt import Bcrypt

bcrypt = Bcrypt()

from database.connection import db, ensure_database_exists

def seed_database(app=None, reset=False):
    if app is None:
        from app import create_app
        app = create_app(skip_autoseed=True)
    with app.app_context():
        db_uri = app.config.get("SQLALCHEMY_DATABASE_URI")
        if db_uri:
            ensure_database_exists(db_uri)

        if reset:
            env = app.config.get("ENVIRONMENT", "development")
            if env == "production":
                raise RuntimeError("CRITICAL SAFETY: db.drop_all() via reset=True is FORBIDDEN in production environment!")
            print("⚠️ Reset requested: Dropping database tables...")
            db.drop_all()
            
        db.create_all()


        # 1. Seed Users
        admin_email = "admin@cafe90.com"
        if not db.session.query(User).filter_by(email=admin_email).first():
            admin = User(
                email=admin_email,
                password_hash=bcrypt.generate_password_hash("admincafe90").decode("utf-8"),
                full_name="Super Admin",
                phone="9876543210",
                role=UserRole.ADMIN
            )
            db.session.add(admin)
            print(f"✅ Admin created: {admin_email} / admincafe90")

        delivery_email = "delivery@cafe90.com"
        if not db.session.query(User).filter_by(email=delivery_email).first():
            delivery = User(
                email=delivery_email,
                password_hash=bcrypt.generate_password_hash("delivery123").decode("utf-8"),
                full_name="Rahul Dravid",
                phone="9876543211",
                role=UserRole.DELIVERY_PARTNER
            )
            db.session.add(delivery)
            print(f"✅ Delivery Partner created: {delivery_email} / delivery123")

        customer_email = "customer@cafe90.com"
        customer_user = db.session.query(User).filter_by(email=customer_email).first()
        if not customer_user:
            customer_user = User(
                email=customer_email,
                password_hash=bcrypt.generate_password_hash("customer123").decode("utf-8"),
                full_name="John Doe",
                phone="9876543212",
                role=UserRole.CUSTOMER
            )
            db.session.add(customer_user)
            db.session.flush()
            
            cart = Cart(user_id=customer_user.id)
            db.session.add(cart)
            print(f"✅ Customer created: {customer_email} / customer123")

        # 2. Seed Food Categories & Items
        categories_data = [
            {"name": "Beverages", "order": 1},
            {"name": "Snacks", "order": 2},
            {"name": "Main Course", "order": 3},
            {"name": "Desserts", "order": 4},
        ]

        category_map = {}
        for cat_data in categories_data:
            cat = db.session.query(FoodCategory).filter_by(name=cat_data["name"]).first()
            if not cat:
                cat = FoodCategory(
                    name=cat_data["name"],
                    description=f"Fresh 90s style {cat_data['name'].lower()}",
                    display_order=cat_data["order"]
                )
                db.session.add(cat)
                db.session.flush()
            category_map[cat_data["name"]] = cat

        initial_food_items = [
            {
                "category": "Beverages",
                "name": "Classic Filter Coffee",
                "desc": "Traditional South Indian filter coffee with frothy milk.",
                "price": Decimal("49.00"),
                "img": "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=400&q=80",
                "diet": DietType.VEG
            },
            {
                "category": "Beverages",
                "name": "Mint Mojito",
                "desc": "Refreshing lime and mint cooler.",
                "price": Decimal("89.00"),
                "img": "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=400&q=80",
                "diet": DietType.VEG
            },
            {
                "category": "Snacks",
                "name": "Paneer Tikka Sandwich",
                "desc": "Grilled sandwich stuffed with spiced paneer tikka.",
                "price": Decimal("129.00"),
                "img": "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=400&q=80",
                "diet": DietType.VEG
            },
            {
                "category": "Main Course",
                "name": "Chicken Biryani",
                "desc": "Aromatic basmati rice cooked with tender chicken and spices.",
                "price": Decimal("249.00"),
                "img": "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=400&q=80",
                "diet": DietType.NON_VEG
            },
            {
                "category": "Desserts",
                "name": "Sizzling Brownie with Ice Cream",
                "desc": "Hot chocolate brownie served with vanilla ice cream and fudge sauce.",
                "price": Decimal("159.00"),
                "img": "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=400&q=80",
                "diet": DietType.VEG
            }
        ]

        for item_data in initial_food_items:
            existing_item = db.session.query(FoodItem).filter_by(name=item_data["name"]).first()
            if existing_item:
                existing_item.image_url = item_data["img"]
            else:
                cat = category_map[item_data["category"]]
                food_item = FoodItem(
                    category_id=cat.id,
                    name=item_data["name"],
                    description=item_data["desc"],
                    price=item_data["price"],
                    image_url=item_data["img"],
                    diet_type=item_data["diet"]
                )
                db.session.add(food_item)

        # 3. Seed Sample Orders for Testing History & Delivery Partner History
        from database.models.order import Order, OrderItem, OrderStatusHistory, OrderStatus
        from datetime import datetime, timezone, timedelta

        delivery_partner_user = db.session.query(User).filter_by(role=UserRole.DELIVERY_PARTNER).first()
        customer_user_account = db.session.query(User).filter_by(role=UserRole.CUSTOMER).first()

        existing_orders_count = db.session.query(Order).count()
        if existing_orders_count == 0 and customer_user_account and delivery_partner_user:
            items_list = db.session.query(FoodItem).all()
            if items_list:
                item_coffee = next((i for i in items_list if "Coffee" in i.name), items_list[0])
                item_sandwich = next((i for i in items_list if "Sandwich" in i.name), items_list[0])
                item_biryani = next((i for i in items_list if "Biryani" in i.name), items_list[0])
                item_brownie = next((i for i in items_list if "Brownie" in i.name), items_list[0])

                now = datetime.now(timezone.utc)

                sample_orders_data = [
                    {
                        "status": OrderStatus.DELIVERED,
                        "partner_id": delivery_partner_user.id,
                        "created_at": now - timedelta(hours=2),
                        "address": "42 MG Road, Koramangala, Bangalore",
                        "items": [
                            {"item": item_coffee, "qty": 2, "price": item_coffee.price},
                            {"item": item_sandwich, "qty": 1, "price": item_sandwich.price},
                        ]
                    },
                    {
                        "status": OrderStatus.OUT_FOR_DELIVERY,
                        "partner_id": delivery_partner_user.id,
                        "created_at": now - timedelta(minutes=45),
                        "address": "15 Indiranagar 100ft Road, Bangalore",
                        "items": [
                            {"item": item_biryani, "qty": 1, "price": item_biryani.price},
                            {"item": item_brownie, "qty": 1, "price": item_brownie.price},
                        ]
                    },
                    {
                        "status": OrderStatus.READY_FOR_PICKUP,
                        "partner_id": None,
                        "created_at": now - timedelta(minutes=15),
                        "address": "88 HSR Layout Sector 3, Bangalore",
                        "items": [
                            {"item": item_biryani, "qty": 2, "price": item_biryani.price},
                        ]
                    },
                    {
                        "status": OrderStatus.DELIVERED,
                        "partner_id": delivery_partner_user.id,
                        "created_at": now - timedelta(days=1, hours=3),
                        "address": "104 Whitefield Main Rd, Bangalore",
                        "items": [
                            {"item": item_sandwich, "qty": 2, "price": item_sandwich.price},
                            {"item": item_brownie, "qty": 1, "price": item_brownie.price},
                        ]
                    },
                    {
                        "status": OrderStatus.DELIVERED,
                        "partner_id": delivery_partner_user.id,
                        "created_at": now - timedelta(days=3, hours=5),
                        "address": "77 Jayanagar 4th Block, Bangalore",
                        "items": [
                            {"item": item_coffee, "qty": 3, "price": item_coffee.price},
                        ]
                    },
                    {
                        "status": OrderStatus.CANCELLED,
                        "partner_id": None,
                        "created_at": now - timedelta(days=5),
                        "address": "12 Electronic City Phase 1, Bangalore",
                        "items": [
                            {"item": item_sandwich, "qty": 1, "price": item_sandwich.price},
                        ]
                    }
                ]

                import random
                for idx, s_data in enumerate(sample_orders_data, 101):
                    subtotal = sum(d["qty"] * d["price"] for d in s_data["items"])
                    delivery_fee = Decimal("40.00")
                    total_amount = subtotal + delivery_fee

                    order = Order(
                        order_number=f"C90-{idx}",
                        customer_id=customer_user_account.id,
                        delivery_partner_id=s_data["partner_id"],
                        status=s_data["status"],
                        subtotal=subtotal,
                        delivery_fee=delivery_fee,
                        total_amount=total_amount,
                        delivery_address=s_data["address"],
                        payment_method="COD",
                        payment_status="COMPLETED" if s_data["status"] != OrderStatus.CANCELLED else "FAILED",
                        created_at=s_data["created_at"],
                        updated_at=s_data["created_at"]
                    )
                    db.session.add(order)
                    db.session.flush()

                    for item_d in s_data["items"]:
                        o_item = OrderItem(
                            order_id=order.id,
                            food_item_id=item_d["item"].id,
                            item_name=item_d["item"].name,
                            unit_price=item_d["price"],
                            quantity=item_d["qty"],
                            subtotal=item_d["qty"] * item_d["price"]
                        )
                        db.session.add(o_item)

                    history = OrderStatusHistory(
                        order_id=order.id,
                        status=s_data["status"].value if hasattr(s_data["status"], "value") else str(s_data["status"]),
                        notes=f"Order seeded with status {s_data['status']}",
                        created_at=s_data["created_at"]
                    )
                    db.session.add(history)

                print("✅ Seeded sample customer orders with history and delivery assignments!")

        db.session.commit()
        print("🎉 Database seeding completed successfully!")

if __name__ == "__main__":
    seed_database()
