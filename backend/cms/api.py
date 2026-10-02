from uuid import UUID

from fastapi import APIRouter, Depends, Request
from sqlalchemy.exc import SQLAlchemyError

from .auth import AdminSecurity, admin_auth_router
from .catalog import build_catalog
from .repository import RESOURCES, all_rows, change_status, dependencies, fail, get_row, public_records, published_rows, remove_draft, save, serialize
from .schemas import ContentResponse, StatusInput


def install_cms(app, settings, factory):
    def get_db():
        if factory is None:
            fail('Content service is unavailable.', 503)
        with factory() as db:
            try:
                yield db
            except SQLAlchemyError:
                db.rollback()
                fail('The content service could not complete this request. Please try again.', 503)
            finally:
                db.rollback()

    security = AdminSecurity(settings)
    app.state.admin_security = security
    app.state.cms_get_db = get_db
    app.include_router(admin_auth_router(get_db, security))

    def require_admin(request: Request, db=Depends(get_db)):
        return security.session(request, db)[0]

    public = APIRouter(prefix='/api/public', tags=['Published content'])
    admin = APIRouter(prefix='/api/admin', tags=['Admin content'], dependencies=[Depends(require_admin)])

    @public.get('/catalog')
    def catalog(db=Depends(get_db)):
        return build_catalog(db)

    @public.get('/site-content/{key}', response_model=ContentResponse)
    def site_content(key: str, db=Depends(get_db)):
        row = next((row for row in published_rows(db)['site-content'] if row.key == key), None)
        if row is None:
            fail('This content is not available.', 404)
        return serialize(row)

    @public.get('/career-resources', response_model=list[ContentResponse])
    def career_resources(type: str | None = None, branch: str | None = None, db=Depends(get_db)):
        if type not in (None, 'domain', 'job'):
            fail('Choose domain or job.', 422)
        rows = published_rows(db)
        branch_ids = {item.id for item in rows['branches'] if item.slug == branch} if branch else None
        return [serialize(item) for item in rows['career-resources']
                if (type is None or item.resource_type == type) and (branch_ids is None or item.branch_id in branch_ids)]

    @admin.get('/catalog')
    def admin_catalog(db=Depends(get_db)):
        return {key: [serialize(row) for row in all_rows(db, model)] for key, (model, _) in RESOURCES.items()}

    def register(key, model, schema):
        def public_list(db=Depends(get_db)):
            return public_records(published_rows(db), key)

        def listing(db=Depends(get_db)):
            return [serialize(row) for row in all_rows(db, model)]

        def detail(row_id: UUID, db=Depends(get_db)):
            return serialize(get_row(db, model, row_id))

        def related(row_id: UUID, db=Depends(get_db)):
            return {'dependencies': dependencies(db, get_row(db, model, row_id))}

        def create(body, db=Depends(get_db)):
            return serialize(save(db, model, body))

        def update(row_id: UUID, body, db=Depends(get_db)):
            return serialize(save(db, model, body, get_row(db, model, row_id, lock=True)))

        def status(row_id: UUID, body: StatusInput, db=Depends(get_db)):
            return serialize(change_status(db, get_row(db, model, row_id, lock=True), body))

        def remove(row_id: UUID, db=Depends(get_db)):
            return remove_draft(db, get_row(db, model, row_id, lock=True))

        # Set concrete Pydantic body types before FastAPI analyzes these resource routes.
        create.__annotations__['body'] = schema
        update.__annotations__['body'] = schema
        for handler in (public_list, listing, detail, related, create, update, status):
            handler.__name__ = f'{handler.__name__}_{key.replace("-", "_")}'
        if key != 'career-resources':
            public.add_api_route(f'/{key}', public_list, methods=['GET'], response_model=list[ContentResponse])
        admin.add_api_route(f'/{key}', listing, methods=['GET'], response_model=list[ContentResponse])
        admin.add_api_route(f'/{key}', create, methods=['POST'], response_model=ContentResponse, status_code=201)
        admin.add_api_route(f'/{key}/{{row_id}}', detail, methods=['GET'], response_model=ContentResponse)
        admin.add_api_route(f'/{key}/{{row_id}}', update, methods=['PUT'], response_model=ContentResponse)
        admin.add_api_route(f'/{key}/{{row_id}}/dependencies', related, methods=['GET'])
        admin.add_api_route(f'/{key}/{{row_id}}/status', status, methods=['PATCH'], response_model=ContentResponse)
        if key in {'rooms', 'faculty-subjects', 'faculty', 'career-resources'}:
            remove.__name__ = f'remove_{key.replace("-", "_")}'
            admin.add_api_route(f'/{key}/{{row_id}}', remove, methods=['DELETE'])

    for key, (model, schema) in RESOURCES.items():
        register(key, model, schema)
    app.include_router(public)
    app.include_router(admin)
