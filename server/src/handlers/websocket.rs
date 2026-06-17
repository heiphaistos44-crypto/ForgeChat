use axum::{
    extract::{
        ws::{Message, WebSocket},
        State, WebSocketUpgrade,
    },
    response::Response,
};
use futures_util::{SinkExt, StreamExt};
use tokio::sync::broadcast;
use uuid::Uuid;

use crate::{middleware::auth::verify_token, state::{AppState, VoiceStateData}};

pub async fn ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
    axum::extract::Query(params): axum::extract::Query<std::collections::HashMap<String, String>>,
) -> Response {
    let token = params.get("token").cloned().unwrap_or_default();
    let config_secret = state.config.jwt_secret.clone();
    ws.on_upgrade(move |socket| handle_socket(socket, state, token, config_secret))
}

async fn handle_socket(socket: WebSocket, state: AppState, token: String, secret: String) {
    let claims = match verify_token(&token, &secret) {
        Some(c) => c,
        None => {
            tracing::warn!("WebSocket: token invalide");
            return;
        }
    };

    let user_id = claims.sub;
    tracing::info!("WS connecté: {}", user_id);

    let (tx, _rx) = broadcast::channel::<String>(512);
    state.clients.write().await.insert(user_id, tx.clone());

    let _ = sqlx::query("UPDATE users SET status='online' WHERE id=$1")
        .bind(user_id)
        .execute(&state.db)
        .await;

    broadcast_presence(&state, user_id, "online").await;

    let (mut sender, mut receiver) = socket.split();
    let mut rx = tx.subscribe();

    let send_task = tokio::spawn(async move {
        while let Ok(msg) = rx.recv().await {
            if sender.send(Message::Text(msg)).await.is_err() {
                break;
            }
        }
    });

    let state_clone = state.clone();
    let recv_task = tokio::spawn(async move {
        while let Some(Ok(msg)) = receiver.next().await {
            match msg {
                Message::Text(text) => {
                    handle_ws_message(&state_clone, user_id, &text).await;
                }
                Message::Close(_) => break,
                Message::Ping(_) => {}
                _ => {}
            }
        }
    });

    tokio::select! {
        _ = send_task => {},
        _ = recv_task => {},
    }

    // Nettoyage à la déconnexion
    state.clients.write().await.remove(&user_id);
    let _ = sqlx::query("UPDATE users SET status='offline' WHERE id=$1")
        .bind(user_id)
        .execute(&state.db)
        .await;
    broadcast_presence(&state, user_id, "offline").await;

    // Quitter le salon vocal automatiquement
    cleanup_voice(&state, user_id).await;

    tracing::info!("WS déconnecté: {}", user_id);
}

async fn broadcast_presence(state: &AppState, user_id: Uuid, status: &str) {
    let event = serde_json::json!({
        "type": "PRESENCE_UPDATE",
        "user_id": user_id,
        "status": status,
    })
    .to_string();
    let clients = state.clients.read().await;
    for (uid, tx) in clients.iter() {
        if *uid != user_id {
            let _ = tx.send(event.clone());
        }
    }
}

async fn cleanup_voice(state: &AppState, user_id: Uuid) {
    if let Some((channel_id, _remaining)) = state.voice_leave(user_id).await {
        let event = serde_json::json!({
            "type": "VOICE_USER_LEFT",
            "user_id": user_id,
            "channel_id": channel_id,
        });
        // Broadcast à tous les clients connectés (sidebar participantes globale)
        broadcast_to_all(state, user_id, event.to_string()).await;
    }
}

async fn broadcast_to_all(state: &AppState, exclude: Uuid, event: String) {
    let clients = state.clients.read().await;
    for (uid, tx) in clients.iter() {
        if *uid != exclude {
            let _ = tx.send(event.clone());
        }
    }
}

