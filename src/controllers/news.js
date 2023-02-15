import { Op } from 'sequelize';

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
  const { isActive, limit, offset } = req.query;

  News.findAll({
    where: {
      isActive: isActive,
    },
    order: [['date', 'DESC']],
    limit: limit,
    offset: offset,
  })
    .then((response) => {
      respondWithSuccess(res, response.map(prepareNewsResult));
    })
    .catch((err) => {
      next(err);
    });
}

async function findByDate(req, res, next) {
  const { isActive, afterDate, limit, offset } = req.query;

  News.findAll({
    where: {
      isActive: isActive,
      date: { [Op.gte]: new Date(afterDate) },
    },
    order: [['date', 'DESC']],
    limit: limit,
    offset: offset,
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
    if (req.query.afterDate) {
      return await findByDate(req, res, next);
    }
    return await resolveBatch(req, res, next);
  },
};
