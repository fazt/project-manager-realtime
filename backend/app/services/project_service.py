import uuid

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.project import Project, ProjectMember, MemberRole
from app.models.task import TaskStatus
from app.schemas.project import ProjectCreate, ProjectUpdate


DEFAULT_STATUSES = [
    {"name": "Todo", "color": "#94a3b8", "position": 0},
    {"name": "In Progress", "color": "#3b82f6", "position": 1},
    {"name": "Done", "color": "#22c55e", "position": 2},
]


async def create_project(
    db: AsyncSession,
    data: ProjectCreate,
    owner_id: uuid.UUID,
) -> Project:
    """Create a project, add creator as admin member, and create 3 default statuses."""
    project = Project(
        name=data.name,
        description=data.description,
        color=data.color,
        owner_id=owner_id,
    )
    db.add(project)
    await db.flush()

    # Add creator as admin member
    member = ProjectMember(
        project_id=project.id,
        user_id=owner_id,
        role=MemberRole.admin,
    )
    db.add(member)

    # Create default statuses
    for s in DEFAULT_STATUSES:
        status_obj = TaskStatus(
            name=s["name"],
            color=s["color"],
            position=s["position"],
            project_id=project.id,
        )
        db.add(status_obj)

    await db.flush()
    await db.refresh(project)
    return project


async def list_user_projects(
    db: AsyncSession,
    user_id: uuid.UUID,
) -> list[Project]:
    """List all projects where user is a member."""
    result = await db.execute(
        select(Project)
        .join(ProjectMember, ProjectMember.project_id == Project.id)
        .where(ProjectMember.user_id == user_id)
        .order_by(Project.created_at.desc())
    )
    return list(result.scalars().all())


async def get_project(
    db: AsyncSession,
    project_id: uuid.UUID,
    user_id: uuid.UUID,
) -> Project:
    """Get a project by ID, ensuring the user is a member."""
    result = await db.execute(
        select(Project)
        .options(
            selectinload(Project.members).selectinload(ProjectMember.user),
            selectinload(Project.statuses),
            selectinload(Project.labels),
        )
        .where(Project.id == project_id)
    )
    project = result.scalar_one_or_none()

    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    # Verify membership
    await _require_member(db, project_id, user_id)
    return project


async def update_project(
    db: AsyncSession,
    project_id: uuid.UUID,
    data: ProjectUpdate,
    user_id: uuid.UUID,
) -> Project:
    """Update a project. Requires admin role."""
    project = await _get_project_or_404(db, project_id)
    await _require_role(db, project_id, user_id, [MemberRole.admin])

    if data.name is not None:
        project.name = data.name
    if data.description is not None:
        project.description = data.description
    if data.color is not None:
        project.color = data.color

    await db.flush()
    await db.refresh(project)
    return project


async def delete_project(
    db: AsyncSession,
    project_id: uuid.UUID,
    user_id: uuid.UUID,
) -> None:
    """Delete a project. Only the owner can delete."""
    project = await _get_project_or_404(db, project_id)

    if project.owner_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the project owner can delete the project",
        )

    await db.delete(project)
    await db.flush()


# --- Member helpers ---

async def get_member(
    db: AsyncSession,
    project_id: uuid.UUID,
    user_id: uuid.UUID,
) -> ProjectMember | None:
    result = await db.execute(
        select(ProjectMember)
        .where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user_id,
        )
    )
    return result.scalar_one_or_none()


async def _require_member(
    db: AsyncSession,
    project_id: uuid.UUID,
    user_id: uuid.UUID,
) -> ProjectMember:
    member = await get_member(db, project_id, user_id)
    if not member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this project",
        )
    return member


async def _require_role(
    db: AsyncSession,
    project_id: uuid.UUID,
    user_id: uuid.UUID,
    allowed_roles: list[MemberRole],
) -> ProjectMember:
    member = await _require_member(db, project_id, user_id)
    if member.role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Required role: {[r.value for r in allowed_roles]}",
        )
    return member


async def _get_project_or_404(db: AsyncSession, project_id: uuid.UUID) -> Project:
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return project
