import httpStatus from 'http-status';
import request from 'supertest';

import News from '~/models/news';
import app from '~';

const NUM_TEST_NEWS = 5;

let news = [];

beforeAll(async () => {
  news = await Promise.all(
    new Array(NUM_TEST_NEWS).fill(0).map((_, index) =>
      News.create({
        message_en: `Message ${index + 1}`,
        date: new Date(`2015-03-${10 + index}T12:00:00Z`).toISOString(),
        iconId: index + 1,
        isActive: index !== 2, // Only one news in inactive
        title_en: `Title ${index + 1}`,
      }),
    ),
  ).then((result) =>
    result.map(
      ({
        dataValues: { date, iconId, id, isActive, message_en, title_en },
      }) => ({
        date,
        iconId,
        id,
        isActive,
        message_en,
        title_en,
      }),
    ),
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
  it('should return the correct response format', () =>
    request(app)
      .get('/api/news')
      .set('Accept', 'application/json')
      .expect(httpStatus.OK)
      .expect(({ body: { data } }) =>
        data.forEach((obj) => {
          expect(obj).toHaveProperty('id');
          expect(obj).toHaveProperty('date');
          expect(obj).toHaveProperty('iconId');
          expect(obj).toHaveProperty('isActive');
          expect(obj).toHaveProperty('createdAt');
          expect(obj).toHaveProperty('updatedAt');
          expect(obj).toHaveProperty('title.en');
          expect(obj).toHaveProperty('message.en');
        }),
      ));

  it('should return active news by default', async () => {
    await request(app)
      .get('/api/news')
      .set('Accept', 'application/json')
      .expect(httpStatus.OK)
      .expect(({ body }) => {
        if (body.data.length !== NUM_TEST_NEWS - 1) {
          throw new Error('Did not return all expected entries');
        }
      });
  });

  it('should return all matching news ordered by the most recent first (last row in the table)', async () => {
    await request(app)
      .get(`/api/news/?afterDate=${news[2].date}`)
      .set('Accept', 'application/json')
      .expect(httpStatus.OK)
      .expect(({ body }) => {
        if (
          body.data.length !== 2 ||
          body.data[0].message.en !== news[4].message_en ||
          body.data[0].iconId !== news[4].iconId ||
          body.data[0].title.en !== news[4].title_en
        ) {
          throw new Error('Did not return expected entries');
        }
      });
  });

  it('should return all matching news with pagination', async () => {
    await request(app)
      .get(`/api/news/?afterDate=${news[1].date}&limit=1&offset=1`)
      .set('Accept', 'application/json')
      .expect(httpStatus.OK)
      .expect(({ body }) => {
        if (body.data.length !== 1 || body.data[0].iconId !== news[3].iconId) {
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

  it('should return inactive news when asking for inactive news', async () => {
    await request(app)
      .get('/api/news/?isActive=false')
      .set('Accept', 'application/json')
      .expect(httpStatus.OK)
      .expect(({ body }) => {
        if (body.data.length !== 1 || body.data[0].isActive !== false) {
          throw new Error('Invalid entries found');
        }
      });
  });

  it('should return active news when asking for active news', async () => {
    await request(app)
      .get('/api/news/?isActive=true')
      .set('Accept', 'application/json')
      .expect(httpStatus.OK)
      .expect(({ body }) => {
        if (
          body.data.length !== NUM_TEST_NEWS - 1 ||
          body.data[0].isActive !== true
        ) {
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
