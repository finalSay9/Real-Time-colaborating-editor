#!/bin/bash
# This script runs once on startup to create all required Kafka topics.
# Without this, services would fail trying to publish to non-existent topics.

KAFKA_BROKER="kafka:9092"

echo "Waiting for Kafka to be ready..."
sleep 5

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

# More partitions = more parallelism for high-traffic topics
create_topic "document.changed"   3
create_topic "document.snapshot"  1
create_topic "user.connected"     2
create_topic "user.disconnected"  2

echo "All Kafka topics created successfully"