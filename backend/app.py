from functools import partial

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config import Settings
from email_service import send_otp_email, send_contact_email
from contact_models import ContactRequest
from contact_service import ContactError, ContactService
from models import SendOtpRequest, VerifyOtpRequest
from otp_service import OtpError, OtpService
from cms.api import install_cms


def create_app(settings: Settings, *, otp_service: OtpService | None = None, contact_service: ContactService | None = None, db_factory=None, admin_sender=None) -> FastAPI:
    app = FastAPI(title="Pivot Sols API")
    service = otp_service or OtpService(settings.otp_secret, partial(send_otp_email, settings=settings))
    contacts = contact_service or ContactService(partial(send_contact_email, settings=settings))
    app.add_middleware(CORSMiddleware, allow_origins=[settings.frontend_url],
                       allow_methods=["GET", "POST", "PUT", "PATCH"], allow_headers=["Content-Type", "X-Pivot-Admin", "X-CSRF-Token"], allow_credentials=True)

    @app.middleware("http")
    async def no_cache(request: Request, call_next):
        response = await call_next(request)
        response.headers["Cache-Control"] = "no-store"
        return response

    @app.exception_handler(RequestValidationError)
    async def invalid_request(_request: Request, error: RequestValidationError):
        if _request.url.path.startswith(("/api/admin", "/api/public")):
            fields = list(dict.fromkeys('.'.join(str(part) for part in item['loc'] if part != 'body') for item in error.errors()))
            return JSONResponse(status_code=422, content={"detail": {"message": "Check the highlighted fields and try again.", "fields": fields}})
        if _request.url.path == "/api/contact":
            return JSONResponse(status_code=400, content={"success": False, "code": "invalid_request",
                                "message": "Enter a valid name, email and a message between 10 and 3000 characters."})
        # FastAPI's default validation response echoes submitted input, including an OTP.
        field = "email" if any("email" in item["loc"] for item in error.errors()) else "request"
        message = "Enter a valid email address." if field == "email" else "Enter a valid email and a six-digit verification code."
        return JSONResponse(status_code=400, content={"success": False, "code": "invalid_request", "message": message})

    @app.exception_handler(OtpError)
    async def otp_error(_request: Request, error: OtpError):
        content = {"success": False, "code": error.code, "message": error.message}
        headers = {}
        if error.retry_after is not None:
            content["retry_after"] = error.retry_after
            headers["Retry-After"] = str(error.retry_after)
        return JSONResponse(status_code=error.status, content=content, headers=headers)

    @app.get("/api/health")
    def health():
        return {"status": "ok", "service": "pivot-sols-api"}

    @app.exception_handler(ContactError)
    async def contact_error(_request: Request, error: ContactError):
        content = {"success": False, "code": error.code, "message": error.message}
        headers = {}
        if error.retry_after is not None:
            content["retry_after"] = error.retry_after
            headers["Retry-After"] = str(error.retry_after)
        return JSONResponse(status_code=error.status, content=content, headers=headers)

    @app.post("/api/contact")
    def contact(body: ContactRequest, request: Request):
        contacts.send(body, request.client.host if request.client else "unknown")
        return {"success": True, "message": "Message sent successfully."}

    # Normal def endpoints execute blocking SMTP in FastAPI's worker thread pool.
    @app.post("/api/auth/send-otp")
    def send_otp(body: SendOtpRequest):
        service.send(str(body.email))
        return {"success": True, "message": "OTP sent successfully"}

    @app.post("/api/auth/verify-otp")
    def verify_otp(body: VerifyOtpRequest):
        service.verify(str(body.email), body.otp)
        return {"success": True, "verified": True}

    install_cms(app, settings, db_factory, admin_sender or partial(send_otp_email, settings=settings))
    return app
