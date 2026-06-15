-- ForgeChat v1.1.0 — Threads, Forum, types de canaux étendus

-- Threads (conversations dans un canal texte)
CREATE TABLE threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    parent_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
    title VARCHAR(100) NOT NULL DEFAULT 'Thread',
    creator_id UUID NOT NULL REFERENCES users(id),
    message_count INT NOT NULL DEFAULT 0,
    last_reply_at TIMESTAMPTZ,
    archived BOOLEAN NOT NULL DEFAULT FALSE,
    locked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX threads_channel_id ON threads(channel_id);

-- Messages dans les threads
CREATE TABLE thread_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    edited_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX thread_messages_thread_id ON thread_messages(thread_id, created_at DESC);

-- Forum : posts dans un canal de type 'forum'
CREATE TABLE forum_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    content TEXT,
    creator_id UUID NOT NULL REFERENCES users(id),
    tags TEXT[] DEFAULT '{}',
    pinned BOOLEAN NOT NULL DEFAULT FALSE,
    locked BOOLEAN NOT NULL DEFAULT FALSE,
    reply_count INT NOT NULL DEFAULT 0,
    last_reply_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX forum_posts_channel_id ON forum_posts(channel_id, created_at DESC);

-- Réponses aux posts de forum
CREATE TABLE forum_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    edited_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX forum_replies_post_id ON forum_replies(post_id, created_at ASC);

-- Ajouter colonne slow_mode et archived aux canaux existants
ALTER TABLE channels ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE channels ADD COLUMN IF NOT EXISTS video_enabled BOOLEAN NOT NULL DEFAULT FALSE;

-- Types canaux supportés : text, voice, video, announcement, forum, stage
-- (stockés comme VARCHAR dans la colonne type existante, pas de migration nécessaire)
