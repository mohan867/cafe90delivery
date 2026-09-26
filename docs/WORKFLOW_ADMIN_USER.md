# Cafe 90 - Admin & Restaurant Manager Guide & Easy Workflow

> **Welcome Cafe 90 Administrators & Kitchen Managers!**  
> This simple, non-technical guide explains how to manage kitchen operations, control food menu items, track daily sales, process customer orders, and assign delivery partners using the **Cafe 90 Admin Dashboard**.

---

## 👨‍🍳 What is the Admin Dashboard?

The Admin Dashboard is the central control hub for Cafe 90 managers. It lets you run your restaurant digitally without any complicated tech steps:
- Add or update food items and prices.
- Turn food items ON or OFF if ingredients run out.
- View new incoming orders in real-time.
- Move order status from *Cooking* to *Ready*.
- Assign delivery drivers to deliver food.
- View daily sales, earnings, and customer reviews.

---

## 📊 Overview: Daily Admin Workflow Flowchart

```mermaidYou are a senior software architect, backend engineer, frontend engineer, DevOps engineer, database engineer, security engineer, QA engineer, and production reliability engineer.

I have an application for a **single restaurant**, primarily serving customers **within one district/local geographic area**.

The planned production architecture is:

* Frontend: **Vercel**
* Backend/API: **Render**
* Database: **Neon PostgreSQL**
* The application is NOT intended to be a multi-restaurant marketplace like Swiggy/Zomato.
* The expected operating area is primarily one district.
* Therefore, evaluate scalability according to a realistic single-restaurant application rather than assuming millions of users.

Your task is to perform a **complete production-readiness audit of the entire project**.

Do NOT give generic recommendations.

First inspect the entire codebase and understand:

* frontend architecture
* backend architecture
* API structure
* authentication/authorization
* database schema and queries
* state management
* file/image handling
* payments if present
* order lifecycle
* restaurant/admin functionality
* delivery functionality if present
* maps/location functionality
* notifications if present
* background jobs
* caching
* logging
* error handling
* deployment configuration
* environment variables
* third-party services
* build configuration
* dependency management
* security configuration
* CORS
* database connection handling
* production configuration

Then produce a structured audit.

==================================================

1. FIRST: UNDERSTAND THE APPLICATION
   ==================================================

Before identifying problems, explain your understanding of the application.

Document:

1. What the application does
2. Main user types
3. Main user journeys
4. Main business workflows
5. Frontend architecture
6. Backend architecture
7. Database architecture
8. External services
9. How orders are created and processed
10. How authentication works
11. How restaurant/admin operations work
12. How delivery/location functionality works
13. Expected traffic pattern for a single restaurant within one district

If something is unclear from the code, explicitly state:

"UNKNOWN — requires confirmation"

Do not invent functionality.

==================================================
2. ARCHITECTURE AUDIT
=====================

Analyze whether the current architecture is appropriate for:

Vercel + Render + Neon PostgreSQL.

Check:

* frontend/backend separation
* API architecture
* REST API design
* request/response structure
* service layer
* repository/data-access layer
* separation of concerns
* dependency management
* circular dependencies
* duplicated business logic
* tightly coupled components
* unnecessary complexity
* scalability bottlenecks
* single points of failure
* incorrect assumptions about serverless vs persistent servers
* frontend directly accessing the database
* backend responsibilities incorrectly implemented in frontend
* incorrect use of environment variables
* architecture that may work locally but fail in production

For every issue explain:

* Why it is a problem
* Production impact
* Whether it blocks deployment
* Recommended solution

==================================================
3. FRONTEND AUDIT
=================

Analyze the frontend comprehensively.

Check:

* build process
* production build
* routing
* API communication
* API base URL configuration
* environment variables
* authentication persistence
* token handling
* protected routes
* authorization assumptions
* loading states
* error states
* empty states
* form validation
* duplicate submissions
* race conditions
* optimistic updates
* stale data
* state management
* unnecessary API requests
* caching
* pagination
* infinite scrolling
* image optimization
* large assets
* bundle size
* mobile responsiveness
* accessibility
* SEO where applicable
* browser compatibility
* network failure handling
* offline/poor-network behavior
* XSS risks
* sensitive data exposed in frontend
* secrets accidentally bundled into frontend
* console/debug statements
* production logging

Pay special attention to whether frontend code assumes that the backend is always available.

==================================================
4. BACKEND/API AUDIT
====================

Analyze the backend as if it is going to production on Render.

Check:

* application startup
* production server configuration
* Gunicorn/Uvicorn configuration if Python
* worker configuration
* graceful shutdown
* request timeouts
* connection handling
* middleware
* CORS
* authentication
* authorization
* input validation
* output validation
* error handling
* exception handling
* HTTP status codes
* API consistency
* idempotency
* duplicate requests
* concurrency issues
* race conditions
* transaction handling
* long-running requests
* background processing
* file uploads
* memory usage
* CPU-heavy operations
* blocking operations
* synchronous operations inside async code
* database access patterns
* N+1 queries
* inefficient queries
* pagination
* rate limiting
* request size limits
* security headers
* logging
* monitoring
* health endpoints
* readiness/liveness considerations

Determine whether the backend is suitable for Render's environment.

==================================================
5. DATABASE / NEON POSTGRESQL AUDIT
===================================

Analyze the database deeply.

Check:

### Schema

* tables
* primary keys
* foreign keys
* unique constraints
* NOT NULL constraints
* CHECK constraints
* indexes
* relationships
* normalization
* denormalization
* nullable fields
* data types
* timestamps
* timezone handling
* enum/status design

### Query performance

Identify:

* missing indexes
* unnecessary indexes
* N+1 queries
* full table scans
* inefficient joins
* unnecessary SELECT *
* expensive filtering
* inefficient ordering
* duplicate queries
* queries that will become slow as data grows

### Transactions

Check:

* order creation
* payment processing
* stock/menu availability
* order status transitions
* concurrent updates
* rollback behavior
* transaction boundaries
* race conditions

### Neon compatibility

Check:

* PostgreSQL compatibility
* connection pooling
* connection limits
* ORM configuration
* serverless/persistent connection assumptions
* connection lifetime
* idle connections
* migration strategy
* production migration safety
* SSL configuration
* database URL handling

Explain exactly how the application should connect to Neon in production.

==================================================
6. ORDER / BUSINESS LOGIC AUDIT
===============================

Because this is a restaurant application, deeply analyze the order lifecycle.

Trace:

Customer:

Browse menu
→ Add items
→ Cart
→ Address/location
→ Checkout
→ Payment
→ Order creation
→ Restaurant acceptance
→ Preparation
→ Ready
→ Delivery/pickup
→ Completion

Check for:

* duplicate orders
* duplicate payments
* price manipulation
* quantity manipulation
* client-side price trust
* menu item availability problems
* order status inconsistencies
* invalid status transitions
* cancellation problems
* refund problems
* concurrent order updates
* stock/availability race conditions
* stale cart data
* incorrect totals
* delivery fee manipulation
* coupon manipulation
* unauthorized order access

Identify which values MUST be calculated/validated by the backend.

==================================================
7. AUTHENTICATION & AUTHORIZATION
=================================

Audit:

* registration
* login
* logout
* password handling
* password hashing
* JWT/session implementation
* refresh tokens
* token expiry
* token storage
* cookie configuration
* HttpOnly
* Secure
* SameSite
* CSRF
* role-based authorization
* admin authorization
* restaurant staff authorization
* delivery personnel authorization
* object-level authorization

Check for IDOR/BOLA vulnerabilities such as:

/orders/{id}
/users/{id}
/addresses/{id}
/payments/{id}

Make sure a user cannot access another user's resources simply by changing an ID.

==================================================
8. SECURITY AUDIT
=================

Perform a security review based on OWASP principles.

Check:

* SQL injection
* XSS
* CSRF
* SSRF
* IDOR/BOLA
* authentication bypass
* authorization bypass
* insecure direct object references
* mass assignment
* insecure deserialization
* command injection
* path traversal
* file upload vulnerabilities
* malicious input
* sensitive information exposure
* secrets in Git
* secrets in frontend
* insecure CORS
* weak password policy
* token leakage
* excessive API permissions
* missing rate limits
* brute-force attacks
* abuse of expensive endpoints
* debug mode
* stack traces exposed to clients
* dependency vulnerabilities
* unsafe admin endpoints

Classify each issue as:

CRITICAL
HIGH
MEDIUM
LOW

==================================================
9. PAYMENT AUDIT
================

If payments exist, inspect the complete implementation.

Check:

* payment provider integration
* frontend payment flow
* backend payment verification
* webhook handling
* webhook signature verification
* duplicate webhook handling
* idempotency
* payment/order consistency
* failed payment handling
* pending payment handling
* refund handling
* amount verification
* currency verification
* client-side manipulation
* payment status reconciliation

NEVER assume a successful frontend payment callback is sufficient proof of payment.

==================================================
10. MAPS / LOCATION AUDIT
=========================

If the application uses Google Maps or another mapping provider, inspect:

* API usage
* API keys
* frontend vs backend keys
* key restrictions
* billing configuration
* Places API usage
* Maps JavaScript API usage
* geocoding
* reverse geocoding
* autocomplete
* nearby places
* distance calculation
* delivery radius
* coordinates
* address validation
* location accuracy
* fallback behavior

Because this application operates primarily within one district, determine whether the current maps architecture is unnecessarily expensive or complex.

Also verify whether "nearby places" functionality actually works at the maximum/available zoom level and whether the correct API is being used for the intended purpose.

==================================================
11. FILES / IMAGES / STORAGE
============================

Check how images/files are stored.

Determine whether the application incorrectly stores uploaded files inside:

* local Render filesystem
* frontend repository
* backend filesystem

If local filesystem storage is being used, explain why this is unsafe for production and recommend an appropriate persistent/object storage solution.

Check:

* image upload validation
* file type validation
* file size limits
* malicious files
* image optimization
* CDN usage
* image URLs
* deleted image handling

==================================================
12. VERCEL DEPLOYMENT AUDIT
===========================

Determine whether the frontend can safely deploy to Vercel.

Check:

* build command
* output directory
* framework configuration
* environment variables
* API URL
* CORS interaction with Render
* redirects
* rewrites
* SPA routing
* production build failures
* client-side environment variables
* secrets
* caching
* deployment configuration

Clearly list:

"Vercel deployment blockers"

and

"Vercel deployment improvements"

==================================================
13. RENDER DEPLOYMENT AUDIT
===========================

Determine whether the backend can safely deploy to Render.

Check:

* start command
* production server
* workers
* ports
* environment variables
* health check
* graceful shutdown
* database connection
* migrations
* CORS
* logging
* memory usage
* CPU usage
* background jobs
* cron jobs
* filesystem assumptions
* cold starts/spin-down behavior
* request timeout risks

Clearly explain any limitations caused by the Render plan being used.

==================================================
14. NEON PRODUCTION AUDIT
=========================

Determine whether Neon PostgreSQL is suitable for this application.

Check:

* connection pooling
* database URL
* SSL
* migrations
* backups/recovery considerations
* branching
* connection limits
* query performance
* indexes
* transaction usage
* production data safety

Explain whether Neon is sufficient for the expected scale of:

"A single restaurant serving customers primarily within one district."

Do NOT recommend an enterprise database simply because it is theoretically more scalable.

==================================================
15. PERFORMANCE AUDIT
=====================

Analyze:

Frontend:

* initial load
* bundle size
* images
* API waterfalls
* unnecessary requests
* rendering

Backend:

* request latency
* expensive operations
* blocking operations
* concurrency

Database:

* slow queries
* indexes
* connection pool

Network:

* API payload size
* image size
* caching

Identify the most likely performance bottlenecks.

==================================================
16. RELIABILITY & FAILURE SCENARIOS
===================================

Simulate what happens when:

1. Database is temporarily unavailable
2. Backend restarts
3. Render instance restarts
4. Frontend cannot reach backend
5. Payment succeeds but order creation fails
6. Order creation succeeds but response is lost
7. Customer presses "Place Order" multiple times
8. Payment webhook arrives twice
9. Two admins update the same order
10. Menu item becomes unavailable during checkout
11. Network disconnects during checkout
12. External Maps API fails
13. Image storage fails
14. Third-party API rate limit is reached
15. Database connection pool is exhausted

For each scenario explain the current behavior and the correct production behavior.

==================================================
17. OBSERVABILITY
=================

Check whether the project has:

* structured logs
* request IDs
* error logging
* application metrics
* database monitoring
* uptime monitoring
* health endpoint
* alerting
* payment failure visibility
* order failure visibility

Recommend the minimum observability required for a small single-restaurant production system.

Avoid recommending unnecessarily expensive enterprise monitoring.

==================================================
18. TESTING AUDIT
=================

Inspect existing tests.

Check:

* unit tests
* integration tests
* API tests
* database tests
* authentication tests
* authorization tests
* order tests
* payment tests
* frontend tests
* end-to-end tests

Identify the most important missing tests.

Then create a prioritized production test checklist.

==================================================
19. CI/CD & GIT AUDIT
=====================

Check:

* Git branches
* secrets accidentally committed
* .gitignore
* environment files
* migration files
* dependency lock files
* CI/CD
* automated tests
* build validation
* deployment process
* rollback process

Explain what should happen from:

git push
→ test
→ build
→ deploy
→ database migration
→ health check

==================================================
20. ENVIRONMENT CONFIGURATION
=============================

Audit:

development
staging
production

Check whether the project properly separates:

* API URLs
* database URLs
* JWT secrets
* payment credentials
* Maps credentials
* storage credentials
* third-party API keys

Identify every environment variable required for production.

Create a table:

| Variable | Required? | Frontend/Backend | Secret? | Production source | Risk |

Never expose secret values.

==================================================
21. DEPENDENCY AUDIT
====================

Inspect package/dependency files.

Identify:

* outdated packages
* vulnerable packages
* unnecessary packages
* conflicting packages
* development dependencies accidentally used in production
* packages that significantly increase bundle size
* abandoned packages

Do not recommend upgrading everything blindly.

Only recommend upgrades that materially improve security, compatibility, or reliability.

==================================================
22. DATA & PRIVACY
==================

Check whether the application stores:

* customer information
* phone numbers
* addresses
* location coordinates
* order history
* payment information
* authentication information

Determine:

* what should be stored
* what should NOT be stored
* data retention considerations
* access restrictions
* logging exposure
* privacy/security risks

Do not expose sensitive user data in logs.

==================================================
23. SCALE ANALYSIS
==================

Estimate whether the architecture is sufficient for realistic scenarios.

Evaluate approximately:

* 100 users/day
* 500 users/day
* 1,000 users/day
* 5,000 users/day

And realistic restaurant order volumes.

For each level identify:

* frontend concerns
* backend concerns
* database concerns
* third-party API concerns
* likely bottleneck

Do not over-engineer for millions of users.

Explain:

"At what point would the current architecture need to change?"

==================================================
24. COST ANALYSIS
=================

Evaluate whether:

Vercel + Render + Neon

is economically reasonable for this application.

Identify:

* likely paid services
* unnecessary services
* potential hidden costs
* Maps API costs
* database costs
* storage costs
* email/SMS costs
* payment provider costs

Separate:

MUST PAY
OPTIONAL
CAN USE FREE TIER INITIALLY

Do not recommend expensive infrastructure unless justified by actual requirements.

==================================================
25. PRODUCTION DEPLOYMENT BLOCKERS
==================================

Create a dedicated section:

# BLOCKERS — DO NOT DEPLOY

Only include issues that could cause:

* security vulnerability
* data loss
* incorrect orders
* incorrect payments
* authentication bypass
* authorization bypass
* production crash
* database corruption
* inability to deploy
* severe reliability problems

Do NOT put normal improvements here.

==================================================
26. MUST FIX BEFORE PRODUCTION
==============================

Create:

# MUST FIX

Include issues that should be resolved before real customers use the application.

==================================================
27. SHOULD FIX SOON
===================

Create:

# SHOULD FIX

Include important improvements that do not necessarily block initial deployment.

==================================================
28. CAN FIX LATER
=================

Create:

# POST-LAUNCH

Include:

* optimization
* refactoring
* nice-to-have features
* advanced monitoring
* architectural improvements that are unnecessary at current scale

==================================================
29. FINAL PRODUCTION SCORE
==========================

Give scores from 0–10 for:

* Architecture
* Frontend
* Backend
* Database
* Security
* Authentication
* Authorization
* Payments
* Maps/Location
* Performance
* Reliability
* Testing
* DevOps
* Observability
* Cost efficiency
* Scalability

Then give:

OVERALL PRODUCTION READINESS: X/10

But the score MUST be supported by concrete findings.

==================================================
30. FINAL VERDICT
=================

Give exactly one of:

🟢 READY FOR PRODUCTION
🟡 READY AFTER REQUIRED FIXES
🔴 NOT READY FOR PRODUCTION

Explain why.

Then answer these questions explicitly:

1. Is Vercel suitable for the frontend?
2. Is Render suitable for the backend?
3. Is Neon PostgreSQL suitable for the database?
4. Is this architecture sufficient for a single restaurant within one district?
5. What are the top 10 issues I must fix?
6. What can safely wait until after launch?
7. What could cause customer/order/payment/data problems?
8. What could unexpectedly increase costs?
9. What should I monitor after deployment?
10. What should I test immediately before going live?

==================================================
31. REQUIRED OUTPUT FORMAT
==========================

Use this exact structure:

# 1. Executive Summary

# 2. Application Architecture

# 3. Critical Findings

# 4. Production Blockers

# 5. Must Fix Before Deployment

# 6. Backend Audit

# 7. Frontend Audit

# 8. PostgreSQL / Neon Audit

# 9. Authentication & Authorization

# 10. Security Audit

# 11. Order & Business Logic Audit

# 12. Payment Audit

# 13. Maps & Location Audit

# 14. File & Image Storage

# 15. Vercel Audit

# 16. Render Audit

# 17. Performance Audit

# 18. Reliability & Failure Scenarios

# 19. Testing Audit

# 20. CI/CD & Git

# 21. Environment Configuration

# 22. Dependency Audit

# 23. Privacy & Data

# 24. Scalability Analysis

# 25. Cost Analysis

# 26. Should Fix Soon

# 27. Post-Launch Improvements

# 28. Production Readiness Score

# 29. Final Deployment Verdict

# 30. Pre-Deployment Checklist

==================================================
IMPORTANT RULES
===============

1. Inspect the actual code before making recommendations.
2. Do not assume functionality that does not exist.
3. Do not give generic advice.
4. Reference the exact file and relevant code whenever possible.
5. Distinguish actual bugs from theoretical risks.
6. Do not mark something as CRITICAL unless there is a realistic production impact.
7. Do not recommend enterprise-scale architecture for a single-restaurant application without justification.
8. Prefer simple, reliable solutions.
9. Prioritize security, correctness, payments, orders, authentication, authorization, and data integrity.
10. Consider the limitations of Vercel, Render, and Neon specifically.
11. Consider Render free/low-cost tier limitations if that is what the project is using.
12. Consider Neon connection limits and PostgreSQL best practices.
13. Consider third-party API costs, especially Maps.
14. Never expose secrets found in the repository.
15. If a secret is found, report:
    "SECRET FOUND — rotate this credential immediately"
    but NEVER print the secret itself.
16. If something requires a business decision, mark it:
    "BUSINESS DECISION REQUIRED"
17. If something cannot be verified from the codebase, mark it:
    "UNVERIFIED"
18. Do not stop after finding the first few problems. Audit the entire project.
19. At the end, provide a prioritized implementation plan in this format:

P0 — Fix immediately before deployment
P1 — Fix before real customer traffic
P2 — Fix after initial launch
P3 — Future optimization

For every P0/P1 issue provide:

* Problem
* Exact location/file
* Why it matters
* Recommended fix
* Expected impact
* Whether code/database/configuration changes are required

Finally provide a concise:

"GO-LIVE CHECKLIST"

containing only the actions that must be completed before allowing real customers to use the system.
You are a senior software architect, backend engineer, frontend engineer, DevOps engineer, database engineer, security engineer, QA engineer, and production reliability engineer.

I have an application for a **single restaurant**, primarily serving customers **within one district/local geographic area**.

The planned production architecture is:

* Frontend: **Vercel**
* Backend/API: **Render**
* Database: **Neon PostgreSQL**
* The application is NOT intended to be a multi-restaurant marketplace like Swiggy/Zomato.
* The expected operating area is primarily one district.
* Therefore, evaluate scalability according to a realistic single-restaurant application rather than assuming millions of users.

Your task is to perform a **complete production-readiness audit of the entire project**.

Do NOT give generic recommendations.

First inspect the entire codebase and understand:

* frontend architecture
* backend architecture
* API structure
* authentication/authorization
* database schema and queries
* state management
* file/image handling
* payments if present
* order lifecycle
* restaurant/admin functionality
* delivery functionality if present
* maps/location functionality
* notifications if present
* background jobs
* caching
* logging
* error handling
* deployment configuration
* environment variables
* third-party services
* build configuration
* dependency management
* security configuration
* CORS
* database connection handling
* production configuration

Then produce a structured audit.

==================================================

1. FIRST: UNDERSTAND THE APPLICATION
   ==================================================

Before identifying problems, explain your understanding of the application.

Document:

1. What the application does
2. Main user types
3. Main user journeys
4. Main business workflows
5. Frontend architecture
6. Backend architecture
7. Database architecture
8. External services
9. How orders are created and processed
10. How authentication works
11. How restaurant/admin operations work
12. How delivery/location functionality works
13. Expected traffic pattern for a single restaurant within one district

If something is unclear from the code, explicitly state:

"UNKNOWN — requires confirmation"

Do not invent functionality.

==================================================
2. ARCHITECTURE AUDIT
=====================

Analyze whether the current architecture is appropriate for:

Vercel + Render + Neon PostgreSQL.

Check:

* frontend/backend separation
* API architecture
* REST API design
* request/response structure
* service layer
* repository/data-access layer
* separation of concerns
* dependency management
* circular dependencies
* duplicated business logic
* tightly coupled components
* unnecessary complexity
* scalability bottlenecks
* single points of failure
* incorrect assumptions about serverless vs persistent servers
* frontend directly accessing the database
* backend responsibilities incorrectly implemented in frontend
* incorrect use of environment variables
* architecture that may work locally but fail in production

For every issue explain:

* Why it is a problem
* Production impact
* Whether it blocks deployment
* Recommended solution

==================================================
3. FRONTEND AUDIT
=================

Analyze the frontend comprehensively.

Check:

* build process
* production build
* routing
* API communication
* API base URL configuration
* environment variables
* authentication persistence
* token handling
* protected routes
* authorization assumptions
* loading states
* error states
* empty states
* form validation
* duplicate submissions
* race conditions
* optimistic updates
* stale data
* state management
* unnecessary API requests
* caching
* pagination
* infinite scrolling
* image optimization
* large assets
* bundle size
* mobile responsiveness
* accessibility
* SEO where applicable
* browser compatibility
* network failure handling
* offline/poor-network behavior
* XSS risks
* sensitive data exposed in frontend
* secrets accidentally bundled into frontend
* console/debug statements
* production logging

Pay special attention to whether frontend code assumes that the backend is always available.

==================================================
4. BACKEND/API AUDIT
====================

Analyze the backend as if it is going to production on Render.

Check:

* application startup
* production server configuration
* Gunicorn/Uvicorn configuration if Python
* worker configuration
* graceful shutdown
* request timeouts
* connection handling
* middleware
* CORS
* authentication
* authorization
* input validation
* output validation
* error handling
* exception handling
* HTTP status codes
* API consistency
* idempotency
* duplicate requests
* concurrency issues
* race conditions
* transaction handling
* long-running requests
* background processing
* file uploads
* memory usage
* CPU-heavy operations
* blocking operations
* synchronous operations inside async code
* database access patterns
* N+1 queries
* inefficient queries
* pagination
* rate limiting
* request size limits
* security headers
* logging
* monitoring
* health endpoints
* readiness/liveness considerations

Determine whether the backend is suitable for Render's environment.

==================================================
5. DATABASE / NEON POSTGRESQL AUDIT
===================================

Analyze the database deeply.

Check:

### Schema

* tables
* primary keys
* foreign keys
* unique constraints
* NOT NULL constraints
* CHECK constraints
* indexes
* relationships
* normalization
* denormalization
* nullable fields
* data types
* timestamps
* timezone handling
* enum/status design

### Query performance

Identify:

* missing indexes
* unnecessary indexes
* N+1 queries
* full table scans
* inefficient joins
* unnecessary SELECT *
* expensive filtering
* inefficient ordering
* duplicate queries
* queries that will become slow as data grows

### Transactions

Check:

* order creation
* payment processing
* stock/menu availability
* order status transitions
* concurrent updates
* rollback behavior
* transaction boundaries
* race conditions

### Neon compatibility

Check:

* PostgreSQL compatibility
* connection pooling
* connection limits
* ORM configuration
* serverless/persistent connection assumptions
* connection lifetime
* idle connections
* migration strategy
* production migration safety
* SSL configuration
* database URL handling

Explain exactly how the application should connect to Neon in production.

==================================================
6. ORDER / BUSINESS LOGIC AUDIT
===============================

Because this is a restaurant application, deeply analyze the order lifecycle.

Trace:

Customer:

Browse menu
→ Add items
→ Cart
→ Address/location
→ Checkout
→ Payment
→ Order creation
→ Restaurant acceptance
→ Preparation
→ Ready
→ Delivery/pickup
→ Completion

Check for:

* duplicate orders
* duplicate payments
* price manipulation
* quantity manipulation
* client-side price trust
* menu item availability problems
* order status inconsistencies
* invalid status transitions
* cancellation problems
* refund problems
* concurrent order updates
* stock/availability race conditions
* stale cart data
* incorrect totals
* delivery fee manipulation
* coupon manipulation
* unauthorized order access

Identify which values MUST be calculated/validated by the backend.

==================================================
7. AUTHENTICATION & AUTHORIZATION
=================================

Audit:

* registration
* login
* logout
* password handling
* password hashing
* JWT/session implementation
* refresh tokens
* token expiry
* token storage
* cookie configuration
* HttpOnly
* Secure
* SameSite
* CSRF
* role-based authorization
* admin authorization
* restaurant staff authorization
* delivery personnel authorization
* object-level authorization

Check for IDOR/BOLA vulnerabilities such as:

/orders/{id}
/users/{id}
/addresses/{id}
/payments/{id}

Make sure a user cannot access another user's resources simply by changing an ID.

==================================================
8. SECURITY AUDIT
=================

Perform a security review based on OWASP principles.

Check:

* SQL injection
* XSS
* CSRF
* SSRF
* IDOR/BOLA
* authentication bypass
* authorization bypass
* insecure direct object references
* mass assignment
* insecure deserialization
* command injection
* path traversal
* file upload vulnerabilities
* malicious input
* sensitive information exposure
* secrets in Git
* secrets in frontend
* insecure CORS
* weak password policy
* token leakage
* excessive API permissions
* missing rate limits
* brute-force attacks
* abuse of expensive endpoints
* debug mode
* stack traces exposed to clients
* dependency vulnerabilities
* unsafe admin endpoints

Classify each issue as:

CRITICAL
HIGH
MEDIUM
LOW

==================================================
9. PAYMENT AUDIT
================

If payments exist, inspect the complete implementation.

Check:

* payment provider integration
* frontend payment flow
* backend payment verification
* webhook handling
* webhook signature verification
* duplicate webhook handling
* idempotency
* payment/order consistency
* failed payment handling
* pending payment handling
* refund handling
* amount verification
* currency verification
* client-side manipulation
* payment status reconciliation

NEVER assume a successful frontend payment callback is sufficient proof of payment.

==================================================
10. MAPS / LOCATION AUDIT
=========================

If the application uses Google Maps or another mapping provider, inspect:

* API usage
* API keys
* frontend vs backend keys
* key restrictions
* billing configuration
* Places API usage
* Maps JavaScript API usage
* geocoding
* reverse geocoding
* autocomplete
* nearby places
* distance calculation
* delivery radius
* coordinates
* address validation
* location accuracy
* fallback behavior

Because this application operates primarily within one district, determine whether the current maps architecture is unnecessarily expensive or complex.

Also verify whether "nearby places" functionality actually works at the maximum/available zoom level and whether the correct API is being used for the intended purpose.

==================================================
11. FILES / IMAGES / STORAGE
============================

Check how images/files are stored.

Determine whether the application incorrectly stores uploaded files inside:

* local Render filesystem
* frontend repository
* backend filesystem

If local filesystem storage is being used, explain why this is unsafe for production and recommend an appropriate persistent/object storage solution.

Check:

* image upload validation
* file type validation
* file size limits
* malicious files
* image optimization
* CDN usage
* image URLs
* deleted image handling

==================================================
12. VERCEL DEPLOYMENT AUDIT
===========================

Determine whether the frontend can safely deploy to Vercel.

Check:

* build command
* output directory
* framework configuration
* environment variables
* API URL
* CORS interaction with Render
* redirects
* rewrites
* SPA routing
* production build failures
* client-side environment variables
* secrets
* caching
* deployment configuration

Clearly list:

"Vercel deployment blockers"

and

"Vercel deployment improvements"

==================================================
13. RENDER DEPLOYMENT AUDIT
===========================

Determine whether the backend can safely deploy to Render.

Check:

* start command
* production server
* workers
* ports
* environment variables
* health check
* graceful shutdown
* database connection
* migrations
* CORS
* logging
* memory usage
* CPU usage
* background jobs
* cron jobs
* filesystem assumptions
* cold starts/spin-down behavior
* request timeout risks

Clearly explain any limitations caused by the Render plan being used.

==================================================
14. NEON PRODUCTION AUDIT
=========================

Determine whether Neon PostgreSQL is suitable for this application.

Check:

* connection pooling
* database URL
* SSL
* migrations
* backups/recovery considerations
* branching
* connection limits
* query performance
* indexes
* transaction usage
* production data safety

Explain whether Neon is sufficient for the expected scale of:

"A single restaurant serving customers primarily within one district."

Do NOT recommend an enterprise database simply because it is theoretically more scalable.

==================================================
15. PERFORMANCE AUDIT
=====================

Analyze:

Frontend:

* initial load
* bundle size
* images
* API waterfalls
* unnecessary requests
* rendering

Backend:

* request latency
* expensive operations
* blocking operations
* concurrency

Database:

* slow queries
* indexes
* connection pool

Network:

* API payload size
* image size
* caching

Identify the most likely performance bottlenecks.

==================================================
16. RELIABILITY & FAILURE SCENARIOS
===================================

Simulate what happens when:

1. Database is temporarily unavailable
2. Backend restarts
3. Render instance restarts
4. Frontend cannot reach backend
5. Payment succeeds but order creation fails
6. Order creation succeeds but response is lost
7. Customer presses "Place Order" multiple times
8. Payment webhook arrives twice
9. Two admins update the same order
10. Menu item becomes unavailable during checkout
11. Network disconnects during checkout
12. External Maps API fails
13. Image storage fails
14. Third-party API rate limit is reached
15. Database connection pool is exhausted

For each scenario explain the current behavior and the correct production behavior.

==================================================
17. OBSERVABILITY
=================

Check whether the project has:

* structured logs
* request IDs
* error logging
* application metrics
* database monitoring
* uptime monitoring
* health endpoint
* alerting
* payment failure visibility
* order failure visibility

Recommend the minimum observability required for a small single-restaurant production system.

Avoid recommending unnecessarily expensive enterprise monitoring.

==================================================
18. TESTING AUDIT
=================

Inspect existing tests.

Check:

* unit tests
* integration tests
* API tests
* database tests
* authentication tests
* authorization tests
* order tests
* payment tests
* frontend tests
* end-to-end tests

Identify the most important missing tests.

Then create a prioritized production test checklist.

==================================================
19. CI/CD & GIT AUDIT
=====================

Check:

* Git branches
* secrets accidentally committed
* .gitignore
* environment files
* migration files
* dependency lock files
* CI/CD
* automated tests
* build validation
* deployment process
* rollback process

Explain what should happen from:

git push
→ test
→ build
→ deploy
→ database migration
→ health check

==================================================
20. ENVIRONMENT CONFIGURATION
=============================

Audit:

development
staging
production

Check whether the project properly separates:

* API URLs
* database URLs
* JWT secrets
* payment credentials
* Maps credentials
* storage credentials
* third-party API keys

Identify every environment variable required for production.

Create a table:

| Variable | Required? | Frontend/Backend | Secret? | Production source | Risk |

Never expose secret values.

==================================================
21. DEPENDENCY AUDIT
====================

Inspect package/dependency files.

Identify:

* outdated packages
* vulnerable packages
* unnecessary packages
* conflicting packages
* development dependencies accidentally used in production
* packages that significantly increase bundle size
* abandoned packages

Do not recommend upgrading everything blindly.

Only recommend upgrades that materially improve security, compatibility, or reliability.

==================================================
22. DATA & PRIVACY
==================

Check whether the application stores:

* customer information
* phone numbers
* addresses
* location coordinates
* order history
* payment information
* authentication information

Determine:

* what should be stored
* what should NOT be stored
* data retention considerations
* access restrictions
* logging exposure
* privacy/security risks

Do not expose sensitive user data in logs.

==================================================
23. SCALE ANALYSIS
==================

Estimate whether the architecture is sufficient for realistic scenarios.

Evaluate approximately:

* 100 users/day
* 500 users/day
* 1,000 users/day
* 5,000 users/day

And realistic restaurant order volumes.

For each level identify:

* frontend concerns
* backend concerns
* database concerns
* third-party API concerns
* likely bottleneck

Do not over-engineer for millions of users.

Explain:

"At what point would the current architecture need to change?"

==================================================
24. COST ANALYSIS
=================

Evaluate whether:

Vercel + Render + Neon

is economically reasonable for this application.

Identify:

* likely paid services
* unnecessary services
* potential hidden costs
* Maps API costs
* database costs
* storage costs
* email/SMS costs
* payment provider costs

Separate:

MUST PAY
OPTIONAL
CAN USE FREE TIER INITIALLY

Do not recommend expensive infrastructure unless justified by actual requirements.

==================================================
25. PRODUCTION DEPLOYMENT BLOCKERS
==================================

Create a dedicated section:

# BLOCKERS — DO NOT DEPLOY

Only include issues that could cause:

* security vulnerability
* data loss
* incorrect orders
* incorrect payments
* authentication bypass
* authorization bypass
* production crash
* database corruption
* inability to deploy
* severe reliability problems

Do NOT put normal improvements here.

==================================================
26. MUST FIX BEFORE PRODUCTION
==============================

Create:

# MUST FIX

Include issues that should be resolved before real customers use the application.

==================================================
27. SHOULD FIX SOON
===================

Create:

# SHOULD FIX

Include important improvements that do not necessarily block initial deployment.

==================================================
28. CAN FIX LATER
=================

Create:

# POST-LAUNCH

Include:

* optimization
* refactoring
* nice-to-have features
* advanced monitoring
* architectural improvements that are unnecessary at current scale

==================================================
29. FINAL PRODUCTION SCORE
==========================

Give scores from 0–10 for:

* Architecture
* Frontend
* Backend
* Database
* Security
* Authentication
* Authorization
* Payments
* Maps/Location
* Performance
* Reliability
* Testing
* DevOps
* Observability
* Cost efficiency
* Scalability

Then give:

OVERALL PRODUCTION READINESS: X/10

But the score MUST be supported by concrete findings.

==================================================
30. FINAL VERDICT
=================

Give exactly one of:

🟢 READY FOR PRODUCTION
🟡 READY AFTER REQUIRED FIXES
🔴 NOT READY FOR PRODUCTION

Explain why.

Then answer these questions explicitly:

1. Is Vercel suitable for the frontend?
2. Is Render suitable for the backend?
3. Is Neon PostgreSQL suitable for the database?
4. Is this architecture sufficient for a single restaurant within one district?
5. What are the top 10 issues I must fix?
6. What can safely wait until after launch?
7. What could cause customer/order/payment/data problems?
8. What could unexpectedly increase costs?
9. What should I monitor after deployment?
10. What should I test immediately before going live?

==================================================
31. REQUIRED OUTPUT FORMAT
==========================

Use this exact structure:

# 1. Executive Summary

# 2. Application Architecture

# 3. Critical Findings

# 4. Production Blockers

# 5. Must Fix Before Deployment

# 6. Backend Audit

# 7. Frontend Audit

# 8. PostgreSQL / Neon Audit

# 9. Authentication & Authorization

# 10. Security Audit

# 11. Order & Business Logic Audit

# 12. Payment Audit

# 13. Maps & Location Audit

# 14. File & Image Storage

# 15. Vercel Audit

# 16. Render Audit

# 17. Performance Audit

# 18. Reliability & Failure Scenarios

# 19. Testing Audit

# 20. CI/CD & Git

# 21. Environment Configuration

# 22. Dependency Audit

# 23. Privacy & Data

# 24. Scalability Analysis

# 25. Cost Analysis

# 26. Should Fix Soon

# 27. Post-Launch Improvements

# 28. Production Readiness Score

# 29. Final Deployment Verdict

# 30. Pre-Deployment Checklist

==================================================
IMPORTANT RULES
===============

1. Inspect the actual code before making recommendations.
2. Do not assume functionality that does not exist.
3. Do not give generic advice.
4. Reference the exact file and relevant code whenever possible.
5. Distinguish actual bugs from theoretical risks.
6. Do not mark something as CRITICAL unless there is a realistic production impact.
7. Do not recommend enterprise-scale architecture for a single-restaurant application without justification.
8. Prefer simple, reliable solutions.
9. Prioritize security, correctness, payments, orders, authentication, authorization, and data integrity.
10. Consider the limitations of Vercel, Render, and Neon specifically.
11. Consider Render free/low-cost tier limitations if that is what the project is using.
12. Consider Neon connection limits and PostgreSQL best practices.
13. Consider third-party API costs, especially Maps.
14. Never expose secrets found in the repository.
15. If a secret is found, report:
    "SECRET FOUND — rotate this credential immediately"
    but NEVER print the secret itself.
16. If something requires a business decision, mark it:
    "BUSINESS DECISION REQUIRED"
17. If something cannot be verified from the codebase, mark it:
    "UNVERIFIED"
18. Do not stop after finding the first few problems. Audit the entire project.
19. At the end, provide a prioritized implementation plan in this format:

P0 — Fix immediately before deployment
P1 — Fix before real customer traffic
P2 — Fix after initial launch
P3 — Future optimization

For every P0/P1 issue provide:

* Problem
* Exact location/file
* Why it matters
* Recommended fix
* Expected impact
* Whether code/database/configuration changes are required

Finally provide a concise:

"GO-LIVE CHECKLIST"

containing only the actions that must be completed before allowing real customers to use the system.
You are a senior software architect, backend engineer, frontend engineer, DevOps engineer, database engineer, security engineer, QA engineer, and production reliability engineer.

I have an application for a **single restaurant**, primarily serving customers **within one district/local geographic area**.

The planned production architecture is:

* Frontend: **Vercel**
* Backend/API: **Render**
* Database: **Neon PostgreSQL**
* The application is NOT intended to be a multi-restaurant marketplace like Swiggy/Zomato.
* The expected operating area is primarily one district.
* Therefore, evaluate scalability according to a realistic single-restaurant application rather than assuming millions of users.

Your task is to perform a **complete production-readiness audit of the entire project**.

Do NOT give generic recommendations.

First inspect the entire codebase and understand:

* frontend architecture
* backend architecture
* API structure
* authentication/authorization
* database schema and queries
* state management
* file/image handling
* payments if present
* order lifecycle
* restaurant/admin functionality
* delivery functionality if present
* maps/location functionality
* notifications if present
* background jobs
* caching
* logging
* error handling
* deployment configuration
* environment variables
* third-party services
* build configuration
* dependency management
* security configuration
* CORS
* database connection handling
* production configuration

Then produce a structured audit.

==================================================

1. FIRST: UNDERSTAND THE APPLICATION
   ==================================================

Before identifying problems, explain your understanding of the application.

Document:

1. What the application does
2. Main user types
3. Main user journeys
4. Main business workflows
5. Frontend architecture
6. Backend architecture
7. Database architecture
8. External services
9. How orders are created and processed
10. How authentication works
11. How restaurant/admin operations work
12. How delivery/location functionality works
13. Expected traffic pattern for a single restaurant within one district

If something is unclear from the code, explicitly state:

"UNKNOWN — requires confirmation"

Do not invent functionality.

==================================================
2. ARCHITECTURE AUDIT
=====================

Analyze whether the current architecture is appropriate for:

Vercel + Render + Neon PostgreSQL.

Check:

* frontend/backend separation
* API architecture
* REST API design
* request/response structure
* service layer
* repository/data-access layer
* separation of concerns
* dependency management
* circular dependencies
* duplicated business logic
* tightly coupled components
* unnecessary complexity
* scalability bottlenecks
* single points of failure
* incorrect assumptions about serverless vs persistent servers
* frontend directly accessing the database
* backend responsibilities incorrectly implemented in frontend
* incorrect use of environment variables
* architecture that may work locally but fail in production

For every issue explain:

* Why it is a problem
* Production impact
* Whether it blocks deployment
* Recommended solution

==================================================
3. FRONTEND AUDIT
=================

Analyze the frontend comprehensively.

Check:

* build process
* production build
* routing
* API communication
* API base URL configuration
* environment variables
* authentication persistence
* token handling
* protected routes
* authorization assumptions
* loading states
* error states
* empty states
* form validation
* duplicate submissions
* race conditions
* optimistic updates
* stale data
* state management
* unnecessary API requests
* caching
* pagination
* infinite scrolling
* image optimization
* large assets
* bundle size
* mobile responsiveness
* accessibility
* SEO where applicable
* browser compatibility
* network failure handling
* offline/poor-network behavior
* XSS risks
* sensitive data exposed in frontend
* secrets accidentally bundled into frontend
* console/debug statements
* production logging

Pay special attention to whether frontend code assumes that the backend is always available.

==================================================
4. BACKEND/API AUDIT
====================

Analyze the backend as if it is going to production on Render.

Check:

* application startup
* production server configuration
* Gunicorn/Uvicorn configuration if Python
* worker configuration
* graceful shutdown
* request timeouts
* connection handling
* middleware
* CORS
* authentication
* authorization
* input validation
* output validation
* error handling
* exception handling
* HTTP status codes
* API consistency
* idempotency
* duplicate requests
* concurrency issues
* race conditions
* transaction handling
* long-running requests
* background processing
* file uploads
* memory usage
* CPU-heavy operations
* blocking operations
* synchronous operations inside async code
* database access patterns
* N+1 queries
* inefficient queries
* pagination
* rate limiting
* request size limits
* security headers
* logging
* monitoring
* health endpoints
* readiness/liveness considerations

Determine whether the backend is suitable for Render's environment.

==================================================
5. DATABASE / NEON POSTGRESQL AUDIT
===================================

Analyze the database deeply.

Check:

### Schema

* tables
* primary keys
* foreign keys
* unique constraints
* NOT NULL constraints
* CHECK constraints
* indexes
* relationships
* normalization
* denormalization
* nullable fields
* data types
* timestamps
* timezone handling
* enum/status design

### Query performance

Identify:

* missing indexes
* unnecessary indexes
* N+1 queries
* full table scans
* inefficient joins
* unnecessary SELECT *
* expensive filtering
* inefficient ordering
* duplicate queries
* queries that will become slow as data grows

### Transactions

Check:

* order creation
* payment processing
* stock/menu availability
* order status transitions
* concurrent updates
* rollback behavior
* transaction boundaries
* race conditions

### Neon compatibility

Check:

* PostgreSQL compatibility
* connection pooling
* connection limits
* ORM configuration
* serverless/persistent connection assumptions
* connection lifetime
* idle connections
* migration strategy
* production migration safety
* SSL configuration
* database URL handling

Explain exactly how the application should connect to Neon in production.

==================================================
6. ORDER / BUSINESS LOGIC AUDIT
===============================

Because this is a restaurant application, deeply analyze the order lifecycle.

Trace:

Customer:

Browse menu
→ Add items
→ Cart
→ Address/location
→ Checkout
→ Payment
→ Order creation
→ Restaurant acceptance
→ Preparation
→ Ready
→ Delivery/pickup
→ Completion

Check for:

* duplicate orders
* duplicate payments
* price manipulation
* quantity manipulation
* client-side price trust
* menu item availability problems
* order status inconsistencies
* invalid status transitions
* cancellation problems
* refund problems
* concurrent order updates
* stock/availability race conditions
* stale cart data
* incorrect totals
* delivery fee manipulation
* coupon manipulation
* unauthorized order access

Identify which values MUST be calculated/validated by the backend.

==================================================
7. AUTHENTICATION & AUTHORIZATION
=================================

Audit:

* registration
* login
* logout
* password handling
* password hashing
* JWT/session implementation
* refresh tokens
* token expiry
* token storage
* cookie configuration
* HttpOnly
* Secure
* SameSite
* CSRF
* role-based authorization
* admin authorization
* restaurant staff authorization
* delivery personnel authorization
* object-level authorization

Check for IDOR/BOLA vulnerabilities such as:

/orders/{id}
/users/{id}
/addresses/{id}
/payments/{id}

Make sure a user cannot access another user's resources simply by changing an ID.

==================================================
8. SECURITY AUDIT
=================

Perform a security review based on OWASP principles.

Check:

* SQL injection
* XSS
* CSRF
* SSRF
* IDOR/BOLA
* authentication bypass
* authorization bypass
* insecure direct object references
* mass assignment
* insecure deserialization
* command injection
* path traversal
* file upload vulnerabilities
* malicious input
* sensitive information exposure
* secrets in Git
* secrets in frontend
* insecure CORS
* weak password policy
* token leakage
* excessive API permissions
* missing rate limits
* brute-force attacks
* abuse of expensive endpoints
* debug mode
* stack traces exposed to clients
* dependency vulnerabilities
* unsafe admin endpoints

Classify each issue as:

CRITICAL
HIGH
MEDIUM
LOW

==================================================
9. PAYMENT AUDIT
================

If payments exist, inspect the complete implementation.

Check:

* payment provider integration
* frontend payment flow
* backend payment verification
* webhook handling
* webhook signature verification
* duplicate webhook handling
* idempotency
* payment/order consistency
* failed payment handling
* pending payment handling
* refund handling
* amount verification
* currency verification
* client-side manipulation
* payment status reconciliation

NEVER assume a successful frontend payment callback is sufficient proof of payment.

==================================================
10. MAPS / LOCATION AUDIT
=========================

If the application uses Google Maps or another mapping provider, inspect:

* API usage
* API keys
* frontend vs backend keys
* key restrictions
* billing configuration
* Places API usage
* Maps JavaScript API usage
* geocoding
* reverse geocoding
* autocomplete
* nearby places
* distance calculation
* delivery radius
* coordinates
* address validation
* location accuracy
* fallback behavior

Because this application operates primarily within one district, determine whether the current maps architecture is unnecessarily expensive or complex.

Also verify whether "nearby places" functionality actually works at the maximum/available zoom level and whether the correct API is being used for the intended purpose.

==================================================
11. FILES / IMAGES / STORAGE
============================

Check how images/files are stored.

Determine whether the application incorrectly stores uploaded files inside:

* local Render filesystem
* frontend repository
* backend filesystem

If local filesystem storage is being used, explain why this is unsafe for production and recommend an appropriate persistent/object storage solution.

Check:

* image upload validation
* file type validation
* file size limits
* malicious files
* image optimization
* CDN usage
* image URLs
* deleted image handling

==================================================
12. VERCEL DEPLOYMENT AUDIT
===========================

Determine whether the frontend can safely deploy to Vercel.

Check:

* build command
* output directory
* framework configuration
* environment variables
* API URL
* CORS interaction with Render
* redirects
* rewrites
* SPA routing
* production build failures
* client-side environment variables
* secrets
* caching
* deployment configuration

Clearly list:

"Vercel deployment blockers"

and

"Vercel deployment improvements"

==================================================
13. RENDER DEPLOYMENT AUDIT
===========================

Determine whether the backend can safely deploy to Render.

Check:

* start command
* production server
* workers
* ports
* environment variables
* health check
* graceful shutdown
* database connection
* migrations
* CORS
* logging
* memory usage
* CPU usage
* background jobs
* cron jobs
* filesystem assumptions
* cold starts/spin-down behavior
* request timeout risks

Clearly explain any limitations caused by the Render plan being used.

==================================================
14. NEON PRODUCTION AUDIT
=========================

Determine whether Neon PostgreSQL is suitable for this application.

Check:

* connection pooling
* database URL
* SSL
* migrations
* backups/recovery considerations
* branching
* connection limits
* query performance
* indexes
* transaction usage
* production data safety

Explain whether Neon is sufficient for the expected scale of:

"A single restaurant serving customers primarily within one district."

Do NOT recommend an enterprise database simply because it is theoretically more scalable.

==================================================
15. PERFORMANCE AUDIT
=====================

Analyze:

Frontend:

* initial load
* bundle size
* images
* API waterfalls
* unnecessary requests
* rendering

Backend:

* request latency
* expensive operations
* blocking operations
* concurrency

Database:

* slow queries
* indexes
* connection pool

Network:

* API payload size
* image size
* caching

Identify the most likely performance bottlenecks.

==================================================
16. RELIABILITY & FAILURE SCENARIOS
===================================

Simulate what happens when:

1. Database is temporarily unavailable
2. Backend restarts
3. Render instance restarts
4. Frontend cannot reach backend
5. Payment succeeds but order creation fails
6. Order creation succeeds but response is lost
7. Customer presses "Place Order" multiple times
8. Payment webhook arrives twice
9. Two admins update the same order
10. Menu item becomes unavailable during checkout
11. Network disconnects during checkout
12. External Maps API fails
13. Image storage fails
14. Third-party API rate limit is reached
15. Database connection pool is exhausted

For each scenario explain the current behavior and the correct production behavior.

==================================================
17. OBSERVABILITY
=================

Check whether the project has:

* structured logs
* request IDs
* error logging
* application metrics
* database monitoring
* uptime monitoring
* health endpoint
* alerting
* payment failure visibility
* order failure visibility

Recommend the minimum observability required for a small single-restaurant production system.

Avoid recommending unnecessarily expensive enterprise monitoring.

==================================================
18. TESTING AUDIT
=================

Inspect existing tests.

Check:

* unit tests
* integration tests
* API tests
* database tests
* authentication tests
* authorization tests
* order tests
* payment tests
* frontend tests
* end-to-end tests

Identify the most important missing tests.

Then create a prioritized production test checklist.

==================================================
19. CI/CD & GIT AUDIT
=====================

Check:

* Git branches
* secrets accidentally committed
* .gitignore
* environment files
* migration files
* dependency lock files
* CI/CD
* automated tests
* build validation
* deployment process
* rollback process

Explain what should happen from:

git push
→ test
→ build
→ deploy
→ database migration
→ health check

==================================================
20. ENVIRONMENT CONFIGURATION
=============================

Audit:

development
staging
production

Check whether the project properly separates:

* API URLs
* database URLs
* JWT secrets
* payment credentials
* Maps credentials
* storage credentials
* third-party API keys

Identify every environment variable required for production.

Create a table:

| Variable | Required? | Frontend/Backend | Secret? | Production source | Risk |

Never expose secret values.

==================================================
21. DEPENDENCY AUDIT
====================

Inspect package/dependency files.

Identify:

* outdated packages
* vulnerable packages
* unnecessary packages
* conflicting packages
* development dependencies accidentally used in production
* packages that significantly increase bundle size
* abandoned packages

Do not recommend upgrading everything blindly.

Only recommend upgrades that materially improve security, compatibility, or reliability.

==================================================
22. DATA & PRIVACY
==================

Check whether the application stores:

* customer information
* phone numbers
* addresses
* location coordinates
* order history
* payment information
* authentication information

Determine:

* what should be stored
* what should NOT be stored
* data retention considerations
* access restrictions
* logging exposure
* privacy/security risks

Do not expose sensitive user data in logs.

==================================================
23. SCALE ANALYSIS
==================

Estimate whether the architecture is sufficient for realistic scenarios.

Evaluate approximately:

* 100 users/day
* 500 users/day
* 1,000 users/day
* 5,000 users/day

And realistic restaurant order volumes.

For each level identify:

* frontend concerns
* backend concerns
* database concerns
* third-party API concerns
* likely bottleneck

Do not over-engineer for millions of users.

Explain:

"At what point would the current architecture need to change?"

==================================================
24. COST ANALYSIS
=================

Evaluate whether:

Vercel + Render + Neon

is economically reasonable for this application.

Identify:

* likely paid services
* unnecessary services
* potential hidden costs
* Maps API costs
* database costs
* storage costs
* email/SMS costs
* payment provider costs

Separate:

MUST PAY
OPTIONAL
CAN USE FREE TIER INITIALLY

Do not recommend expensive infrastructure unless justified by actual requirements.

==================================================
25. PRODUCTION DEPLOYMENT BLOCKERS
==================================

Create a dedicated section:

# BLOCKERS — DO NOT DEPLOY

Only include issues that could cause:

* security vulnerability
* data loss
* incorrect orders
* incorrect payments
* authentication bypass
* authorization bypass
* production crash
* database corruption
* inability to deploy
* severe reliability problems

Do NOT put normal improvements here.

==================================================
26. MUST FIX BEFORE PRODUCTION
==============================

Create:

# MUST FIX

Include issues that should be resolved before real customers use the application.

==================================================
27. SHOULD FIX SOON
===================

Create:

# SHOULD FIX

Include important improvements that do not necessarily block initial deployment.

==================================================
28. CAN FIX LATER
=================

Create:

# POST-LAUNCH

Include:

* optimization
* refactoring
* nice-to-have features
* advanced monitoring
* architectural improvements that are unnecessary at current scale

==================================================
29. FINAL PRODUCTION SCORE
==========================

Give scores from 0–10 for:

* Architecture
* Frontend
* Backend
* Database
* Security
* Authentication
* Authorization
* Payments
* Maps/Location
* Performance
* Reliability
* Testing
* DevOps
* Observability
* Cost efficiency
* Scalability

Then give:

OVERALL PRODUCTION READINESS: X/10

But the score MUST be supported by concrete findings.

==================================================
30. FINAL VERDICT
=================

Give exactly one of:

🟢 READY FOR PRODUCTION
🟡 READY AFTER REQUIRED FIXES
🔴 NOT READY FOR PRODUCTION

Explain why.

Then answer these questions explicitly:

1. Is Vercel suitable for the frontend?
2. Is Render suitable for the backend?
3. Is Neon PostgreSQL suitable for the database?
4. Is this architecture sufficient for a single restaurant within one district?
5. What are the top 10 issues I must fix?
6. What can safely wait until after launch?
7. What could cause customer/order/payment/data problems?
8. What could unexpectedly increase costs?
9. What should I monitor after deployment?
10. What should I test immediately before going live?

==================================================
31. REQUIRED OUTPUT FORMAT
==========================

Use this exact structure:

# 1. Executive Summary

# 2. Application Architecture

# 3. Critical Findings

# 4. Production Blockers

# 5. Must Fix Before Deployment

# 6. Backend Audit

# 7. Frontend Audit

# 8. PostgreSQL / Neon Audit

# 9. Authentication & Authorization

# 10. Security Audit

# 11. Order & Business Logic Audit

# 12. Payment Audit

# 13. Maps & Location Audit

# 14. File & Image Storage

# 15. Vercel Audit

# 16. Render Audit

# 17. Performance Audit

# 18. Reliability & Failure Scenarios

# 19. Testing Audit

# 20. CI/CD & Git

# 21. Environment Configuration

# 22. Dependency Audit

# 23. Privacy & Data

# 24. Scalability Analysis

# 25. Cost Analysis

# 26. Should Fix Soon

# 27. Post-Launch Improvements

# 28. Production Readiness Score

# 29. Final Deployment Verdict

# 30. Pre-Deployment Checklist

==================================================
IMPORTANT RULES
===============

1. Inspect the actual code before making recommendations.
2. Do not assume functionality that does not exist.
3. Do not give generic advice.
4. Reference the exact file and relevant code whenever possible.
5. Distinguish actual bugs from theoretical risks.
6. Do not mark something as CRITICAL unless there is a realistic production impact.
7. Do not recommend enterprise-scale architecture for a single-restaurant application without justification.
8. Prefer simple, reliable solutions.
9. Prioritize security, correctness, payments, orders, authentication, authorization, and data integrity.
10. Consider the limitations of Vercel, Render, and Neon specifically.
11. Consider Render free/low-cost tier limitations if that is what the project is using.
12. Consider Neon connection limits and PostgreSQL best practices.
13. Consider third-party API costs, especially Maps.
14. Never expose secrets found in the repository.
15. If a secret is found, report:
    "SECRET FOUND — rotate this credential immediately"
    but NEVER print the secret itself.
16. If something requires a business decision, mark it:
    "BUSINESS DECISION REQUIRED"
17. If something cannot be verified from the codebase, mark it:
    "UNVERIFIED"
18. Do not stop after finding the first few problems. Audit the entire project.
19. At the end, provide a prioritized implementation plan in this format:

P0 — Fix immediately before deployment
P1 — Fix before real customer traffic
P2 — Fix after initial launch
P3 — Future optimization

For every P0/P1 issue provide:

* Problem
* Exact location/file
* Why it matters
* Recommended fix
* Expected impact
* Whether code/database/configuration changes are required

Finally provide a concise:

"GO-LIVE CHECKLIST"

containing only the actions that must be completed before allowing real customers to use the system.

flowchart TD
    A[1. Log in to Admin Portal] --> B[2. Check Daily Sales & Metrics]
    B --> C[3. Manage Food Menu & Stock Status]
    C --> D[4. Accept & Process Incoming Orders]
    D --> E[5. Assign Orders to Delivery Drivers]
    E --> F[6. Monitor Delivery Completion & Reviews]
```

