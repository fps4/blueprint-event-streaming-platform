FROM clickhouse/clickhouse-server:latest

# Copy any custom ClickHouse config fragments (config.d) into the image
# This allows us to bake the <listen_host> override into the server image
COPY config.d/ /etc/clickhouse-server/config.d/

# Ensure permissions (image runs as root during build; runtime uses clickhouse user)
RUN chown -R clickhouse:clickhouse /etc/clickhouse-server/config.d || true

# Expose common ClickHouse ports (for documentation — docker-compose already maps them)
EXPOSE 8123 9000 9009

# Use default entrypoint from base image

LABEL org.opencontainers.image.title="fps4/clickhouse-server-local"
LABEL org.opencontainers.image.description="Local ClickHouse server image with baked-in config.d fragments for fps-service-delivery-hub"

ARG CLICKHOUSE_USER
ARG CLICKHOUSE_PASSWORD
ARG CLICKHOUSE_DB

# Document defaults — these can be overridden by docker-compose or runtime env
ENV CLICKHOUSE_USER=$CLICKHOUSE_USER
ENV CLICKHOUSE_PASSWORD=$CLICKHOUSE_PASSWORD
ENV CLICKHOUSE_DB=$CLICKHOUSE_DB
