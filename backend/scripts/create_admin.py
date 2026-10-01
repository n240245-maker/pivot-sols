"""Run locally in a terminal: python scripts/create_admin.py."""
import getpass
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from email_validator import validate_email, EmailNotValidError
from sqlalchemy import select
from cms.auth import hash_password
from cms.database import create_database_engine, session_factory
from cms.models import Admin


def main():
    if not sys.stdin.isatty():
        print('Run this command in an interactive terminal so passwords stay hidden.')
        return 1
    try:
        email = validate_email(input('Admin email: ').strip(), check_deliverability=False).normalized.lower()
        password = getpass.getpass('Password (12–128 characters): ')
        confirmation = getpass.getpass('Confirm password: ')
        if password != confirmation:
            print('Passwords do not match. No account was created.')
            return 1
        encoded = hash_password(password)
        password = confirmation = ''
        with session_factory(create_database_engine())() as db:
            if db.scalar(select(Admin).where(Admin.email == email)):
                print('This admin already exists. No credentials were changed.')
                return 1
            db.add(Admin(email=email, password_hash=encoded, display_name='Admin'))
            db.commit()
        print('Admin created. Open /admin/login and sign in with your password and emailed code.')
        return 0
    except (EmailNotValidError, ValueError):
        print('Use a valid email and a password of 12–128 characters. No account was created.')
    except (KeyboardInterrupt, EOFError):
        print('\nCancelled. No account was created.')
    except Exception:
        print('Admin creation failed. Check database access and apply migrations first. Details are hidden.')
    return 1


if __name__ == '__main__':
    raise SystemExit(main())
