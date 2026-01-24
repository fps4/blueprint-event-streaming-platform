-- create_5m_agg_table.sql
-- Creates 5-minute aggregation state tables and materialized views that
-- continuously populate aggregate states from `clickstream.events`.
-- Two aggregation flows are created:
-- 1) agg_page_view_5m_state  - uniques and session counts for page_view events
-- 2) agg_time_on_page_5m_state - summed total_time for time_on_page events
--
-- The state tables use AggregatingMergeTree and store aggregate function states.
-- A read-only VIEW is provided for each state table which finalizes the
-- aggregate states into numeric values using the appropriate *Merge functions.
--
CREATE DATABASE IF NOT EXISTS clickstream;

/* -------------------------------------------------------------------------- */
/* 1) Page view aggregates (5m) - store AggregateFunction states                 */
/* -------------------------------------------------------------------------- */
CREATE TABLE IF NOT EXISTS clickstream.agg_page_view_5m_state
(
	bucket DateTime,
	ref LowCardinality(String),
	ip LowCardinality(String),
	route LowCardinality(String),
	visitor_id LowCardinality(String),
	i18next LowCardinality(String),
	user_consent LowCardinality(String),
	user_agent LowCardinality(String),
	lang LowCardinality(String),
	uniques AggregateFunction(uniqExact, String),
	num_of_sessions AggregateFunction(uniqExact, String)
)
ENGINE = AggregatingMergeTree()
ORDER BY (bucket, ref, ip, route, visitor_id, i18next, user_consent, user_agent, lang);

-- Materialized view that computes states from incoming events and inserts into the state table
CREATE MATERIALIZED VIEW IF NOT EXISTS clickstream.agg_page_view_5m_state_mv
TO clickstream.agg_page_view_5m_state
AS
SELECT
	toStartOfFiveMinute(received_at) AS bucket,
	toLowCardinality(ref) AS ref,
	toLowCardinality(ip) AS ip,
	toLowCardinality(route) AS route,
	toLowCardinality(visitor_id) AS visitor_id,
	toLowCardinality(JSONExtractString(ctx, 'i18next')) AS i18next,
	toLowCardinality(user_consent) AS user_consent,
	toLowCardinality(JSONExtractString(ctx, 'ua')) AS user_agent,
	toLowCardinality(lang) AS lang,
	-- store uniq states; coalesce to empty string to avoid NULL states
	uniqExactState(coalesce(visitor_id, session_id, '')) AS uniques,
	uniqExactState(coalesce(session_id, '')) AS num_of_sessions
FROM clickstream.events
WHERE event_type = 'page_view'
GROUP BY bucket, ref, ip, route, visitor_id, i18next, user_consent, user_agent, lang;

-- A convenience view that finalizes aggregate states into numeric results
CREATE OR REPLACE VIEW clickstream.agg_page_view_5m AS
SELECT
	bucket,
	ref,
	ip,
	route,
	visitor_id,
	i18next,
	user_consent,
	user_agent,
	lang,
	uniqExactMerge(uniques) AS uniques,
	uniqExactMerge(num_of_sessions) AS num_of_sessions
FROM clickstream.agg_page_view_5m_state
GROUP BY bucket, ref, ip, route, visitor_id, i18next, user_consent, user_agent, lang
ORDER BY bucket;

/* -------------------------------------------------------------------------- */
/* 2) Time-on-page aggregates (5m) - store sum states                         */
/* -------------------------------------------------------------------------- */
CREATE TABLE IF NOT EXISTS clickstream.agg_time_on_page_5m_state
(
	bucket DateTime,
	ref LowCardinality(String),
	ip LowCardinality(String),
	route LowCardinality(String),
	session_id LowCardinality(String),
	visitor_id LowCardinality(String),
	i18next LowCardinality(String),
	user_consent LowCardinality(String),
	user_agent LowCardinality(String),
	lang LowCardinality(String),
	total_time AggregateFunction(sum, UInt64)
)
ENGINE = AggregatingMergeTree()
ORDER BY (bucket, ref, ip, route, session_id, visitor_id, i18next, user_consent, user_agent, lang);

CREATE MATERIALIZED VIEW IF NOT EXISTS clickstream.agg_time_on_page_5m_state_mv
TO clickstream.agg_time_on_page_5m_state
AS
SELECT
	toStartOfFiveMinute(received_at) AS bucket,
	toLowCardinality(ref) AS ref,
	toLowCardinality(ip) AS ip,
	toLowCardinality(route) AS route,
	toLowCardinality(session_id) AS session_id,
	toLowCardinality(visitor_id) AS visitor_id,
	toLowCardinality(JSONExtractString(ctx, 'i18next')) AS i18next,
	toLowCardinality(user_consent) AS user_consent,
	toLowCardinality(JSONExtractString(ctx, 'ua')) AS user_agent,
	toLowCardinality(lang) AS lang,
	sumState(total_time) AS total_time
FROM clickstream.events
WHERE event_type = 'time_on_page'
GROUP BY bucket, ref, ip, route, session_id, visitor_id, i18next, user_consent, user_agent, lang;

-- Convenience view to finalize summed total_time
CREATE OR REPLACE VIEW clickstream.agg_time_on_page_5m AS
SELECT
	bucket,
	ref,
	ip,
	route,
	session_id,
	visitor_id,
	i18next,
	user_consent,
	user_agent,
	lang,
	sumMerge(total_time) AS total_time
FROM clickstream.agg_time_on_page_5m_state
GROUP BY bucket, ref, ip, route, session_id, visitor_id, i18next, user_consent, user_agent, lang
ORDER BY bucket;

