use axum::{extract::{Path, State}, Extension, Json};
use uuid::Uuid;

use crate::{
    error::{AppError, Result},
    handlers::servers::require_permission,
    middleware::auth::Claims,
    models::role::Permissions,
    state::AppState,
};

// ─── Bans ─────────────────────────────────────────────────────────────────────

pub async fn list_bans(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(server_id): Path<Uuid>,
) -> Result<Json<Vec<serde_json::Value>>> {
    require_permission(&state, claims.sub, server_id, Permissions::BAN_MEMBERS).await?;

    let rows = sqlx::query(
        "SELECT b.user_id, b.reason, b.banned_at,
                u.username, u.discriminator, u.avatar
         FROM bans b
         JOIN users u ON u.id = b.user_id
         WHERE b.server_id=$1
         ORDER BY b.banned_at DESC",
    )
    .bind(server_id)
    .fetch_all(&state.db)
    .await?;

    use sqlx::Row;
    let result = rows
        .iter()
        .map(|r| {
            serde_json::json!({
                "user_id": r.get::<Uuid, _>("user_id"),
                "username": r.get::<String, _>("username"),
                "discriminator": r.get::<String, _>("discriminator"),
                "avatar": r.get::<Option<String>, _>("avatar"),
                "reason": r.get::<Option<String>, _>("reason"),
                "banned_at": r.get::<chrono::DateTime<chrono::Utc>, _>("banned_at"),
            })
        })
        .collect();

    Ok(Json(result))
}

pub async fn unban_member(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path((server_id, user_id)): Path<(Uuid, Uuid)>,
) -> Result<Json<serde_json::Value>> {
    require_permission(&state, claims.sub, server_id, Permissions::BAN_MEMBERS).await?;

    sqlx::query("DELETE FROM bans WHERE server_id=$1 AND user_id=$2")
        .bind(server_id)
        .bind(user_id)
        .execute(&state.db)
        .await?;

    Ok(Json(serde_json::json!({ "ok": true })))
}

// ─── Tags de clan ─────────────────────────────────────────────────────────────

pub async fn list_tags(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(server_id): Path<Uuid>,
) -> Result<Json<Vec<serde_json::Value>>> {
    use crate::handlers::servers::require_member;
    require_member(&state, claims.sub, server_id).await?;

    let rows = sqlx::query(
        "SELECT id, name, color, created_at FROM server_tags WHERE server_id=$1 ORDER BY name",
    )
    .bind(server_id)
    .fetch_all(&state.db)
    .await?;

    use sqlx::Row;
    let result = rows
        .iter()
        .map(|r| {
            serde_json::json!({
                "id": r.get::<Uuid, _>("id"),
                "name": r.get::<String, _>("name"),
                "color": r.get::<i32, _>("color"),
                "created_at": r.get::<chrono::DateTime<chrono::Utc>, _>("created_at"),
            })
        })
        .collect();

    Ok(Json(result))
}

pub async fn create_tag(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(server_id): Path<Uuid>,
    Json(body): Json<serde_json::Value>,
) -> Result<Json<serde_json::Value>> {
    require_permission(&state, claims.sub, server_id, Permissions::MANAGE_ROLES).await?;

    let name = body["name"]
        .as_str()
        .filter(|s| !s.is_empty() && s.len() <= 32)
        .ok_or_else(|| AppError::BadRequest("name requis (1-32 chars)".into()))?;

    let color: i32 = body["color"].as_i64().unwrap_or(7506394) as i32;

    let row = sqlx::query(
        "INSERT INTO server_tags (server_id, name, color) VALUES ($1, $2, $3)
         RETURNING id, name, color, created_at",
    )
    .bind(server_id)
    .bind(name)
    .bind(color)
    .fetch_one(&state.db)
    .await?;

    use sqlx::Row;
    Ok(Json(serde_json::json!({
        "id": row.get::<Uuid, _>("id"),
        "name": row.get::<String, _>("name"),
        "color": row.get::<i32, _>("color"),
        "created_at": row.get::<chrono::DateTime<chrono::Utc>, _>("created_at"),
    })))
}

