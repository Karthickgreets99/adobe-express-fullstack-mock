-- ─────────────────────────────────────────
-- ADOBE EXPRESS MOCK — Database Schema
-- Run once to set up tables
-- ─────────────────────────────────────────

CREATE DATABASE IF NOT EXISTS adobe_express;
USE adobe_express;

-- Users
CREATE TABLE IF NOT EXISTS users (
  id            VARCHAR(36)   PRIMARY KEY DEFAULT (UUID()),
  email         VARCHAR(255)  NOT NULL UNIQUE,
  name          VARCHAR(255)  NOT NULL,
  stripe_id     VARCHAR(255),
  plan          ENUM('free','pro','team','enterprise') DEFAULT 'free',
  created_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email)
);

-- Projects (user designs)
CREATE TABLE IF NOT EXISTS projects (
  id            VARCHAR(36)   PRIMARY KEY DEFAULT (UUID()),
  user_id       VARCHAR(36)   NOT NULL,
  name          VARCHAR(255)  NOT NULL,
  thumbnail_url VARCHAR(1024),
  data          JSON,                         -- design canvas data
  is_public     BOOLEAN       DEFAULT FALSE,
  publish_status ENUM('draft','published','failed','partial') DEFAULT 'draft',
  publish_results JSON,
  created_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_updated_at (updated_at)
);

-- Templates (public gallery)
CREATE TABLE IF NOT EXISTS templates (
  id            VARCHAR(36)   PRIMARY KEY DEFAULT (UUID()),
  name          VARCHAR(255)  NOT NULL,
  category      VARCHAR(100)  NOT NULL,
  thumbnail_url VARCHAR(1024),
  downloads     INT           DEFAULT 0,
  likes         INT           DEFAULT 0,
  is_public     BOOLEAN       DEFAULT TRUE,
  user_id       VARCHAR(36),                 -- NULL = Adobe-made template
  created_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_category (category),
  INDEX idx_downloads (downloads DESC),
  FULLTEXT INDEX ft_name (name)             -- enables MATCH AGAINST search
);

-- Assets (S3-backed uploads)
CREATE TABLE IF NOT EXISTS assets (
  id            VARCHAR(36)   PRIMARY KEY DEFAULT (UUID()),
  user_id       VARCHAR(36)   NOT NULL,
  project_id    VARCHAR(36),
  s3_key        VARCHAR(1024) NOT NULL UNIQUE,
  file_name     VARCHAR(255)  NOT NULL,
  content_type  VARCHAR(100)  NOT NULL,
  file_size     BIGINT        NOT NULL,
  width         INT,
  height        INT,
  created_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
  INDEX idx_user_id (user_id),
  INDEX idx_project_id (project_id)
);

-- Exports (generated PNG/PDF exports)
CREATE TABLE IF NOT EXISTS exports (
  id            VARCHAR(36)   PRIMARY KEY DEFAULT (UUID()),
  user_id       VARCHAR(36)   NOT NULL,
  project_id    VARCHAR(36)   NOT NULL,
  s3_key        VARCHAR(1024) NOT NULL,
  format        ENUM('png','jpg','pdf','svg') NOT NULL,
  status        ENUM('pending','done','failed') DEFAULT 'pending',
  created_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  INDEX idx_user_project (user_id, project_id)
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id            VARCHAR(36)   PRIMARY KEY DEFAULT (UUID()),
  user_id       VARCHAR(36)   NOT NULL,
  message       TEXT          NOT NULL,
  is_read       BOOLEAN       DEFAULT FALSE,
  created_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_unread (user_id, is_read)
);
