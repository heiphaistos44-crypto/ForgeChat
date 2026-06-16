-- ForgeChat v2.0.0 — Bots, Emojis personnalisés, TTL médias

-- TTL pour pièces jointes (vidéos temporaires)
ALTER TABLE attachments ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS attachments_expires_at ON attachments(expires_at) WHERE expires_at IS NOT NULL;

-- Emojis personnalisés par serveur
CREATE TABLE IF NOT EXISTS custom_emojis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
    name VARCHAR(32) NOT NULL,
    url VARCHAR(500) NOT NULL,
    creator_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(server_id, name)
);

CREATE INDEX IF NOT EXISTS custom_emojis_server_id ON custom_emojis(server_id);

-- Tokens d'API pour les bots
CREATE TABLE IF NOT EXISTS bot_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bot_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(bot_user_id, server_id)
);

CREATE INDEX IF NOT EXISTS bot_tokens_server_id ON bot_tokens(server_id);
