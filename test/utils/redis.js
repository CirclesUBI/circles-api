const startLocalRedisServer = async () => {
  const MOCK_SERVER_PORT = 6379;
  try {
    const RedisServer = require('redis-server');
    const server = new RedisServer(MOCK_SERVER_PORT);
    await server.open();
  } catch (e) {
    console.error('unable to start local redis-server', e);
    process.exit(1);
  }
  return 'redis://127.0.0.1:' + MOCK_SERVER_PORT;
};

export const redisUrl = startLocalRedisServer();
