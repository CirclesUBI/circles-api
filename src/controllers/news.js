import News from '../models/news';
import { respondWithSuccess } from '../helpers/responses';

function prepareNewsResult(response) {
  return {
    iconId: response.iconId,
    message: {
      en: response.message_en,
    },
    date: response.date,
  };
}

async function resolveBatch(req, res, next) {
  const { active, limit, offset } = req.query;

  News.findAll({
    where: {
      active: active || true ,
    },
    order: [['date', 'DESC']],
    limit: limit || 10,
    offset: offset || 0,
  })
    .then((response) => {
      respondWithSuccess(res, response.map(prepareNewsResult));
    })
    .catch((err) => {
      next(err);
    });
}

async function findByDate(req, res, next) {
  const { active, afterDate, limit, offset } = req.query;

  News.findAll({
    where: {
      active: active || true ,
      date: { [Op.gte]: afterDate },
    },
    order: [['date', 'DESC']],
    limit: limit || 10,
    offset: offset || 0,
  })
    .then((response) => {
      respondWithSuccess(res, response.map(prepareNewsResult));
    })
    .catch((err) => {
      next(err);
    });
}

export default {

  findNews: async (req, res, next) => {
    if (req.query.query) {
      return await findByDate(req, res, next);
    }
    return await resolveBatch(req, res, next);
  },
};