pub async fn delete_tag(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path((server_id, tag_id)): Path<(Uuid, Uuid)>,
) -> Result<Json<serde_json::Value>> {
    require_permission(&state, claims.sub, server_id, Permissions::MANAGE_ROLES).await?;

    sqlx::query("DELETE FROM server_tags WHERE id=$1 AND server_id=$2")
        .bind(tag_id)
        .bind(server_id)
        .execute(&state.db)
        .await?;

    Ok(Json(serde_json::json!({ "ok": true })))
}

pub async fn assign_tag(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path((server_id, user_id, tag_id)): Path<(Uuid, Uuid, Uuid)>,
) -> Result<Json<serde_json::Value>> {
    require_permission(&state, claims.sub, server_id, Permissions::MANAGE_ROLES).await?;

    sqlx::query(
        "INSERT INTO member_tags (user_id, server_id, tag_id) VALUES ($1, $2, $3)
         ON CONFLICT DO NOTHING",
    )
    .bind(user_id)
    .bind(server_id)
    .bind(tag_id)
    .execute(&state.db)
    .await?;

    Ok(Json(serde_json::json!({ "ok": true })))
}

pub async fn remove_tag(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path((server_id, user_id, tag_id)): Path<(Uuid, Uuid, Uuid)>,
) -> Result<Json<serde_json::Value>> {
    require_permission(&state, claims.sub, server_id, Permissions::MANAGE_ROLES).await?;

    sqlx::query(
        "DELETE FROM member_tags WHERE user_id=$1 AND server_id=$2 AND tag_id=$3",
    )
    .bind(user_id)
    .bind(server_id)
    .bind(tag_id)
    .execute(&state.db)
    .await?;

    Ok(Json(serde_json::json!({ "ok": true })))
}

// ─── Membres avec rôles & tags (vue enrichie) ────────────────────────────────

pub async fn get_members_detailed(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(server_id): Path<Uuid>,
) -> Result<Json<Vec<serde_json::Value>>> {
    use crate::handlers::servers::require_member;
    require_member(&state, claims.sub, server_id).await?;

    let members = sqlx::query(
        "SELECT sm.user_id, sm.nickname, sm.joined_at, sm.is_owner,
                u.username, u.discriminator, u.avatar, u.status
         FROM server_members sm
         JOIN users u ON u.id = sm.user_id
         WHERE sm.server_id=$1
         ORDER BY sm.is_owner DESC, u.username",
    )
    .bind(server_id)
    .fetch_all(&state.db)
    .await?;

    use sqlx::Row;

    let mut result = Vec::new();
    for m in &members {
        let uid: Uuid = m.get("user_id");

        let roles: Vec<serde_json::Value> = sqlx::query(
            "SELECT r.id, r.name, r.color FROM member_roles mr
             JOIN roles r ON r.id = mr.role_id
             WHERE mr.user_id=$1 AND mr.server_id=$2",
        )
        .bind(uid)
        .bind(server_id)
        .fetch_all(&state.db)
        .await?
        .iter()
        .map(|r| {
            serde_json::json!({
                "id": r.get::<Uuid, _>("id"),
                "name": r.get::<String, _>("name"),
                "color": r.get::<i32, _>("color"),
            })
        })
        .collect();

        let tags: Vec<serde_json::Value> = sqlx::query(
            "SELECT st.id, st.name, st.color FROM member_tags mt
             JOIN server_tags st ON st.id = mt.tag_id
             WHERE mt.user_id=$1 AND mt.server_id=$2",
        )
        .bind(uid)
        .bind(server_id)
        .fetch_all(&state.db)
        .await?
        .iter()
        .map(|r| {
            serde_json::json!({
                "id": r.get::<Uuid, _>("id"),
                "name": r.get::<String, _>("name"),
                "color": r.get::<i32, _>("color"),
            })
        })
        .collect();

        result.push(serde_json::json!({
            "user_id": uid,
            "username": m.get::<String, _>("username"),
            "discriminator": m.get::<String, _>("discriminator"),
            "avatar": m.get::<Option<String>, _>("avatar"),
            "status": m.get::<String, _>("status"),
            "nickname": m.get::<Option<String>, _>("nickname"),
            "is_owner": m.get::<bool, _>("is_owner"),
            "joined_at": m.get::<chrono::DateTime<chrono::Utc>, _>("joined_at"),
            "roles": roles,
            "tags": tags,
        }));
    }

    Ok(Json(result))
}
