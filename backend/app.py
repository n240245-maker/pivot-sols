from functools import partial

from fastapi import FastAPI, Request, Response, HTTPException
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
from cms.problems import install_problems
from cms.storage import install_uploads
from student_session import issue as issue_student_session, current as current_student_session, public_profile, revoke as revoke_student_session


def create_app(settings: Settings, *, otp_service: OtpService | None = None, contact_service: ContactService | None = None, db_factory=None, admin_sender=None) -> FastAPI:
    app = FastAPI(title="Pivot Sols API")
    service = otp_service or OtpService(settings.otp_secret, partial(send_otp_email, settings=settings))
    contacts = contact_service or ContactService(partial(send_contact_email, settings=settings))
    app.add_middleware(CORSMiddleware, allow_origins=[settings.frontend_url],
                       allow_methods=["GET", "POST", "PUT", "PATCH"], allow_headers=["Content-Type", "X-Pivot-Admin", "X-Pivot-Student", "X-CSRF-Token"], allow_credentials=True)

    @app.middleware("http")
    async def no_cache(request: Request, call_next):
        response = await call_next(request)
        response.headers["Cache-Control"] = "no-store"
        return response

    @app.exception_handler(RequestValidationError)
    async def invalid_request(_request: Request, error: RequestValidationError):
        if _request.url.path.startswith(("/api/admin", "/api/public", "/api/problems")):
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
    def verify_otp(body: VerifyOtpRequest, response: Response):
        service.verify(str(body.email), body.otp)
        if db_factory is not None:
            with db_factory() as db:
                try:
                    profile = {'name': body.name, 'student_id': body.student_id,
                               'academic_level': body.academic_level} if body.name else None
                    issue_student_session(response, db, str(body.email), profile, settings.frontend_url)
                except Exception:
                    db.rollback()
                    raise HTTPException(503, detail={'message': 'Student session service is unavailable.'}) from None
        return {"success": True, "verified": True}

    @app.get('/api/auth/me')
    def student_me(request: Request):
        if db_factory is None:
            raise HTTPException(503, detail={'message': 'Student session service is unavailable.'})
        with db_factory() as db:
            row = current_student_session(request, db)
            if row is None:
                raise HTTPException(401, detail={'message': 'Sign in to continue.'})
            profile = public_profile(row, settings.otp_secret)
            if profile is None:
                raise HTTPException(401, detail={'message': 'Complete student sign-in again.'})
            db.commit()
            return {'profile': profile}

    @app.post('/api/auth/logout')
    def student_logout(request: Request, response: Response):
        if request.headers.get('origin') != settings.frontend_url or request.headers.get('x-pivot-student') != '1':
            raise HTTPException(403, detail={'message': 'This student request is not allowed.'})
        if db_factory is None:
            raise HTTPException(503, detail={'message': 'Student session service is unavailable.'})
        with db_factory() as db:
            revoke_student_session(request, response, db, settings.frontend_url)
        return {"success": True}

    install_cms(app, settings, db_factory, admin_sender or partial(send_otp_email, settings=settings))
    install_problems(app, settings)
    install_uploads(app)
    return app
