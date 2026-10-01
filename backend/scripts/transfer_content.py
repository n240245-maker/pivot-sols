"""Content-only, atomic transfer into an empty migrated database. No credentials.

Uses DATABASE_URL from the process, falling back to backend/.env locally.
No auth tables are exported. A nonempty destination is never overwritten.
"""
import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from sqlalchemy import DateTime, select, text
from cms.database import Base, create_database_engine
from cms.repository import RESOURCES
from cms.models import branch_domains, branch_roles, domain_roles

CONTENT_NAMES = {model.__tablename__ for model, _ in RESOURCES.values()} | {
    table.name for table in (branch_domains, branch_roles, domain_roles)}
TABLES = [table for table in Base.metadata.sorted_tables if table.name in CONTENT_NAMES]


def canonical(value):
    return json.dumps(value, sort_keys=True, default=lambda v: v.isoformat(), separators=(',', ':'))


def normalized_snapshot(data):
    """Compare timestamp instants across databases with different session time zones."""
    normalized = {'format': data['format'], 'revision': data['revision'], 'tables': {}}
    for table in TABLES:
        records = []
        for item in data['tables'][table.name]:
            row = dict(item)
            for column in table.columns:
                if isinstance(column.type, DateTime) and row[column.name] is not None:
                    value = row[column.name]
                    if isinstance(value, str):
                        value = datetime.fromisoformat(value)
                    row[column.name] = value.astimezone(timezone.utc).isoformat()
            records.append(row)
        normalized['tables'][table.name] = records
    return normalized


def snapshot(connection, exclude=()):
    excluded = set(exclude)
    rows = {}
    for table in TABLES:
        records = []
        for row in connection.execute(select(table).order_by(*table.primary_key.columns)).mappings():
            # Exclude only explicitly named QA UUIDs and their association rows.
            ids = [row[col.name] for col in table.columns if col.name == 'id' or col.foreign_keys]
            if not excluded.intersection(ids):
                records.append(dict(row))
        rows[table.name] = records
    return json.loads(canonical({'format': 'pivot-content-v1',
        'revision': connection.execute(text('select version_num from alembic_version')).scalar_one(),
        'tables': rows}))


def import_content(connection, data):
    if data.get('format') != 'pivot-content-v1' or set(data.get('tables', {})) != CONTENT_NAMES:
        raise ValueError('Unsupported content snapshot.')
    current = snapshot(connection)
    if data['revision'] != current['revision']:
        raise ValueError('Apply the matching Alembic migration before importing.')
    if any(current['tables'].values()):
        if canonical(normalized_snapshot(current)) == canonical(normalized_snapshot(data)):
            return 'already imported; no changes'
        raise ValueError('Destination has content; refusing to overwrite or duplicate it.')
    for table in TABLES:
        records = []
        for item in data['tables'][table.name]:
            if set(item) != set(table.columns.keys()):
                raise ValueError('Snapshot fields do not match the migrated schema.')
            row = dict(item)
            for column in table.columns:
                if isinstance(column.type, DateTime) and row[column.name] is not None:
                    row[column.name] = datetime.fromisoformat(row[column.name])
            records.append(row)
        if records:
            connection.execute(table.insert(), records)
    if canonical(normalized_snapshot(snapshot(connection))) != canonical(normalized_snapshot(data)):
        raise ValueError('Imported content differs; rolling back.')
    return 'imported and verified'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['export', 'import'])
    parser.add_argument('file', type=Path)
    parser.add_argument('--exclude-id', action='append', default=[])
    args = parser.parse_args()
    try:
        engine = create_database_engine()
        with engine.begin() as connection:
            if args.action == 'export':
                data = snapshot(connection, args.exclude_id)
                # Exclusive creation prevents an accidental overwrite of a previous backup.
                with args.file.open('x', encoding='utf-8') as output:
                    output.write(json.dumps(data, indent=2) + '\n')
                result = 'exported (content only; no accounts or sessions)'
            else:
                data = json.loads(args.file.read_text(encoding='utf-8'))
                result = import_content(connection, data)
        print(json.dumps({'result': result, 'rows': {key: len(rows) for key, rows in data['tables'].items()}}))
        return 0
    except ValueError as error:
        print(str(error))
    except Exception:
        print('Content transfer failed; transaction rolled back. Details hidden to protect connection data.')
    return 1


if __name__ == '__main__':
    raise SystemExit(main())
