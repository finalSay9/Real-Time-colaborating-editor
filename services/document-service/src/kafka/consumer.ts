import { Kafka } from 'kafkajs'
import { DocumentChangedEvent } from '@collab/shared-types'
import { createLogger } from '@collab/logger'
import { saveSnapshot, getLatestSnapshot } from '../db/documentRepository'

const logger = createLogger('document-kafka')

const kafka = new Kafka({
  clientId: 'document-service',
  brokers: (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(','),
})

export async function startConsumer() {
  const consumer = kafka.consumer({
    groupId: 'document-service-group',
  })

  await consumer.connect()
  await consumer.subscribe({
    topic: 'document.changed',
    fromBeginning: false,
  })

  await consumer.run({
    // Process one message at a time per partition —
    // guarantees ordering for the same document
    eachMessage: async ({ message }) => {
      if (!message.value) return

      try {
        const event = JSON.parse(
          message.value.toString()
        ) as DocumentChangedEvent

        logger.info(
          { documentId: event.documentId, bytes: event.updateSize },
          'Received document.changed event'
        )

        // Get the latest version number and increment
        const latest = await getLatestSnapshot(event.documentId)
        const nextVersion = (latest?.version ?? 0) + 1

        // In a full implementation, the collab service would
        // send the actual Yjs state via a REST call here.
        // For now we record the event for the audit trail.
        await saveSnapshot(
          event.documentId,
          Buffer.from(JSON.stringify({ snapshotAt: event.timestamp })),
          nextVersion
        )

        logger.info(
          { documentId: event.documentId, version: nextVersion },
          'Snapshot saved'
        )
      } catch (err) {
        logger.error(err, 'Failed to process document.changed event')
        // Don't rethrow — let Kafka move to the next message.
        // A dead-letter queue would handle persistent failures
        // in a production system.
      }
    },
  })

  logger.info('Document service Kafka consumer started')
}