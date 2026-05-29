'''\
add_kb_providers_column.py
'''\nfrom alembic import op\nimport sqlalchemy as sa\n\n# revision identifiers, used by Alembic.\nrevision = 'add_kb_providers_20260529'
down_revision = None  # adjust if needed\nbranch_labels = None\ndepends_on = None\n\ndef upgrade():\n    op.add_column('tenant', sa.Column('kb_providers', sa.JSON(), nullable=False, server_default=sa.text('jsonb_build_object()')) )\n\ndef downgrade():\n    op.drop_column('tenant', 'kb_providers')\n