---

## 📖 Step-by-Step Guide

### Step 1: Logging in to Admin Portal

1. Go to the Cafe 90 website.
2. Click **"Admin Portal"** or navigate to the Admin Login page.
3. Enter your **Admin Email** and **Password**.
4. Click **"Login to Dashboard"**.
5. Once authenticated, you will be taken directly to the **Admin Management Dashboard**.

---

### Step 2: Understanding Your Business Dashboard Metrics

At the top of the dashboard, you will see 4 easy-to-read summary cards:

| Card | What it Tells You | Why it Helps |
| :--- | :--- | :--- |
| 💰 **Total Revenue** | Total money earned today/this month (e.g., ₹12,450) | Know your income in real time. |
| 📦 **Total Orders** | Number of orders received today | Track daily kitchen workload. |
| 🍔 **Active Items** | Total food items currently active on the menu | Know what dishes customers can buy. |
| 🛵 **Delivery Drivers** | Number of online delivery drivers on duty | Make sure you have enough drivers available. |

---

### Step 3: Managing the Food Menu (Add, Edit, Stock Control)

As a restaurant manager, keeping your menu updated is crucial!

#### A. Adding a New Food Dish to the Menu:
1. Scroll to the **"Food Items Management"** section on the Admin Dashboard.
2. Click the green **"+ Add New Food Item"** button.
3. Fill in the simple form:
   - **Item Name**: (e.g., *"Crispy Chicken Burger"*)
   - **Category**: Pick from dropdown (*Burgers*, *Pizzas*, *Beverages*, *Snacks*, *Desserts*).
   - **Price**: Enter selling price (e.g., `180`).
   - **Discount Price** (Optional): Enter special offer price (e.g., `150`).
   - **Type**: Select **Veg (Green)** or **Non-Veg (Red)**.
   - **Upload Image**: Choose a nice food photo from your computer/device.
   - **Description**: Add a short description (e.g., *"Juicy grilled patty with cheddar cheese"*).
