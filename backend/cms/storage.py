"""Validated agent uploads to durable S3-compatible object storage."""
import os
from uuid import uuid4
from urllib.parse import urlsplit

from fastapi import APIRouter, Depends, Request, UploadFile

from .repository import fail

LIMITS = {'image': 5 * 1024 * 1024, 'pdf': 20 * 1024 * 1024}


class ObjectStorage:
    def __init__(self, *, endpoint: str, region: str, bucket: str, access_key: str,
                 secret_key: str, public_base_url: str):
        import boto3
        parsed = urlsplit(public_base_url)
        if parsed.scheme != 'https' or not parsed.hostname or parsed.username or parsed.password:
            raise ValueError('Storage public URL must use HTTPS.')
        if endpoint:
            private_endpoint = urlsplit(endpoint)
            if private_endpoint.scheme != 'https' or not private_endpoint.hostname or private_endpoint.username or private_endpoint.password:
                raise ValueError('Storage API endpoint must use HTTPS.')
        self.bucket = bucket
        self.public_base_url = public_base_url.rstrip('/')
        self.client = boto3.client('s3', endpoint_url=endpoint or None, region_name=region or None,
                                   aws_access_key_id=access_key, aws_secret_access_key=secret_key)

    @classmethod
    def from_env(cls):
        keys = ('STORAGE_BUCKET', 'STORAGE_ACCESS_KEY', 'STORAGE_SECRET_KEY', 'STORAGE_PUBLIC_BASE_URL')
        if any(not os.getenv(key) for key in keys):
            return None
        return cls(endpoint=os.getenv('STORAGE_ENDPOINT', ''), region=os.getenv('STORAGE_REGION', ''),
                   bucket=os.environ['STORAGE_BUCKET'], access_key=os.environ['STORAGE_ACCESS_KEY'],
                   secret_key=os.environ['STORAGE_SECRET_KEY'], public_base_url=os.environ['STORAGE_PUBLIC_BASE_URL'])

    def put(self, key: str, data: bytes, content_type: str, filename: str) -> str:
        self.client.put_object(Bucket=self.bucket, Key=key, Body=data, ContentType=content_type,
                               ContentDisposition=f'inline; filename="{filename}"')
        return f'{self.public_base_url}/{key}'


def identify(data: bytes, kind: str, filename: str, content_type: str):
    extension = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''
    if kind == 'pdf' and extension == 'pdf' and content_type == 'application/pdf' and data.startswith(b'%PDF-'):
        return 'pdf', 'application/pdf'
    if kind == 'image':
        allowed = {'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png', 'webp': 'image/webp'}
        if extension in allowed and allowed[extension] == content_type:
            if content_type == 'image/jpeg' and data.startswith(b'\xff\xd8\xff'):
                return 'jpg', content_type
            if content_type == 'image/png' and data.startswith(b'\x89PNG\r\n\x1a\n'):
                return 'png', content_type
            if content_type == 'image/webp' and data.startswith(b'RIFF') and data[8:12] == b'WEBP':
                return 'webp', content_type
    fail('Choose a valid PDF or JPG, PNG, or WebP image.', 422)


def install_uploads(app):
    get_db = app.state.cms_get_db
    security = app.state.admin_security
    router = APIRouter(tags=['Agent uploads'])

    def agent(request: Request, db=Depends(get_db)):
        return security.session(request, db)[0]

    @router.post('/api/admin/uploads/{kind}', dependencies=[Depends(agent)])
    async def upload(kind: str, file: UploadFile):
        if kind not in LIMITS:
            fail('Choose image or pdf.', 404)
        try:
            storage = ObjectStorage.from_env()
        except Exception:
            fail('Object storage configuration is invalid. Paste a secure URL for now.', 503)
        if storage is None:
            fail('Object storage is not configured. Paste a secure URL for now.', 503)
        data = await file.read(LIMITS[kind] + 1)
        if not data or len(data) > LIMITS[kind]:
            fail('The selected file is empty or too large.', 422)
        extension, content_type = identify(data, kind, file.filename or '', file.content_type or '')
        key = f'pivot-sols/{kind}/{uuid4().hex}.{extension}'
        try:
            url = storage.put(key, data, content_type, f'file.{extension}')
        except Exception:
            fail('Upload failed. Try again or paste a secure URL.', 503)
        return {'url': url, 'storage_type': 'object'}

    app.include_router(router)
