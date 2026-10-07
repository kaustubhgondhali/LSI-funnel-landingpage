-- =============================================================================
-- Lord Sai — SIP Landing Page
-- 02_sample_data.sql — OPTIONAL example rows, so you can see the tables and
-- reports working before real visitors arrive.
-- -----------------------------------------------------------------------------
-- Run after 01_create_database.sql (as root, in MySQL Workbench).
-- Every sample row is tagged utm_campaign = 'sample-data' and uses fictional
-- names, 90000000xx mobile numbers and example.com emails.
--
-- ⚠ Remove the samples before going live — run the CLEAN-UP block at the end.
-- =============================================================================

USE lordsai_sip;

-- Spread over the last 6 days so the daily report has several rows
INSERT INTO enquiries
  (name, country_code, mobile, email, goal, investment_range, contact_method, contact_time,
   consent, language, page_url, referrer, utm_source, utm_medium, utm_campaign, session_id,
   status, notes, created_at)
VALUES
  ('Sample — Amit Kulkarni',  '+91', '9000000001', 'amit@example.com', 'retirement', '10000-25000', 'phone',    'evening',
   1, 'en', 'https://kaustubhgondhali.github.io/LSI-funnel-landingpage/', NULL, 'instagram', 'reel', 'sample-data', 'a0000000000000000000000000000001',
   'converted', 'Started ₹10,000 SIP with step-up.', NOW() - INTERVAL 5 DAY),
  ('Sample — प्रिया देशमुख',   '+91', '9000000002', NULL,               'education',  '5000-10000',  'whatsapp', 'morning',
   1, 'mr', 'https://kaustubhgondhali.github.io/LSI-funnel-landingpage/', NULL, 'instagram', 'reel', 'sample-data', 'a0000000000000000000000000000002',
   'contacted', 'Call back after salary date.', NOW() - INTERVAL 4 DAY),
  ('Sample — राहुल शर्मा',     '+91', '9000000003', 'rahul@example.com', 'wealth',    '2500-5000',   'whatsapp', NULL,
   1, 'hi', 'https://kaustubhgondhali.github.io/LSI-funnel-landingpage/', 'https://www.google.com/', NULL, NULL, 'sample-data', 'a0000000000000000000000000000003',
   'new', NULL, NOW() - INTERVAL 3 DAY),
  ('Sample — Sneha Patil',    '+91', '9000000004', 'sneha@example.com', 'tax',       'upto-2500',   'email',    'afternoon',
   1, 'en', 'https://kaustubhgondhali.github.io/LSI-funnel-landingpage/', NULL, 'whatsapp', 'status', 'sample-data', 'a0000000000000000000000000000004',
   'not_interested', 'Already invests through bank RM.', NOW() - INTERVAL 2 DAY),
  ('Sample — Vikram Joshi',   '+971', '500000005', NULL,               'home',      'above-25000', 'whatsapp', 'evening',
   1, 'en', 'https://kaustubhgondhali.github.io/LSI-funnel-landingpage/', NULL, 'facebook', 'post', 'sample-data', 'a0000000000000000000000000000005',
   'new', NULL, NOW() - INTERVAL 1 DAY),
  ('Sample — Meera Gaikwad',  '+91', '9000000006', NULL,               'retirement', NULL,         'phone',    NULL,
   1, 'mr', 'https://kaustubhgondhali.github.io/LSI-funnel-landingpage/', NULL, NULL, NULL, 'sample-data', 'a0000000000000000000000000000006',
   'new', NULL, NOW());

