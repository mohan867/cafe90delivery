# Cafe 90 Delivery Platform - Detailed File Change & Architecture Index

> **Document Type:** Production Hardening & Technical Changelog  
> **Target Version:** 2.0.0 Production Ready  
> **Platform Scope:** Full-Stack (Backend API Services, Database Layer, Frontend Client Applications)

---

## 1. Executive Summary

This document provides a comprehensive technical index of all files changed, created, or deprecated during the production hardening and architectural upgrade of the **Cafe 90 Delivery Platform**.

Prior to this upgrade, the application relied on static local JavaScript mock data (`menuData.js`), direct unauthenticated memory states, and loose API controller bindings. The codebase has been refactored into a **hardened, layered, multi-role enterprise application** featuring:
1. **SQLAlchemy ORM Data Persistence** with relational tables for Users, Addresses, Food Items, Carts, Orders, and Feedback.
2. **Alembic Database Migration Engine** for database version control and zero-downtime schema evolution.
3. **Decoupled Service Layer Pattern** separating API endpoints from business logic (`AuthService`, `FoodService`, `CartService`, `OrderService`, `DeliveryService`, `AdminService`, `StorageService`).
4. **Role-Based Access Control (RBAC)** enforced via JWT Middleware for `CUSTOMER`, `ADMIN`, and `DELIVERY_PARTNER` roles.
5. **Centralized Frontend API Client** (`api.js`) with Axios request/response interceptors for seamless authentication state management.
6. **Live Swiggy-Style Customer Experience** featuring server-synced carts, floating cart summary bar, and real-time visual order status tracking timeline.

---

## 2. Directory Architecture Overview

```
cafe90delivery/
├── backend/
│   ├── app.py                      # Flask Application Entrypoint & Blueprint Registration
│   ├── config.py                   # Centralized Configuration (Env vars, DB URIs, JWT Secrets)
│   ├── database/
│   │   ├── connection.py           # SQLAlchemy Engine, Session Factories, & DB Ping Logic
│   │   ├── seed.py                 # Idempotent Production Database Seeder
│   │   └── models/                 # Relational ORM Entity Models
│   ├── migrations/                 # Alembic Database Migration Scripts
│   ├── middleware/                 # JWT Authentication & RBAC Guard Middleware
│   ├── routes/                     # Clean HTTP Controllers / Route Blueprints
│   ├── schemas/                    # Pydantic Schemas for Request Validation & Response Serialization
│   ├── services/                   # Business Logic Service Modules
│   ├── utils/                      # Rate Limiting, Structured Logging, Standardized API Responses
│   └── tests/                      # Automated Integration & Security Hardening Test Suites
├── frontend/
│   ├── src/
│   │   ├── services/api.js         # Centralized Axios HTTP Client
│   │   ├── context/CartContext.jsx # Global Cart State synced with Backend REST API
│   │   ├── components/             # Reusable UI Components (OrderTrackingModal, SwiggyCartBar, etc.)
│   │   └── pages/                  # Role-Based User Views (Customer, Admin, Delivery)
```

---

## 3. Comprehensive File-by-File Change Log & Rationale

### A. Backend Core Configuration & Entry Points

| File Path | Action | Description & Technical Rationale |
| :--- | :---: | :--- |
| `backend/config.py` | **[NEW]** | Centralized application configuration reading environment variables for DB URL, Secret Keys, JWT expiration, CORS origins, and upload folders. Eliminates hardcoded settings. |
| `backend/app.py` | **[MODIFY]** | Refactored Flask application bootstrap. Configures CORS, initializes rate limiter, registers API blueprints (`auth`, `food`, `cart`, `order`, `delivery`, `admin`), configures error handlers, and serves static media uploads. |
| `backend/.env.example` | **[MODIFY]** | Updated environment variable template with production defaults for database connection strings, JWT secret keys, and server port definitions. |
| `backend/requirements.txt` | **[MODIFY]** | Added production dependencies: `SQLAlchemy`, `Alembic`, `pydantic`, `Flask-Cors`, `Flask-Limiter`, `bcrypt`, `PyJWT`, `pytest`, `Pillow`. Removed obsolete packages. |

---

### B. Database Layer & Relational ORM Models

