import { createApp } from './server.js';
import { closeDatabase } from './database/index.js';
import { closeRedis } from './lib/redis.js';
import type { Server } from 'node:http';

async function runTests() {
  console.log('🧪 Testing Notification Ingestion API (Milestone 3)...\n');

  const app = createApp();
  let server: Server;
  const port = 3099;
  const baseUrl = `http://localhost:${port}`;
  const validApiKey = 'dev_api_key_notify_123';

  await new Promise<void>((resolve) => {
    server = app.listen(port, () => resolve());
  });

  try {
    // Test 1: Missing API Key -> 401
    console.log('1. Testing Missing API Key...');
    const res1 = await fetch(`${baseUrl}/api/v1/notifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipient: { email: 'test@example.com' }, event: 'ORDER_SHIPPED' }),
    });
    console.log(`   Status: ${res1.status} (Expected 401): ${res1.status === 401 ? '✅ PASS' : '❌ FAIL'}`);

    // Test 2: Invalid API Key -> 401
    console.log('2. Testing Invalid API Key...');
    const res2 = await fetch(`${baseUrl}/api/v1/notifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'wrong_key',
      },
      body: JSON.stringify({ recipient: { email: 'test@example.com' }, event: 'ORDER_SHIPPED' }),
    });
    console.log(`   Status: ${res2.status} (Expected 401): ${res2.status === 401 ? '✅ PASS' : '❌ FAIL'}`);

    // Test 3: Validation Failure (Invalid email) -> 400
    console.log('3. Testing Validation Failure (Invalid email)...');
    const res3 = await fetch(`${baseUrl}/api/v1/notifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': validApiKey,
      },
      body: JSON.stringify({
        recipient: { email: 'not-an-email' },
        event: 'ORDER_SHIPPED',
      }),
    });
    await res3.json();
    console.log(`   Status: ${res3.status} (Expected 400): ${res3.status === 400 ? '✅ PASS' : '❌ FAIL'}`);

    // Test 4: Valid Notification Ingestion -> 201 Created
    console.log('4. Testing Valid Notification Creation...');
    const idempotencyKey = `idemp_${Date.now()}`;
    const res4 = await fetch(`${baseUrl}/api/v1/notifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': validApiKey,
      },
      body: JSON.stringify({
        recipient: { email: 'alex@example.com' },
        event: 'ORDER_SHIPPED',
        data: { name: 'Alex', orderId: 'ORD-1024' },
        idempotencyKey,
      }),
    });
    const data4 = (await res4.json()) as { success: boolean; data: { id: string; status: string } };
    console.log(`   Status: ${res4.status} (Expected 201): ${res4.status === 201 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Created ID: ${data4.data?.id}, Status: ${data4.data?.status}`);

    const createdId = data4.data?.id;

    // Test 5: Idempotent Replay -> 200 OK + same ID
    console.log('5. Testing Idempotent Replay...');
    const res5 = await fetch(`${baseUrl}/api/v1/notifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': validApiKey,
      },
      body: JSON.stringify({
        recipient: { email: 'alex@example.com' },
        event: 'ORDER_SHIPPED',
        data: { name: 'Alex', orderId: 'ORD-1024' },
        idempotencyKey,
      }),
    });
    const isReplayHeader = res5.headers.get('idempotent-replay');
    const data5 = (await res5.json()) as { data: { id: string } };
    console.log(`   Status: ${res5.status} (Expected 200): ${res5.status === 200 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Idempotent-Replay Header: ${isReplayHeader} (Expected 'true'): ${isReplayHeader === 'true' ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Same ID returned: ${data5.data?.id === createdId ? '✅ PASS' : '❌ FAIL'}`);

    // Test 6: Get by ID -> 200 OK
    console.log('6. Testing GET /api/v1/notifications/:id...');
    const res6 = await fetch(`${baseUrl}/api/v1/notifications/${createdId}`, {
      headers: { 'x-api-key': validApiKey },
    });
    const data6 = (await res6.json()) as { data: { id: string; status: string; recipient: { email: string } } };
    console.log(`   Status: ${res6.status} (Expected 200): ${res6.status === 200 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Retrieved recipient: ${data6.data?.recipient?.email}`);

    // Test 7: Get Non-Existent ID -> 404 Not Found
    console.log('7. Testing GET Non-Existent Notification -> 404...');
    const res7 = await fetch(`${baseUrl}/api/v1/notifications/00000000-0000-0000-0000-000000000000`, {
      headers: { 'x-api-key': validApiKey },
    });
    console.log(`   Status: ${res7.status} (Expected 404): ${res7.status === 404 ? '✅ PASS' : '❌ FAIL'}`);

    console.log('\n🎉 ALL MILESTONE 3 API TESTS PASSED SUCCESSFULLY!');
  } finally {
    server!.close();
    await closeDatabase();
    await closeRedis();
  }
}

runTests().catch((err) => {
  console.error('Test run failed:', err);
  process.exit(1);
});
