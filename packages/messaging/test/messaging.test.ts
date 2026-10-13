// Contract tests of Broker: the in-process implementation always, and RabbitMQ when TEST_RABBITMQ_URL names one
// (docker run --rm -p 5672:5672 rabbitmq:3; TEST_RABBITMQ_URL=amqp://localhost:5672). The two implementations must be
// indistinguishable to a service, which is what lets it switch by configuration (serviceBroker, tested on its own
// below). Each test takes a fresh queue name so the suites never share state.
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { amqpBroker, memoryBroker, serviceBroker, type Broker } from '../src/index.js';

interface Thing { id: string; n: number }
const settle = () => new Promise((r) => setTimeout(r, 50));   // RabbitMQ delivers asynchronously over the network

function contract(label: string, open: () => Promise<Broker>, skip: string | false) {
  describe(label, { skip }, () => {
    let broker: Broker;
    let seq = 0;
    const queue = (name: string) => `${label}.${name}.${++seq}`;
    before(async () => { broker = await open(); });
    after(async () => { await broker.close(); });

    test('consume() then publish(): the handler receives the message', async () => {
      const q = queue('one');
      const received: Thing[] = [];
      await broker.consume<Thing>(q, async (m) => { received.push(m); });
      await broker.publish(q, { id: 't1', n: 1 });
      await settle();
      assert.deepEqual(received, [{ id: 't1', n: 1 }]);
    });

    test('several messages arrive in order', async () => {
      const q = queue('order');
      const received: number[] = [];
      await broker.consume<Thing>(q, async (m) => { received.push(m.n); });
      await broker.publish(q, { id: 'a', n: 1 });
      await broker.publish(q, { id: 'b', n: 2 });
      await broker.publish(q, { id: 'c', n: 3 });
      await settle();
      assert.deepEqual(received, [1, 2, 3]);
    });

    test('publish() before a consumer exists: the message has nowhere to go, dropped', async () => {
      const q = queue('nobody-home');
      await broker.publish(q, { id: 'gone', n: 0 });
      const received: Thing[] = [];
      await broker.consume<Thing>(q, async (m) => { received.push(m); });
      await settle();
      assert.deepEqual(received, []);
    });
  });
}

contract('in process', async () => memoryBroker(), false);

const URL = process.env.TEST_RABBITMQ_URL;
contract('RabbitMQ', () => amqpBroker(URL as string), URL ? false : 'set TEST_RABBITMQ_URL to a RabbitMQ to run this suite');

describe('serviceBroker', () => {
  test('starts in process and connect() without configuration keeps it there', async () => {
    delete process.env.EXAMPLE_RABBITMQ_URL; delete process.env.RABBITMQ_URL;
    const s = serviceBroker('example');
    await s.connect();
    assert.equal(s.kind(), 'memory');
    const received: Thing[] = [];
    await s.consume<Thing>('svc.one', async (m) => { received.push(m); });
    await s.publish('svc.one', { id: 't1', n: 1 });
    await settle();
    assert.deepEqual(received, [{ id: 't1', n: 1 }]);
  });

  test('two services in the same process share the in-process broker (the monolith, ADR-14)', async () => {
    delete process.env.RABBITMQ_URL;
    const publisher = serviceBroker('booking'), consumer = serviceBroker('notification');
    await publisher.connect(); await consumer.connect();
    const received: Thing[] = [];
    await consumer.consume<Thing>('svc.shared', async (m) => { received.push(m); });
    await publisher.publish('svc.shared', { id: 't1', n: 1 });
    await settle();
    assert.deepEqual(received, [{ id: 't1', n: 1 }]);
  });

  test('connect() to RabbitMQ switches the implementation, close() goes back to in process', { skip: URL ? false : 'set TEST_RABBITMQ_URL' }, async () => {
    const s = serviceBroker('example');
    await s.connect(URL);
    assert.equal(s.kind(), 'rabbitmq');
    await s.close();
    assert.equal(s.kind(), 'memory');
  });
});