async fn handle_ws_message(state: &AppState, user_id: Uuid, text: &str) {
    let Ok(msg) = serde_json::from_str::<serde_json::Value>(text) else {
        return;
    };

    match msg["type"].as_str() {
        // ────────── Canal texte ──────────
        Some("SUBSCRIBE_CHANNEL") => {
            if let Some(channel_id) = msg["channel_id"].as_str().and_then(|s| s.parse::<Uuid>().ok()) {
                let tx = state.get_or_create_channel_tx(channel_id).await;
                let read = state.clients.read().await;
                if let Some(user_tx) = read.get(&user_id) {
                    let mut rx = tx.subscribe();
                    let user_tx = user_tx.clone();
                    tokio::spawn(async move {
                        while let Ok(msg) = rx.recv().await {
                            if user_tx.send(msg).is_err() {
                                break;
                            }
                        }
                    });
                }
            }
        }

        Some("TYPING_START") => {
            if let Some(channel_id) = msg["channel_id"].as_str().and_then(|s| s.parse::<Uuid>().ok()) {
                let event = serde_json::json!({
                    "type": "TYPING_START",
                    "channel_id": channel_id,
                    "user_id": user_id,
                });
                state.broadcast_to_channel(channel_id, event.to_string()).await;
            }
        }

        Some("HEARTBEAT") => {
            let read = state.clients.read().await;
            if let Some(tx) = read.get(&user_id) {
                let _ = tx.send(serde_json::json!({ "type": "HEARTBEAT_ACK" }).to_string());
            }
        }

        // ────────── Vocal / Vidéo (WebRTC signaling) ──────────
        Some("VOICE_JOIN") => {
            let Some(channel_id) = msg["channel_id"].as_str().and_then(|s| s.parse::<Uuid>().ok()) else {
                return;
            };

            let existing_ids = state.voice_join(user_id, channel_id).await;

            // Construire la liste des pairs existants avec leur état vocal
            let mut existing_peers = Vec::new();
            for peer_id in &existing_ids {
                if let Ok(row) = sqlx::query(
                    "SELECT username, avatar, discriminator FROM users WHERE id=$1"
                )
                .bind(peer_id)
                .fetch_one(&state.db)
                .await
                {
                    use sqlx::Row;
                    let vs = state.voice_states.read().await.get(peer_id).cloned();
                    existing_peers.push(serde_json::json!({
                        "user_id": peer_id,
                        "username": row.get::<String, _>("username"),
                        "avatar": row.get::<Option<String>, _>("avatar"),
                        "discriminator": row.get::<String, _>("discriminator"),
                        "muted": vs.as_ref().map(|v| v.muted).unwrap_or(false),
                        "video": vs.as_ref().map(|v| v.video).unwrap_or(false),
                        "screen": vs.as_ref().map(|v| v.screen).unwrap_or(false),
                    }));
                }
            }

            state.broadcast_to_user(user_id, serde_json::json!({
                "type": "VOICE_EXISTING_PEERS",
                "channel_id": channel_id,
                "peers": existing_peers,
            }).to_string()).await;

            // Récupérer les infos du rejoignant
            if let Ok(Some(row)) = sqlx::query(
                "SELECT username, avatar, discriminator FROM users WHERE id=$1"
            )
            .bind(user_id)
            .fetch_optional(&state.db)
            .await
            {
                use sqlx::Row;
                let notif = serde_json::json!({
                    "type": "VOICE_USER_JOINED",
                    "channel_id": channel_id,
                    "user_id": user_id,
                    "username": row.get::<String, _>("username"),
                    "avatar": row.get::<Option<String>, _>("avatar"),
                    "discriminator": row.get::<String, _>("discriminator"),
                });
                // Broadcast global : tous les clients voient le join (sidebar)
                broadcast_to_all(state, user_id, notif.to_string()).await;
            }
        }

        Some("VOICE_LEAVE") => {
            cleanup_voice(state, user_id).await;
        }

        Some("VOICE_STATE") => {
            let Some(channel_id) = msg["channel_id"].as_str().and_then(|s| s.parse::<Uuid>().ok()) else {
                return;
            };
            let muted = msg["muted"].as_bool().unwrap_or(false);
            let deafened = msg["deafened"].as_bool().unwrap_or(false);
            let video = msg["video"].as_bool().unwrap_or(false);
            let screen = msg["screen"].as_bool().unwrap_or(false);

            state.voice_states.write().await.insert(user_id, VoiceStateData {
                channel_id, muted, deafened, video, screen,
            });

            let event = serde_json::json!({
                "type": "VOICE_STATE_UPDATE",
                "user_id": user_id,
                "channel_id": channel_id,
                "muted": muted,
                "deafened": deafened,
                "video": video,
                "screen": screen,
            });
            // Broadcast à toute la room + à tous pour la sidebar
            broadcast_to_all(state, user_id, event.to_string()).await;
        }

        Some("VOICE_SIGNAL") => {
            let Some(to) = msg["to"].as_str().and_then(|s| s.parse::<Uuid>().ok()) else {
                return;
            };
            let signal = serde_json::json!({
                "type": "VOICE_SIGNAL",
                "from": user_id,
                "payload": msg["payload"],
            });
            state.broadcast_to_user(to, signal.to_string()).await;
        }

        _ => {}
    }
}
