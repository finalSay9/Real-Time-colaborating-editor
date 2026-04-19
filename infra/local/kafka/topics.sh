#!/bin/bash

KAFKA_BROKER="kafka:9092"

echo "Waiting for Kafka to be ready..."

# Keep trying until kafka responds
until kafka-broker-api-versions --bootstrap-server $KAFKA_BROKER 2>/dev/null; do
  echo "Kafka not ready yet, retrying in 5s..."
  sleep 5
done

echo "Kafka is ready. Creating topics..."

create_topic() {
  local topic=$1
  local partitions=$2
  kafka-topics --create \
    --bootstrap-server $KAFKA_BROKER \
    --topic $topic \
    --partitions $partitions \
    --replication-factor 1 \
    --if-not-exists
  echo "✅ Created topic: $topic"
}

create_topic "document.changed"   3
create_topic "document.snapshot"  1
create_topic "user.connected"     2
create_topic "user.disconnected"  2

echo "All Kafka topics created successfully"
