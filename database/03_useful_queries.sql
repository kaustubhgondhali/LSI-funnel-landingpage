-- =============================================================================
-- Lord Sai — SIP Landing Page
-- 03_useful_queries.sql — everyday queries for MySQL Workbench (log in as root)
-- -----------------------------------------------------------------------------
-- Put the cursor on one query and press Ctrl+Enter to run just that one.
-- The UPDATE examples are commented out so "Execute all" never changes data.
-- =============================================================================

USE lordsai_sip;

-- 1. Today's enquiries
SELECT id, created_at, name, CONCAT(country_code, ' ', mobile) AS mobile, goal, contact_method, status
FROM enquiries
WHERE created_at >= CURDATE()
ORDER BY created_at DESC;

-- 2. Call-back list: everyone not yet contacted, with readable labels
SELECT * FROM v_new_enquiries;

-- 3. Last 7 days at a glance
SELECT * FROM v_daily_summary WHERE day >= CURDATE() - INTERVAL 6 DAY;

-- 4. Which source brings leads, and how many become clients
SELECT * FROM v_lead_sources;

-- 5. Which buttons people click
SELECT * FROM v_button_clicks;

-- 6. Leads who opened the free SIP chart before enquiring (warmest leads)
SELECT DISTINCT q.id, q.created_at, q.name, CONCAT(q.country_code, ' ', q.mobile) AS mobile, q.status
FROM enquiries q
JOIN events e ON e.session_id = q.session_id AND e.event_type = 'pdf_open'
ORDER BY q.created_at DESC;

-- 7. Enquiries by goal
SELECT g.label AS goal, COUNT(q.id) AS enquiries
FROM goals g
LEFT JOIN enquiries q ON q.goal = g.code
GROUP BY g.code, g.label, g.sort_order
ORDER BY g.sort_order;

-- 8. Enquiries by page language
SELECT language, COUNT(*) AS enquiries FROM enquiries GROUP BY language ORDER BY enquiries DESC;

-- 9. Find a lead by mobile number
SELECT * FROM enquiries WHERE mobile = '9000000001';

-- 10. Follow-up: change a lead's status and add a note (use the lead's id)
-- UPDATE enquiries SET status = 'contacted', notes = 'Called — interested in ₹5,000 SIP' WHERE id = 1;
-- UPDATE enquiries SET status = 'converted' WHERE id = 1;
-- UPDATE enquiries SET status = 'not_interested', notes = 'Not now — follow up in March' WHERE id = 1;

-- 11. Export for Excel: run this, then use the "Export" button above the results grid
SELECT q.id, q.created_at, q.name, q.country_code, q.mobile, q.email,
       g.label AS goal, r.label AS monthly_amount, m.label AS contact_by, t.label AS best_time,
       q.language, q.utm_source, q.status, q.notes
FROM enquiries q
JOIN goals g                  ON g.code = q.goal
JOIN contact_methods m        ON m.code = q.contact_method
LEFT JOIN investment_ranges r ON r.code = q.investment_range
LEFT JOIN contact_times t     ON t.code = q.contact_time
ORDER BY q.created_at DESC;
