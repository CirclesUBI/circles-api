import request from 'supertest';

import app from '~';

describe('API /users', () => {
  describe('PUT /users', () => {
    it('should return an error on invalid body', async () => {
      const body = {
        address: 'invalid',
      };

      await request(app)
        .put('/api/users')
        .send(body)
        .set('Accept', 'application/json')
        .expect(400);
    });
  });
});
