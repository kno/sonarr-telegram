import client from 'prom-client';

const register = new client.Registry();
client.collectDefaultMetrics({ register });

export const promClientRegistry = register;

export const counters = {
  messagesReceived: new client.Counter({
    name: 'messages_received_total',
    help: 'Total messages received from Telegram/API',
  }),
  messagesEnqueued: new client.Counter({
    name: 'messages_enqueued_total',
    help: 'Total messages enqueued to worker',
  }),
};

register.registerMetric(counters.messagesReceived);
register.registerMetric(counters.messagesEnqueued);

