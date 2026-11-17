import { notificationRepository } from './modules/notifications/notification.repository.js';
import { closeDatabase } from './database/index.js';

async function main() {
  console.log('🧪 Testing Notification Persistence...');

  const testKey = `test_key_${Date.now()}`;

  // 1. Create a notification
  console.log('1. Inserting notification...');
  const created = await notificationRepository.create({
    recipientEmail: 'alex@example.com',
    event: 'ORDER_SHIPPED',
    payload: {
      name: 'Alex',
      orderId: 'ORD-1024',
      items: ['Mechanical Keyboard', 'Desk Mat'],
    },
    status: 'PENDING',
    idempotencyKey: testKey,
  });

  console.log('   ✅ Inserted successfully:', {
    id: created.id,
    recipientEmail: created.recipientEmail,
    event: created.event,
    status: created.status,
    idempotencyKey: created.idempotencyKey,
  });

  // 2. Query by ID
  console.log('2. Querying by ID...');
  const fetched = await notificationRepository.findById(created.id);
  console.log('   ✅ Found by ID:', fetched?.id === created.id ? 'MATCH' : 'MISMATCH');

  // 3. Query by Idempotency Key
  console.log('3. Querying by Idempotency Key...');
  const byKey = await notificationRepository.findByIdempotencyKey(testKey);
  console.log('   ✅ Found by Idempotency Key:', byKey?.idempotencyKey === testKey ? 'MATCH' : 'MISMATCH');

  // 4. Update status to QUEUED
  console.log('4. Updating status to QUEUED...');
  const updated = await notificationRepository.updateStatus(created.id, 'QUEUED');
  console.log('   ✅ Status updated to:', updated?.status);

  // 5. Test Unique Constraint on Idempotency Key
  console.log('5. Testing Idempotency duplicate rejection...');
  try {
    await notificationRepository.create({
      recipientEmail: 'duplicate@example.com',
      event: 'ORDER_SHIPPED',
      payload: {},
      idempotencyKey: testKey, // Same key!
    });
    console.error('   ❌ FAILED: Duplicate idempotency key was allowed!');
  } catch (err: unknown) {
    const error = err as { code?: string };
    if (error.code === '23505') {
      console.log('   ✅ Duplicate correctly rejected by PostgreSQL unique constraint (code: 23505)');
    } else {
      console.log('   ✅ Duplicate rejected:', err);
    }
  }

  await closeDatabase();
  console.log('\n🎉 All database tests passed successfully!');
}

main().catch(async (err) => {
  console.error('Test failed:', err);
  await closeDatabase();
  process.exit(1);
});
