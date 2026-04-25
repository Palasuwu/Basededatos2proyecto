// ============================================================
// 00 — CONSTRAINTS E ÍNDICES
// Correr primero antes de cargar datos
// ============================================================

CREATE CONSTRAINT board_id    IF NOT EXISTS FOR (n:Board)    REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT thread_id   IF NOT EXISTS FOR (n:Thread)   REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT post_id     IF NOT EXISTS FOR (n:Post)     REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT user_id     IF NOT EXISTS FOR (n:User)     REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT tag_name    IF NOT EXISTS FOR (n:Tag)      REQUIRE n.name IS UNIQUE;
CREATE CONSTRAINT file_id     IF NOT EXISTS FOR (n:File)     REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT report_id   IF NOT EXISTS FOR (n:Report)   REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT ban_id      IF NOT EXISTS FOR (n:Ban)      REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT reaction_id IF NOT EXISTS FOR (n:Reaction) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT ip_address  IF NOT EXISTS FOR (n:IP)       REQUIRE n.address IS UNIQUE;

CREATE INDEX post_created  IF NOT EXISTS FOR (n:Post)   ON (n.created_at);
CREATE INDEX post_score    IF NOT EXISTS FOR (n:Post)   ON (n.score);
CREATE INDEX thread_board  IF NOT EXISTS FOR (n:Thread) ON (n.created_at);
CREATE INDEX user_alias    IF NOT EXISTS FOR (n:User)   ON (n.alias);
