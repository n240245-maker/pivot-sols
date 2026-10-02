from functools import partial

from fastapi import FastAPI, Request, Response, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config import Settings
from email_service import send_contact_email
from contact_models import ContactRequest
from contact_service import ContactError, ContactService
from models import StudentLoginRequest
from cms.api import install_cms
from cms.problems import install_problems
from cms.storage import install_uploads
from student_session import issue as issue_student_session, current as current_student_session, public_profile, revoke as revoke_student_session


def create_app(settings: Settings, *, contact_service: ContactService | None = None, db_factory=None) -> FastAPI:
    app = FastAPI(title="Pivot Sols API")
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
        return JSONResponse(status_code=400, content={"success": False, "code": "invalid_request",
                            "message": "Enter a valid name, student ID and year."})

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

    @app.post('/api/auth/login')
    def student_login(body: StudentLoginRequest, request: Request, response: Response):
        if request.headers.get('origin') != settings.frontend_url or request.headers.get('x-pivot-student') != '1':
            raise HTTPException(403, detail={'message': 'This student request is not allowed.'})
        if db_factory is None:
            raise HTTPException(503, detail={'message': 'Student session service is unavailable.'})
        with db_factory() as db:
            try:
                app.state.admin_security.throttle(db, 'student-login-ip', request.client.host if request.client else 'unknown', 30)
                profile = {'name': body.name, 'student_id': body.student_id,
                           'academic_level': body.academic_level}
                session = issue_student_session(response, db, profile, settings.frontend_url)
                return {'success': True, 'student': public_profile(session, settings.otp_secret)}
            except HTTPException:
                raise
            except Exception:
                db.rollback()
                raise HTTPException(503, detail={'message': 'Student session service is unavailable.'}) from None

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

    install_cms(app, settings, db_factory)
    install_problems(app, settings)
    install_uploads(app)
    return app
