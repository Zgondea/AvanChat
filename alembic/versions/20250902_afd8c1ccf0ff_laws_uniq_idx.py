"""laws: uniq + idx

Revision ID: afd8c1ccf0ff
Revises: d764d5282c01
Create Date: 2025-09-02 07:41:41.758974+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'afd8c1ccf0ff'
down_revision: Union[str, None] = 'd764d5282c01'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    # law_versions: (law_id, version_no) trebuie unic
    op.create_unique_constraint(
        "uq_law_versions_law_version",
        "law_versions",
        ["law_id", "version_no"],
    )
    
    op.create_index(
    "ix_law_sections_version_section",
        "law_sections",
        ["version_id", "section_key"],
        unique=False,
    )



def downgrade():
    op.drop_index("ix_law_sections_version_section", table_name="law_sections")
    op.drop_constraint("uq_law_versions_law_version", "law_versions", type_="unique")
