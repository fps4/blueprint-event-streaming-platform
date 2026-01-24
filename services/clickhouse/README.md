# run DETACH
docker compose exec -it clickhouse bash -c "clickhouse-client --query=\"DETACH TABLE clickstream.events_kafka;\""

# run ATTACH
docker compose exec -it clickhouse bash -c "clickhouse-client --query=\"ATTACH TABLE clickstream.events_kafka;\""


# Run Multiquery
docker compose exec -it clickhouse bash -c 

clickhouse-client --multiquery -q "DROP VIEW IF EXISTS clickstream.events_mv;
DROP TABLE IF EXISTS clickstream.events;
DROP TABLE IF EXISTS clickstream.events_kafka;"

clickhouse-client --host clickhouse --user "$CH_USER" --password "$CH_PASS" --database "$CH_DB" --multiquery < "$f"

# Get events from kafka topic
docker compose exec -it kafka bash -c 'kafka-console-consumer.sh --bootstrap-server kafka:9092 --topic events_raw --from-beginning  --max-messages 10'


