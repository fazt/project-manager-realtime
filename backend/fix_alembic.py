import asyncio
import os

import asyncpg


async def fix():
    url = os.environ["DATABASE_URL"].replace("+asyncpg", "")
    conn = await asyncpg.connect(url)
    await conn.execute("DELETE FROM alembic_version")
    print("alembic_version table cleaned")
    await conn.close()


asyncio.run(fix())
