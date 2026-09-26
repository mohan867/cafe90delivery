import os
from flask import jsonify, make_response
from utils.logger import logger

def success_response(data=None, message="Success", status_code=200, meta=None):
    """Standardized Success JSON Envelope"""
    payload = {
        "success": True,
        "message": message,
        "data": data
    }
    if meta is not None:
        payload["meta"] = meta
    return make_response(jsonify(payload), status_code)

def error_response(message="An error occurred", code="BAD_REQUEST", details=None, status_code=400):
    """
    Standardized Error JSON Envelope.
    Sanitizes 500 Internal Server Errors for the client while logging full tracebacks internally.
    """
    env = os.getenv("ENVIRONMENT", "development")
    
    # Log 500 Internal Server Errors with stack trace
    if status_code >= 500:
        logger.error(f"HTTP {status_code} Error [{code}]: {message} | Details: {details}")
        
        # Sanitize internal exceptions to prevent credential/driver leaks to frontend
        if env != "development":
            message = "An internal server error occurred. Please try again later."
            details = None
        else:
            # In development mode, clarify connection issues without breaking security
            if "psycopg" in str(message).lower() or "connection" in str(message).lower():
                message = "Database connection failed. Please check your PostgreSQL connection and credentials."
                
    payload = {
        "success": False,
        "error": {
            "code": code,
            "message": message,
            "details": details
        }
    }
    return jsonify(payload), status_code