-- Visits and clicks. Sessions 1–6 match the enquiries above; 7–10 visited without enquiring.
INSERT INTO events (event_type, label, language, device, utm_source, utm_campaign, session_id, created_at) VALUES
  ('page_view',      NULL,             'en', 'mobile',  'instagram', 'sample-data', 'a0000000000000000000000000000001', NOW() - INTERVAL 5 DAY),
  ('pdf_open',       'chart-button',   'en', 'mobile',  'instagram', 'sample-data', 'a0000000000000000000000000000001', NOW() - INTERVAL 5 DAY),
  ('cta_click',      'returns.cta1',   'en', 'mobile',  'instagram', 'sample-data', 'a0000000000000000000000000000001', NOW() - INTERVAL 5 DAY),
  ('page_view',      NULL,             'mr', 'mobile',  'instagram', 'sample-data', 'a0000000000000000000000000000002', NOW() - INTERVAL 4 DAY),
  ('whatsapp_click', 'floating',       'mr', 'mobile',  'instagram', 'sample-data', 'a0000000000000000000000000000002', NOW() - INTERVAL 4 DAY),
  ('page_view',      NULL,             'hi', 'desktop', NULL,        'sample-data', 'a0000000000000000000000000000003', NOW() - INTERVAL 3 DAY),
  ('pdf_open',       'chart-preview',  'hi', 'desktop', NULL,        'sample-data', 'a0000000000000000000000000000003', NOW() - INTERVAL 3 DAY),
  ('cta_click',      'hero.cta2',      'hi', 'desktop', NULL,        'sample-data', 'a0000000000000000000000000000003', NOW() - INTERVAL 3 DAY),
  ('page_view',      NULL,             'en', 'tablet',  'whatsapp',  'sample-data', 'a0000000000000000000000000000004', NOW() - INTERVAL 2 DAY),
  ('cta_click',      'nav.cta',        'en', 'tablet',  'whatsapp',  'sample-data', 'a0000000000000000000000000000004', NOW() - INTERVAL 2 DAY),
  ('page_view',      NULL,             'en', 'mobile',  'facebook',  'sample-data', 'a0000000000000000000000000000005', NOW() - INTERVAL 1 DAY),
  ('pdf_open',       'chart-button',   'en', 'mobile',  'facebook',  'sample-data', 'a0000000000000000000000000000005', NOW() - INTERVAL 1 DAY),
  ('whatsapp_click', 'growth-section', 'en', 'mobile',  'facebook',  'sample-data', 'a0000000000000000000000000000005', NOW() - INTERVAL 1 DAY),
  ('page_view',      NULL,             'mr', 'mobile',  NULL,        'sample-data', 'a0000000000000000000000000000006', NOW()),
  ('cta_click',      'final.cta1',     'mr', 'mobile',  NULL,        'sample-data', 'a0000000000000000000000000000006', NOW()),
  ('page_view',      NULL,             'en', 'mobile',  'instagram', 'sample-data', 'a0000000000000000000000000000007', NOW() - INTERVAL 5 DAY),
  ('pdf_open',       'chart-button',   'en', 'mobile',  'instagram', 'sample-data', 'a0000000000000000000000000000007', NOW() - INTERVAL 5 DAY),
  ('page_view',      NULL,             'hi', 'desktop', NULL,        'sample-data', 'a0000000000000000000000000000008', NOW() - INTERVAL 2 DAY),
  ('page_view',      NULL,             'en', 'mobile',  'facebook',  'sample-data', 'a0000000000000000000000000000009', NOW() - INTERVAL 1 DAY),
  ('whatsapp_click', 'floating',       'en', 'mobile',  'facebook',  'sample-data', 'a0000000000000000000000000000009', NOW() - INTERVAL 1 DAY),
  ('page_view',      NULL,             'mr', 'mobile',  NULL,        'sample-data', 'a0000000000000000000000000000010', NOW());

-- See the result
SELECT * FROM v_daily_summary;
SELECT * FROM v_new_enquiries;


-- =============================================================================
-- CLEAN-UP — remove every sample row before going live.
-- Select the four lines below and press the lightning bolt with the cursor
-- icon (Execute selection). Workbench's "safe updates" mode is switched off
-- for these two deletes only.
-- =============================================================================
-- SET SQL_SAFE_UPDATES = 0;
-- DELETE FROM events    WHERE utm_campaign = 'sample-data';
-- DELETE FROM enquiries WHERE utm_campaign = 'sample-data';
-- SET SQL_SAFE_UPDATES = 1;