4. Click **"Save & Publish Item"**. The new item will immediately appear on the customer menu!

#### B. Turning Stock ON or OFF (Out-of-Stock Switch):
If you run out of an ingredient (e.g., no cheese left for pizza):
1. Find the food item in your admin food list.
2. Toggle the **"In Stock / Available"** switch to **OFF**.
3. The item will immediately show as *"Sold Out"* on the customer site, preventing customers from ordering items you cannot cook!

---

### Step 4: Managing Incoming Customer Orders

When a customer places an order, it appears instantly in your **"Live Orders Table"**.

#### How to process an order step-by-step:

1. **New Order Arrives (`PENDING`)**:
   - Sound alert/badge alerts you of a new order.
   - You can see customer name, items ordered, total amount, and delivery address.
   - Click **"Accept Order"** to confirm to the customer.

2. **Kitchen Cooking (`PREPARING`)**:
   - Pass the order ticket to the chefs.
   - Click **"Mark as Preparing"**.
   - The customer's tracking bar will update live to *"Chef is preparing your food"*.

3. **Food is Ready (`READY FOR PICKUP`)**:
   - When food is packed and ready, click **"Ready for Delivery"**.

---

### Step 5: Assigning Orders to Delivery Drivers

To get the food delivered to the customer's house:

1. Look at the order line in the **Live Orders Table**.
2. Find the **"Assign Delivery Driver"** dropdown box.
3. Select an available delivery driver (e.g., *"Ramesh Kumar (Online)"*).
4. Click **"Assign Driver"**.
5. The assigned driver will instantly get a alert notification on their Delivery App with pickup & delivery details!

---

### Step 6: Viewing Customer Reviews & Feedback

To ensure top quality service:
1. Click the **"Customer Feedback"** tab.
2. View star ratings and comments left by customers after receiving their orders.
3. Use this feedback to reward great chefs/drivers or fix kitchen mistakes!

---

## 💡 Quick Tips for Restaurant Managers

- ⏰ **Check incoming orders every 2 minutes** to keep prep times short and customers happy!
- 📸 **Use bright, clear food photos** when adding menu items—great photos double your sales!
- 🛵 **Assign drivers while food is cooking** so drivers arrive at the cafe right when the food is hot and ready!