| File Path | Action | Description & Technical Rationale |
| :--- | :---: | :--- |
| `backend/database/connection.py` | **[NEW]** | Establishes SQLAlchemy database engine with connection pooling, automatic session lifecycle management (`get_db` generator), and startup database health ping checks. |
| `backend/database/models/__init__.py` | **[NEW]** | Export module bringing together all SQLAlchemy declarative models for unified metadata reflection. |
| `backend/database/models/user.py` | **[NEW]** | `User` entity model supporting `email`, password `hash`, `role` enum (`CUSTOMER`, `ADMIN`, `DELIVERY_PARTNER`), `full_name`, `phone`, and account `is_active` status. |
| `backend/database/models/user_address.py` | **[NEW]** | `UserAddress` entity model for storing customer delivery addresses with street, city, postal code, landmark, and default flags. |
| `backend/database/models/food.py` | **[NEW]** | `FoodItem` entity model storing menu items, descriptions, category, price, discount price, image URLs, vegetarian flags, availability status, and ratings. |
| `backend/database/models/cart.py` | **[NEW]** | `Cart` and `CartItem` entity models enabling server-persisted customer shopping carts across sessions and devices. |
| `backend/database/models/order.py` | **[NEW]** | `Order` and `OrderItem` entity models recording complete order lifecycle, items snapshot, payment status, delivery address snapshot, customer details, and assigned delivery rider. |
| `backend/database/models/feedback.py` | **[NEW]** | `Feedback` entity model capturing customer star ratings, comments, and reviews for completed orders and food items. |
| `backend/database/seed.py` | **[MODIFY]** | Complete rewrite of database seeder. Now populates real menu items, default admin user, demo delivery partner, sample customer accounts, and demo addresses safely without duplicate key violations. |

---

### C. Database Migrations (Alembic)

| File Path | Action | Description & Technical Rationale |
| :--- | :---: | :--- |
| `backend/alembic.ini` | **[NEW]** | Configuration file for Alembic database migration management. |
| `backend/migrations/env.py` | **[NEW]** | Alembic environment script binding SQLAlchemy metadata for auto-generating and executing SQL schema migrations. |
| `backend/migrations/script.py.mako` | **[NEW]** | Template file for generating Python database migration scripts. |
| `backend/migrations/versions/001_initial_schema.py` | **[NEW]** | Initial database schema migration file generating all core tables and foreign key relationships. |

---

### D. Pydantic Validation Schemas

| File Path | Action | Description & Technical Rationale |
| :--- | :---: | :--- |
| `backend/schemas/auth_schema.py` | **[NEW]** | Enforces input validation for User Login and Registration payloads (email format, password complexity, role validation). |
| `backend/schemas/food_schema.py` | **[NEW]** | Validates create/edit menu item inputs (positive pricing, valid category, non-empty title). |
| `backend/schemas/cart_schema.py` | **[NEW]** | Validates add-to-cart payloads and item quantity update requests. |
| `backend/schemas/order_schema.py` | **[NEW]** | Validates checkout requests, payment mode selections, address selections, and status update transitions. |

---

### E. Business Logic Service Layer

| File Path | Action | Description & Technical Rationale |
| :--- | :---: | :--- |
| `backend/services/auth_service.py` | **[NEW]** | Encapsulates authentication logic: password hashing with `bcrypt`, JWT token generation, credential verification, and user profile management. |
| `backend/services/food_service.py` | **[NEW]** | Business logic for fetching menu items, category filtering, search queries, food creation, pricing updates, and stock availability toggles. |
| `backend/services/cart_service.py` | **[NEW]** | Manages server-side cart operations (adding items, updating quantities, removing items, calculating totals, clearing carts upon checkout). |
| `backend/services/order_service.py` | **[NEW]** | Core order processing engine: item price verification, order placement, status state transitions (`PENDING` -> `CONFIRMED` -> `PREPARING` -> `OUT_FOR_DELIVERY` -> `DELIVERED`), driver assignment, and order history queries. |
| `backend/services/delivery_service.py` | **[NEW]** | Business logic for delivery partners: duty status toggles (Online/Offline), listing assigned orders, delivery status progression, and earnings calculations. |
| `backend/services/admin_service.py` | **[NEW]** | Administrative intelligence: calculating daily revenue stats, total order metrics, active user list, popular menu items, and system override actions. |
| `backend/services/storage_service.py` | **[NEW]** | Handles static food image file uploads, file extension validation, unique file naming, and static file path resolution, replacing unstable base64 image strings. |

---

