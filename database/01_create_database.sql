-- =============================================================================
-- Lord Sai — SIP Landing Page
-- 01_create_database.sql — builds the whole database from scratch
-- -----------------------------------------------------------------------------
-- HOW TO RUN (MySQL Workbench):
--   1. Connect as root.
--   2. File → Open SQL Script… → this file.
--   3. Change the password in STEP 5 (two places), then press the lightning
--      bolt (Execute all).
--   4. Put that same password in server/.env as DB_PASSWORD
--      (copy server/.env.example to server/.env first).
--
--   Or skip all of this and double-click server/setup.bat — it runs this same
--   file, creates the user with a random password and writes server/.env.
--
-- Safe to run again: nothing that already exists is dropped and no data is
-- deleted. (To wipe everything and start over, see STEP 1.)
-- =============================================================================


-- -----------------------------------------------------------------------------
-- STEP 1 — the database
-- utf8mb4 stores every language, including Hindi and Marathi names.
-- -----------------------------------------------------------------------------
-- DROP DATABASE IF EXISTS lordsai_sip;   -- ⚠ uncomment ONLY to delete ALL data and rebuild

CREATE DATABASE IF NOT EXISTS lordsai_sip
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE lordsai_sip;


-- -----------------------------------------------------------------------------
-- STEP 2 — lookup tables: the choices offered on the enquiry form
-- `code` is what the website sends; `label` is what you read in reports.
-- Enquiries can only use codes listed here (enforced by foreign keys).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS goals (
  code        VARCHAR(20)  NOT NULL,
  label       VARCHAR(60)  NOT NULL,
  sort_order  TINYINT      NOT NULL,
  PRIMARY KEY (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS investment_ranges (
  code        VARCHAR(20)  NOT NULL,
  label       VARCHAR(60)  NOT NULL,
  sort_order  TINYINT      NOT NULL,
  PRIMARY KEY (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS contact_methods (
  code        VARCHAR(10)  NOT NULL,
  label       VARCHAR(30)  NOT NULL,
  sort_order  TINYINT      NOT NULL,
  PRIMARY KEY (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS contact_times (
  code        VARCHAR(10)  NOT NULL,
  label       VARCHAR(40)  NOT NULL,
  sort_order  TINYINT      NOT NULL,
  PRIMARY KEY (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- The same options as the <select> and radio buttons in index.html.
-- INSERT IGNORE skips rows that are already there, so re-running is safe.
INSERT IGNORE INTO goals (code, label, sort_order) VALUES
  ('wealth',     'Wealth Creation',      1),
  ('education',  'Children''s Education', 2),
  ('retirement', 'Retirement Planning',  3),
  ('tax',        'Tax Saving',           4),
  ('home',       'Home Purchase',        5),
  ('other',      'Other',                6);

INSERT IGNORE INTO investment_ranges (code, label, sort_order) VALUES
  ('upto-2500',   'Up to ₹2,500',        1),
  ('2500-5000',   '₹2,500 – ₹5,000',     2),
  ('5000-10000',  '₹5,000 – ₹10,000',    3),
  ('10000-25000', '₹10,000 – ₹25,000',   4),
  ('above-25000', 'Above ₹25,000',       5),
  ('undecided',   'Not decided yet',     6);

INSERT IGNORE INTO contact_methods (code, label, sort_order) VALUES
  ('phone',    'Phone',    1),
  ('whatsapp', 'WhatsApp', 2),
  ('email',    'Email',    3);

INSERT IGNORE INTO contact_times (code, label, sort_order) VALUES
  ('morning',   'Morning (9 am – 12 pm)',   1),
  ('afternoon', 'Afternoon (12 pm – 4 pm)', 2),
  ('evening',   'Evening (4 pm – 8 pm)',    3);


-- -----------------------------------------------------------------------------
-- STEP 3 — the main tables
-- -----------------------------------------------------------------------------

-- enquiries — one row per enquiry form submission.
-- `status` and `notes` are for you: update them as you follow up each lead
-- (new → contacted → converted / not_interested). See 03_useful_queries.sql.
CREATE TABLE IF NOT EXISTS enquiries (
  id               INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  name             VARCHAR(100)  NOT NULL,
  country_code     VARCHAR(6)    NOT NULL,
  mobile           VARCHAR(15)   NOT NULL,
  email            VARCHAR(254)  NULL,
  goal             VARCHAR(20)   NOT NULL,
  investment_range VARCHAR(20)   NULL,       -- NULL = "Prefer not to say"
  contact_method   VARCHAR(10)   NOT NULL,
  contact_time     VARCHAR(10)   NULL,       -- NULL = "Any time"
  consent          TINYINT(1)    NOT NULL,
  language         CHAR(2)       NOT NULL DEFAULT 'en',   -- en, hi, mr
  page_url         VARCHAR(500)  NULL,
  referrer         VARCHAR(500)  NULL,       -- the site the visitor came from, if any
  utm_source       VARCHAR(100)  NULL,       -- from campaign links, e.g. ?utm_source=instagram
  utm_medium       VARCHAR(100)  NULL,
  utm_campaign     VARCHAR(100)  NULL,
  session_id       CHAR(32)      NULL,       -- links the enquiry to that visit's rows in `events`
  status           ENUM('new','contacted','converted','not_interested') NOT NULL DEFAULT 'new',
  notes            TEXT          NULL,
  created_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_enquiries_created (created_at),
  KEY idx_enquiries_status  (status),
  KEY idx_enquiries_mobile  (mobile),
  KEY idx_enquiries_session (session_id),
  CONSTRAINT fk_enquiries_goal   FOREIGN KEY (goal)             REFERENCES goals (code),
  CONSTRAINT fk_enquiries_range  FOREIGN KEY (investment_range) REFERENCES investment_ranges (code),
  CONSTRAINT fk_enquiries_method FOREIGN KEY (contact_method)   REFERENCES contact_methods (code),
  CONSTRAINT fk_enquiries_time   FOREIGN KEY (contact_time)     REFERENCES contact_times (code),
  CONSTRAINT chk_enquiries_consent  CHECK (consent = 1),
  CONSTRAINT chk_enquiries_language CHECK (language IN ('en','hi','mr'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- events — anonymous visits and clicks (no names, numbers or IP addresses)
--   page_view       someone opened the page
--   pdf_open        the free SIP chart PDF was opened   (label: chart-button / chart-preview)
--   whatsapp_click  a WhatsApp button was clicked        (label: floating / growth-section)
--   cta_click       a button leading to the enquiry form (label: which one, e.g. hero.cta2)
CREATE TABLE IF NOT EXISTS events (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  event_type   VARCHAR(20)   NOT NULL,
  label        VARCHAR(60)   NULL,
  language     CHAR(2)       NULL,
  device       VARCHAR(10)   NULL,         -- mobile, tablet, desktop (from screen width)
  page_url     VARCHAR(500)  NULL,
  referrer     VARCHAR(500)  NULL,
  utm_source   VARCHAR(100)  NULL,
  utm_medium   VARCHAR(100)  NULL,
  utm_campaign VARCHAR(100)  NULL,
  session_id   CHAR(32)      NULL,
  created_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_events_type_created (event_type, created_at),
  KEY idx_events_session (session_id),
  CONSTRAINT chk_events_type CHECK (event_type IN ('page_view','pdf_open','whatsapp_click','cta_click'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- -----------------------------------------------------------------------------
-- STEP 4 — report views (open them in Workbench like a table)
-- -----------------------------------------------------------------------------

-- Leads still waiting for a call-back, newest first, with readable labels
CREATE OR REPLACE VIEW v_new_enquiries AS
SELECT e.id,
       e.created_at,
       e.name,
       CONCAT(e.country_code, ' ', e.mobile)     AS mobile,
       e.email,
       g.label                                   AS goal,
       COALESCE(r.label, 'Prefer not to say')    AS monthly_amount,
       m.label                                   AS contact_by,
       COALESCE(t.label, 'Any time')             AS best_time,
       e.language,
       COALESCE(NULLIF(e.utm_source, ''), 'direct') AS source
FROM enquiries e
JOIN goals g                   ON g.code = e.goal
JOIN contact_methods m         ON m.code = e.contact_method
LEFT JOIN investment_ranges r  ON r.code = e.investment_range
LEFT JOIN contact_times t      ON t.code = e.contact_time
WHERE e.status = 'new'
ORDER BY e.created_at DESC;

-- One row per day: visitors, clicks and enquiries
CREATE OR REPLACE VIEW v_daily_summary AS
SELECT d.day,
       COALESCE(e.visitors, 0)        AS visitors,
       COALESCE(e.page_views, 0)      AS page_views,
       COALESCE(e.pdf_opens, 0)       AS pdf_opens,
       COALESCE(e.whatsapp_clicks, 0) AS whatsapp_clicks,
       COALESCE(e.cta_clicks, 0)      AS enquiry_button_clicks,
       COALESCE(q.enquiries, 0)       AS enquiries
FROM (
  SELECT DATE(created_at) AS day FROM events
  UNION
  SELECT DATE(created_at) FROM enquiries
) AS d
LEFT JOIN (
  SELECT DATE(created_at) AS day,
         COUNT(DISTINCT CASE WHEN event_type = 'page_view' THEN session_id END) AS visitors,
         SUM(event_type = 'page_view')      AS page_views,
         SUM(event_type = 'pdf_open')       AS pdf_opens,
         SUM(event_type = 'whatsapp_click') AS whatsapp_clicks,
         SUM(event_type = 'cta_click')      AS cta_clicks
  FROM events
  GROUP BY DATE(created_at)
) AS e ON e.day = d.day
LEFT JOIN (
  SELECT DATE(created_at) AS day, COUNT(*) AS enquiries
  FROM enquiries
  GROUP BY DATE(created_at)
) AS q ON q.day = d.day
ORDER BY d.day DESC;

-- Which buttons get clicked most
CREATE OR REPLACE VIEW v_button_clicks AS
SELECT event_type,
       COALESCE(label, '')        AS button,
       COUNT(*)                   AS clicks,
       COUNT(DISTINCT session_id) AS visitors,
       MAX(created_at)            AS last_click
FROM events
WHERE event_type <> 'page_view'
GROUP BY event_type, COALESCE(label, '')
ORDER BY clicks DESC;

-- Leads by where they came from, and how many became clients
CREATE OR REPLACE VIEW v_lead_sources AS
SELECT COALESCE(NULLIF(utm_source, ''), 'direct') AS source,
       COUNT(*)                                     AS enquiries,
       SUM(status = 'contacted')                    AS contacted,
       SUM(status = 'converted')                    AS converted,
       ROUND(100 * SUM(status = 'converted') / COUNT(*), 1) AS conversion_pct
FROM enquiries
GROUP BY COALESCE(NULLIF(utm_source, ''), 'direct')
ORDER BY enquiries DESC;


-- -----------------------------------------------------------------------------
-- STEP 5 — the MySQL user the website's API logs in as
-- It can only READ and ADD rows: never change or delete them, and it has no
-- access to any other database. You (root) still edit status/notes yourself.
-- ⚠ Replace CHANGE_ME_Strong#Pass1 with your own password in BOTH lines,
--   and put the same password in server/.env as DB_PASSWORD.
-- -----------------------------------------------------------------------------
CREATE USER IF NOT EXISTS 'lordsai_app'@'localhost' IDENTIFIED BY 'CHANGE_ME_Strong#Pass1';
CREATE USER IF NOT EXISTS 'lordsai_app'@'127.0.0.1' IDENTIFIED BY 'CHANGE_ME_Strong#Pass1';
GRANT SELECT, INSERT ON lordsai_sip.* TO 'lordsai_app'@'localhost';
GRANT SELECT, INSERT ON lordsai_sip.* TO 'lordsai_app'@'127.0.0.1';


-- -----------------------------------------------------------------------------
-- Done. Check what was built:
-- -----------------------------------------------------------------------------
SHOW FULL TABLES FROM lordsai_sip;
