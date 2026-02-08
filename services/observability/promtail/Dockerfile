FROM grafana/promtail:latest

# Copy custom config and entrypoint (already executable on host)
COPY services/observability/promtail/promtail-config.yaml /etc/promtail/config.yml
COPY services/observability/promtail/entrypoint.sh /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