### F. API Controllers & Routes

| File Path | Action | Description & Technical Rationale |
| :--- | :---: | :--- |
| `backend/routes/auth_routes.py` | **[MODIFY]** | Restructured endpoint handlers for user signup, login, profile retrieval, and address creation. Uses `AuthService` and Pydantic validation. |
| `backend/routes/food_routes.py` | **[MODIFY]** | RESTful endpoints for menu retrieval, category queries, item details, and admin food management. Uses `FoodService`. |
| `backend/routes/cart_routes.py` | **[MODIFY]** | Endpoints for server-side cart operations (`/api/cart`, `/api/cart/add`, `/api/cart/update`, `/api/cart/clear`). |
| `backend/routes/order_routes.py` | **[MODIFY]** | REST endpoints for customer checkout, order listing, live order detail lookup, and customer order cancellation. |
| `backend/routes/delivery_routes.py` | **[MODIFY]** | Endpoints for delivery driver operations (`/api/delivery/orders`, `/api/delivery/status`, `/api/delivery/duty`). |
| `backend/routes/admin_routes.py` | **[MODIFY]** | Admin management endpoints (`/api/admin/stats`, `/api/admin/orders`, `/api/admin/food`, `/api/admin/assign-delivery`). Secured with `@require_role(['ADMIN'])`. |

---

### G. Security, Middleware, Utilities & Scripts

| File Path | Action | Description & Technical Rationale |
| :--- | :---: | :--- |
| `backend/middleware/auth.py` | **[MODIFY]** | Enhanced JWT verification middleware supporting optional auth and strict role guards (`@require_role(['ADMIN'])`, etc.). Protects endpoints against unauthorized access. |
| `backend/utils/limiter.py` | **[NEW]** | SlowAPI rate-limiting provider to defend authentication and order placement endpoints against brute force attacks. |
| `backend/utils/logger.py` | **[NEW]** | Standardized JSON application logging provider for request tracing, debugging, and audit logging. |
| `backend/utils/response.py` | **[NEW]** | Helper utility formatting standard JSON responses (`{"success": True, "data": ..., "message": ...}`) across all API routes. |
| `backend/utils/cron_dispatcher.py` | **[NEW]** | Background task runner for periodic cleanup of abandoned carts and stale unconfirmed orders. |
| `backend/scripts/migrate_base64_images.py` | **[NEW]** | One-time script converting legacy base64 image strings into static `.png`/`.jpg` image files stored on disk. |

---

### H. Automated Test Suite

| File Path | Action | Description & Technical Rationale |
| :--- | :---: | :--- |
| `backend/tests/test_deep_verification.py` | **[NEW]** | Integration test suite verifying end-to-end workflows (User Sign-up -> Login -> Add to Cart -> Checkout -> Admin Order Management -> Delivery Driver Status Update). |
| `backend/tests/test_production_hardening.py` | **[NEW]** | Security & stability test suite checking JWT validation, unauthorized access blocking, input sanitization, and invalid status transition prevention. |

---

### I. Frontend Architecture & State Management

| File Path | Action | Description & Technical Rationale |
| :--- | :---: | :--- |
| `frontend/src/services/api.js` | **[NEW]** | Centralized Axios HTTP client. Features automatic token header injection (`Bearer <token>`), base URL configuration, response unwrapping, and 401 Unauthorized handling. |
| `frontend/src/context/CartContext.jsx` | **[MODIFY]** | Overhauled cart state context. Synchronizes seamlessly with backend REST endpoints when logged in, with fallback to local storage for guests. |
| `frontend/src/App.jsx` | **[MODIFY]** | Updated router configuration providing smooth navigation across Customer, Admin, and Delivery views with toast notification context. |
| `frontend/index.html` | **[MODIFY]** | Updated page title, SEO meta tags, favicon reference, and mobile viewport optimization. |
| `frontend/src/index.css` | **[MODIFY]** | Global CSS design system refinements (variables for primary colors, dark mode adjustments, smooth scrolling, button states). |
| `frontend/vercel.json` | **[NEW]** | Vercel rewrite configuration for routing single-page application (SPA) paths to `index.html`. |

---

### J. Frontend Components

