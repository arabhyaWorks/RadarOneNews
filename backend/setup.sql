-- ============================================================
-- Samachar Group - Database Setup Script
-- Run: mysql -u root -p < setup.sql
-- Then: node seed.js  (to insert users + articles with proper bcrypt passwords)
-- ============================================================

DROP DATABASE IF EXISTS samachar;
CREATE DATABASE samachar CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE samachar;

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
SET FOREIGN_KEY_CHECKS = 0;
SET TIME_ZONE = '+00:00';

-- ============================================================
-- TABLE: users
-- ============================================================
CREATE TABLE users (
  user_id    VARCHAR(50)  NOT NULL,
  email      VARCHAR(255) NOT NULL,
  name       VARCHAR(255) NOT NULL,
  password   VARCHAR(255) NULL,
  role       VARCHAR(50)  NOT NULL DEFAULT 'reporter',
  status     VARCHAR(20)  NOT NULL DEFAULT 'pending',
  is_active  TINYINT(1)   NOT NULL DEFAULT 1,
  picture    TEXT         NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  UNIQUE KEY uq_email (email),
  INDEX idx_role (role),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: user_sessions  (Google OAuth sessions)
-- ============================================================
CREATE TABLE user_sessions (
  id             INT          NOT NULL AUTO_INCREMENT,
  user_id        VARCHAR(50)  NOT NULL,
  session_token  VARCHAR(500) NOT NULL,
  expires_at     DATETIME     NOT NULL,
  created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_session_token (session_token(255)),
  INDEX idx_user_id       (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: articles
-- ============================================================
CREATE TABLE articles (
  article_id  VARCHAR(50)  NOT NULL,
  title       TEXT         NOT NULL,
  title_hi    TEXT         NULL,
  content     LONGTEXT     NOT NULL,
  content_hi  LONGTEXT     NULL,
  category    VARCHAR(100) NOT NULL,
  image_url   TEXT         NULL,
  is_featured TINYINT(1)   NOT NULL DEFAULT 0,
  pinned      TINYINT(1)   NOT NULL DEFAULT 0,
  status      VARCHAR(50)  NOT NULL DEFAULT 'draft',
  author_id   VARCHAR(50)  NOT NULL,
  author_name VARCHAR(255) NOT NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  views       INT          NOT NULL DEFAULT 0,
  PRIMARY KEY (article_id),
  INDEX idx_status      (status),
  INDEX idx_category    (category),
  INDEX idx_author_id   (author_id),
  INDEX idx_is_featured (is_featured),
  INDEX idx_created_at  (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: settings  (key-value store for site config)
-- ============================================================
CREATE TABLE settings (
  `key`      VARCHAR(100) NOT NULL,
  value      TEXT         NULL,
  updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by VARCHAR(50)  NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: audit_logs
-- ============================================================
CREATE TABLE audit_logs (
  id                INT          NOT NULL AUTO_INCREMENT,
  action            VARCHAR(100) NOT NULL,
  entity_type       VARCHAR(50)  NOT NULL,
  entity_id         VARCHAR(100) NULL,
  entity_label      VARCHAR(255) NULL,
  performed_by      VARCHAR(50)  NOT NULL,
  performed_by_name VARCHAR(255) NOT NULL,
  details           TEXT         NULL,
  created_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_created_at   (created_at),
  INDEX idx_performed_by (performed_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: categories
-- ============================================================
CREATE TABLE categories (
  id         VARCHAR(100) NOT NULL,
  name       VARCHAR(255) NOT NULL,
  name_hi    VARCHAR(255) NOT NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed default categories
INSERT INTO categories (id, name, name_hi) VALUES
  ('sports',        'Sports',        'खेल'),
  ('crime',         'Crime',         'अपराध'),
  ('politics',      'Politics',      'राजनीति'),
  ('entertainment', 'Entertainment', 'मनोरंजन'),
  ('business',      'Business',      'व्यापार'),
  ('technology',    'Technology',    'प्रौद्योगिकी');

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- Done. Now run:  node seed.js
-- This will insert users and articles with bcrypt-hashed passwords.
--
-- Login credentials after seed:
--   admin@samachar.com    / admin123
--   reporter@samachar.com / reporter123
-- ============================================================
