-- ForgeChat v2.1.0 — Email verification + Friend invites + Server tags

-- Inscriptions en attente (vérification email par code 4 chiffres)
CREATE TABLE pending_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    username VARCHAR(32) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    discriminator VARCHAR(4) NOT NULL,
    code VARCHAR(4) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Invitations amis par lien (code 8 chars, valide 7 jours)
CREATE TABLE friend_invites (
    code VARCHAR(16) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    uses INT NOT NULL DEFAULT 0,
    max_uses INT,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tags de clan par serveur (ex : [ALPHA], [ELITE], [MOD])
CREATE TABLE server_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
    name VARCHAR(32) NOT NULL,
    color INT NOT NULL DEFAULT 7506394,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(server_id, name)
);

-- Tags assignés aux membres
CREATE TABLE member_tags (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES server_tags(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, server_id, tag_id)
);
