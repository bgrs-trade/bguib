-- Cloudflare D1 (SQLite) Database Schema for Benishangul-Gumuz Urban & Infrastructure Bureau
-- Run with: npx wrangler d1 execute bgui_db --remote --file=./schema.sql

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  department TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin', 'staff')),
  status TEXT NOT NULL CHECK(status IN ('approved', 'pending', 'rejected')),
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS resources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ref TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL,
  year TEXT NOT NULL,
  format TEXT NOT NULL,
  size TEXT NOT NULL,
  title_en TEXT NOT NULL,
  title_am TEXT NOT NULL,
  summary_en TEXT NOT NULL,
  summary_am TEXT NOT NULL,
  highlights_json TEXT DEFAULT '[]',
  file_key TEXT,
  file_name TEXT,
  uploaded_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS news_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tab_type TEXT NOT NULL CHECK(tab_type IN ('news', 'events', 'media', 'press')),
  badge_en TEXT,
  badge_am TEXT,
  badge_color TEXT DEFAULT 'bg-civic-blue',
  date_en TEXT,
  date_am TEXT,
  location_or_ref TEXT,
  title_en TEXT NOT NULL,
  title_am TEXT NOT NULL,
  desc_en TEXT NOT NULL,
  desc_am TEXT NOT NULL,
  full_text TEXT,
  media_url TEXT,
  file_key TEXT,
  created_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tab_type TEXT NOT NULL CHECK(tab_type IN ('bids', 'jobs', 'laws')),
  ref TEXT NOT NULL,
  title TEXT NOT NULL,
  deadline TEXT NOT NULL,
  tag TEXT NOT NULL,
  details TEXT NOT NULL,
  file_key TEXT,
  file_name TEXT,
  updated_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  zone TEXT NOT NULL,
  zone_label TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL,
  progress INTEGER NOT NULL DEFAULT 0,
  budget TEXT NOT NULL,
  contractor TEXT NOT NULL,
  desc TEXT NOT NULL,
  img_url TEXT,
  updated_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS eservice_submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tracking_code TEXT UNIQUE NOT NULL,
  service_type TEXT NOT NULL,
  applicant_name TEXT NOT NULL,
  contact_info TEXT NOT NULL,
  municipality TEXT,
  reference_detail TEXT,
  description TEXT,
  attachment_key TEXT,
  attachment_name TEXT,
  status TEXT NOT NULL DEFAULT 'Submitted',
  staff_response TEXT,
  responded_by TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
