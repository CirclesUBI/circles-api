import httpStatus from 'http-status';
import request from 'supertest';

import News from '~/models/news';
import app from '~';

const NUM_TEST_NEWS = 5;

const news = [];

beforeAll(async () => {
  const items = new Array(NUM_TEST_NEWS).fill(0);

  await Promise.all(
    items.map(async (item, index) => {
      const message_en = `Message ${index + 1}`;
      const date = new Date(`2015-03-${10 + index}T12:00:00Z`);
      const iconId = index + 1;

      const newsInstance = await News.create({
        message_en,
        date: date.toISOString(),
        iconId,
      });

      news.push({
        id: newsInstance.dataValues.id,
        message_en,
        iconId,
        date: date.toISOString(),
      });
    }),
  );
});

afterAll(async () => {
  await Promise.all(
    news.map(async (newsItem) => {
      return await News.destroy({
        where: {
          message_en: newsItem.message_en,
        },
      });
    }),
  );
});

describe('GET /news/?afterDate=... - Search via date', () => {
  it('should return all news', async () => {
    await request(app)
      .get('/api/news')
      .set('Accept', 'application/json')
      .expect(httpStatus.OK)
      .expect(({ body }) => {
        if (body.data.length !== NUM_TEST_NEWS) {
          throw new Error('Did not return all expected entries');
        }
      });
  });

  it('should return all matching news ordered by the most recent first', async () => {
    await request(app)
      .get(`/api/news/?afterDate=${news[3].date}`)
      .set('Accept', 'application/json')
      .expect(httpStatus.OK)
      .expect(({ body }) => {
        if (
          body.data.length !== 2 ||
          body.data[0].message.en !== news[4].message_en ||
          body.data[0].iconId !== news[4].iconId
        ) {
          throw new Error('Did not return expected entries');
        }
      });
  });

  it('should return all matching news with pagination', async () => {
    await request(app)
      .get(`/api/news/?afterDate=${news[1].date}&limit=2&offset=1`)
      .set('Accept', 'application/json')
      .expect(httpStatus.OK)
      .expect(({ body }) => {
        if (
          body.data.length !== 2 ||
          body.data[0].message.en !== news[3].message_en ||
          body.data[0].iconId !== news[3].iconId
        ) {
          throw new Error('Did not return expected entries');
        }
      });
  });

  it('should fail silently when no items were found', async () => {
    await request(app)
      .get(`/api/news/?afterDate=${new Date()}`)
      .set('Accept', 'application/json')
      .expect(httpStatus.OK)
      .expect(({ body }) => {
        if (body.data.length !== 0) {
          throw new Error('Invalid entries found');
        }
      });
  });

  it('should fail silently when no items were found (because no inactive users)', async () => {
    await request(app)
      .get('/api/news/?isActive=false')
      .set('Accept', 'application/json')
      .expect(httpStatus.OK)
      .expect(({ body }) => {
        if (body.data.length !== 0) {
          throw new Error('Invalid entries found');
        }
      });
  });

  it('should return all news when asking for active news', async () => {
    await request(app)
      .get('/api/news/?isActive=true')
      .set('Accept', 'application/json')
      .expect(httpStatus.OK)
      .expect(({ body }) => {
        if (body.data.length !== NUM_TEST_NEWS) {
          throw new Error('Did not return all expected entries');
        }
      });
  });

  it('should fail when afterDate contains invalid date format', async () => {
    await request(app)
      .get('/api/news/?afterDate=lala')
      .set('Accept', 'application/json')
      .expect(httpStatus.BAD_REQUEST);
  });

  it('should fail when afterDate is empty', async () => {
    await request(app)
      .get('/api/news/?afterDate=')
      .set('Accept', 'application/json')
      .expect(httpStatus.BAD_REQUEST);
  });
});
