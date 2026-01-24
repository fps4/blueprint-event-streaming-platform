-- create_kafka_table.sql
-- Creates a Kafka engine table that reads from Kafka topic `clickstream_events` and a
-- MergeTree target + materialized view to persist data for queries.

CREATE DATABASE IF NOT EXISTS clickstream;

-- Kafka engine table (consumes from Kafka)
-- Columns aligned with `eventsStaging` model (see clickstream-runner/src/models/eventsStaging.mjs)
-- Note: the kafka topic used is `events_raw` (matches docker-compose and collector)
CREATE TABLE IF NOT EXISTS clickstream.events_kafka
(
    event_id String,
    ctx String,
    -- raw JSON fields from producer
    type String,
    ts UInt64,
    url String,
    ref String,
    ip String,
    route String,
    search String,
    session_id String,
    visitor_id String,
    user_consent String,
    lang String,
    -- keep total_time but default to 0 so missing values don't break parsing
    total_time UInt64,
    received_at DateTime
)
ENGINE = Kafka
SETTINGS kafka_broker_list = 'kafka:9092',
         kafka_topic_list = 'events_raw',
         kafka_group_name = 'clickhouse_group',
         kafka_format = 'JSONEachRow',
         kafka_num_consumers = 1;

-- Persistent table (ReplacingMergeTree) with the same schema plus Kafka metadata columns
-- Using ReplacingMergeTree(received_at) with ORDER BY (event_id) helps reduce duplicates
CREATE TABLE IF NOT EXISTS clickstream.events
(
    event_id String,
    ctx String,
    event_type String,
    -- persist original ts (ms) for traceability
    ts UInt64,
    url String,
    ref String,
    ip String,
    route String,
    search String,
    session_id String,
    visitor_id String,
    user_consent String,
    lang String,
    total_time UInt64,
    received_at DateTime,
    _topic String,
    _partition UInt32,
    _offset UInt64
)
ENGINE = ReplacingMergeTree(received_at)
ORDER BY (event_id);

-- Materialized view that populates the MergeTree table from the Kafka engine
-- prefer top-level session/visitor if present, otherwise extract from nested ctx JSON
CREATE MATERIALIZED VIEW IF NOT EXISTS clickstream.events_mv TO clickstream.events AS
SELECT
    concat(_topic, '-', toString(_partition), '-', toString(_offset)) AS event_id,
    ctx,
    type AS event_type,
    ts,
    url,
    ref,
    ip,
    route,
    search,
    JSONExtractString(ctx, 'session_id') AS session_id,
    JSONExtractString(ctx, 'visitor_id') AS visitor_id,
    JSONExtractString(ctx, 'user_consent') AS user_consent,
    JSONExtractString(ctx, 'lang') AS lang,
    total_time,
    -- convert milliseconds -> seconds for ClickHouse DateTime
    toDateTime(intDiv(ts, 1000)) AS received_at,
    _topic,
    _partition,
    _offset
FROM clickstream.events_kafka;