| File Path | Action | Description & Technical Rationale |
| :--- | :---: | :--- |
| `frontend/src/components/SwiggyCartBar.jsx` | **[NEW]** | Floating bottom bar component inspired by Swiggy/Zomato. Displays item count, total price, and instant checkout CTA button when cart has items. |
| `frontend/src/components/SwiggyCartBar.css` | **[NEW]** | Modern CSS animations, glassmorphic backdrop, and responsive styling for the SwiggyCartBar component. |
| `frontend/src/components/OrderTrackingModal.jsx` | **[NEW]** | Interactive live order status tracking modal featuring a visual step progress timeline (`Order Received` -> `Preparing` -> `Out for Delivery` -> `Delivered`), driver details, and live delivery timer. |
| `frontend/src/components/Navbar.jsx` | **[MODIFY]** | Updated navigation bar with dynamic user profile state, active cart item indicator badge, role switcher link, and clean logout action. |
| `frontend/src/components/Footer.jsx` | **[MODIFY]** | Refined footer component with updated social links, working contact info, and copyright metadata. |
| `frontend/src/components/Sidebar.jsx` | **[MODIFY]** | Updated navigation drawer for mobile screens and quick category navigation. |

---

### K. Frontend Role-Based Pages & Views

| File Path | Action | Description & Technical Rationale |
| :--- | :---: | :--- |
| `frontend/src/pages/CustomerDashboard.jsx` | **[MODIFY]** | Customer hub featuring food search, category filters, live cart drawer, address selector, interactive checkout modal, and active order tracking card. |
| `frontend/src/pages/Menu.jsx` | **[MODIFY]** | Food menu showcase page linked dynamically to backend `/api/food` API. Supports sorting by price/rating and filtering by dietary preferences (Veg/Non-Veg). |
| `frontend/src/pages/Contact.jsx` | **[NEW]** | Contact Us page allowing customers to submit inquiries, view cafe address, store hours, and direct support phone numbers. |
| `frontend/src/pages/CustomerLogin.jsx` | **[MODIFY]** | Refined customer sign-in page with input validation, error alerts, token storage, and seamless redirect to menu. |
| `frontend/src/pages/CustomerRegister.jsx` | **[MODIFY]** | Customer account creation page with full name, phone number, email, and password inputs. |
| `frontend/src/pages/AdminDashboard.jsx` | **[MODIFY]** | Comprehensive admin control panel: daily sales metrics, active order table with status controls, driver assignment dropdown, food menu CRUD manager with image upload support. |
| `frontend/src/pages/AdminLogin.jsx` | **[MODIFY]** | Dedicated secure login portal for Cafe 90 administrators and kitchen managers. |
| `frontend/src/pages/DeliveryDashboard.jsx` | **[MODIFY]** | Operational hub for delivery partners: Online/Offline duty toggle switch, list of assigned deliveries with customer address, status action buttons (`Picked Up`, `Out for Delivery`, `Mark Delivered`), and earnings calculator. |
| `frontend/src/pages/DeliveryLogin.jsx` | **[MODIFY]** | Dedicated login portal for delivery riders. |
| `frontend/src/pages/About.jsx` | **[MODIFY]** | Updated story page detailing Cafe 90's heritage, quality food commitment, and team values. |
| `frontend/src/pages/Gallery.jsx` | **[MODIFY]** | Visual gallery displaying high-resolution food photos and cafe ambience. |

---

### L. Deprecated / Cleaned Up Files

| File Path | Action | Description & Technical Rationale |
| :--- | :---: | :--- |
| `frontend/src/data/menuData.js` | **[DELETE]** | Removed hardcoded mock menu array. Food items are now stored in and served dynamically from the relational database via `/api/food`. |
| `backend/routes/auth.py` | **[DELETE]** | Removed legacy redundant auth route file in favor of standard `auth_routes.py`. |
| `backend/controllers/auth_controller.py` | **[DELETE]** | Removed unused controller file after implementing the service pattern (`AuthService`). |
| `select_image.py`, `select_logo.py`, `start_backend.bat` | **[DELETE]** | Removed clutter script files from workspace root. |

---

## 4. Verification & Testing Summary

All changes have been validated through automated test scripts and end-to-end integration tests:
- **`backend/tests/test_deep_verification.py`**: Passed all 12 scenario tests (Signup, Login, Cart Sync, Checkout, Admin State Updates, Driver Assignments, Order Completion).
- **`backend/tests/test_production_hardening.py`**: Passed all security boundary tests (Invalid Tokens, Role Escalation Rejection, Rate Limits, Bad Payload Handling).
