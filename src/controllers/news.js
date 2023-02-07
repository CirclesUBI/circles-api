import News from '../models/news';
import { respondWithSuccess } from '../helpers/responses';


async function resolveBatch(req, res, next) {
  const { username, address } = req.query;

  User.findAll({
    where: {
      active: true,
    },
  })
    .then((response) => {
      respondWithSuccess(res, response);
    })
    .catch((err) => {
      next(err);
    });
}

async function findByDate(req, res, next) {
  const { query } = req.query;

  News.findAll({
    where: {
      date: ..., // TODO (and active==true)
    },
    order: [['date', 'ASC']], // Review
    limit: 10, // Review
  })
    .then((response) => {
      respondWithSuccess(res, response);
    })
    .catch((err) => {
      next(err);
    });
}

export default {

  findNews: async (req, res, next) => {
    if (req.query.date) {
      return await findByDate(req, res, next);
    }

    return await resolveBatch(req, res, next);
  },
};
