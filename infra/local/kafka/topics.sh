#!/bin/bash
set -e

KAFKA_BROKER="kafka:9092"

echo "Waiting for Kafka port to open..."
until nc -z kafka 9092; do
  echo "  kafka:9092 not ready, waiting 3s..."
  sleep 3
done

echo "Port open. Waiting for Kafka broker to be fully ready..."
until kafka-broker-api-versions --bootstrap-server $KAFKA_BROKER 2>/dev/null; do
  echo "  Broker not ready yet, waiting 5s..."
  sleep 5
done

echo "Kafka ready. Creating topics..."

kafka-topics --create --bootstrap-server $KAFKA_BROKER \
  --topic document.changed --partitions 3 \
  --replication-factor 1 --if-not-exists
echo "✅ document.changed"

kafka-topics --create --bootstrap-server $KAFKA_BROKER \
  --topic document.snapshot --partitions 1 \
  --replication-factor 1 --if-not-exists
echo "✅ document.snapshot"

kafka-topics --create --bootstrap-server $KAFKA_BROKER \
  --topic user.connected --partitions 2 \
  --replication-factor 1 --if-not-exists
echo "✅ user.connected"

kafka-topics --create --bootstrap-server $KAFKA_BROKER \
  --topic user.disconnected --partitions 2 \
  --replication-factor 1 --if-not-exists
echo "✅ user.disconnected"

echo "All topics created successfully"
