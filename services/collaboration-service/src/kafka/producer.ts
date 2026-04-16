import { Kafka, Producer } from 'kafkajs'
import { KafkaEvent } from '@collab/shared-types'
import { createLogger } from '@collab/logger'

const logger = createLogger('collab-kafka')

const kafka = new Kafka({
  clientId: 'collaboration-service',
  brokers: (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(','),
  retry: {
    initialRetryTime: 300,
    retries: 8,
  },
})

let producer: Producer

export async function connectProducer() {
  producer = kafka.producer({
    // Wait for all replicas to acknowledge — safer than fire-and-forget
    allowAutoTopicCreation: false,
  })
  await producer.connect()
  logger.info('Kafka producer connected')
}

export async function publishEvent(event: KafkaEvent) {
  if (!producer) throw new Error('Producer not connected')

  await producer.send({
    topic: event.type,           // topic name matches event type string
    messages: [
      {
        // Partition by documentId so all events for one document
        // go to the same partition — guarantees ordering per document
        key: (event as any).documentId,
        value: JSON.stringify(event),
        timestamp: Date.now().toString(),
      },
    ],
  })
}

export async function disconnectProducer() {
  await producer?.disconnect()
}