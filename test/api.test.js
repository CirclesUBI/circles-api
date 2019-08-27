import request from 'supertest';

import app from '~';

describe('API', () => {
  describe('GET /api', () => {
    it('should respond with a successful message', async () => {
      await request(app)
        .get('/api')
        .expect(200, {
          status: 'ok',
        });
    });
  });
});
