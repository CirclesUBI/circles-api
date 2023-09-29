import httpStatus from 'http-status';
import request from 'supertest';
import app from '~';
import { AWS_S3_DOMAIN } from '~/services/aws';
import { KEY_PATH } from '~/controllers/uploads';

async function expectErrorStatus(body, status = httpStatus.BAD_REQUEST) {
  return await request(app)
    .delete('/api/uploads/avatar')
    .send(body)
    .expect(status);
}

describe('AWS', () => {
  describe('delete object with validation', () => {
    it('validate uri', async () => {
      const bucket = process.env.AWS_S3_BUCKET;
      // Missing fields
      await expectErrorStatus({});
      // Wrong fields
      await expectErrorStatus({
        name: 'kaka',
      });
      // Empty url
      await expectErrorStatus({
        url: '',
      });
      // Null url
      await expectErrorStatus({
        url: null,
      });
      // Invalid uri protocol
      await expectErrorStatus({
        url: 'git://miau.com',
      });
      // Invalid uri domain
      await expectErrorStatus({
        url: `https://${bucket}.s3.amazonaws.miau/${KEY_PATH}kaka.jpg`,
      });
      // Invalid pathname
      await expectErrorStatus({
        url: `https://${bucket}.${AWS_S3_DOMAIN}/downloads/avatars/kaka.jpg`,
      });
    });
  });
});
