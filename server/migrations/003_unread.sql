-- Suivi des messages lus par canal
CREATE TABLE IF NOT EXISTS last_read (
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    read_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, channel_id)
);

-- Icône serveur dans la table servers (déjà présente, colonne icon)
-- @mention tracking pour les mentions @everyone / @here (via flag dans messages)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS mention_everyone BOOLEAN NOT NULL DEFAULT FALSE;
