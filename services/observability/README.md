# Kafka → Prometheus → Grafana

**Best for:**

* Broker health
* Throughput (messages/sec, bytes/sec)
* Consumer lag
* Partitions, ISR, under-replication

### Components

| Component        | Role                             |
| ---------------- | -------------------------------- |
| **Kafka JMX**    | Exposes JVM & Kafka metrics      |
| **JMX Exporter** | Converts JMX → Prometheus format |
| **Prometheus**   | Scrapes & stores metrics         |
| **Grafana**      | Visualizes                       |

### Setup (Docker-friendly)

**1. Add JMX Exporter to Kafka**

```yaml
KAFKA_OPTS: >
  -javaagent:/opt/jmx_exporter/jmx_prometheus_javaagent.jar=7071:/opt/jmx_exporter/kafka.yml
```

**2. Prometheus scrape config**

```yaml
scrape_configs:
  - job_name: kafka
    static_configs:
      - targets: ['kafka:7071']
```

**3. Grafana**

* Add Prometheus as datasource
* Import ready dashboards:

  * **ID 721** – Kafka Overview
  * **ID 7589** – Kafka Consumer Lag

