import { Joi } from 'celebrate';

export default {
  findNews: {
    query: Joi.object({
      active: Joi.boolean(),
      afterDate: Joi.date(),
      limit: Joi.number().integer(),
      offset: Joi.number().integer(),
    }).or('active', 'afterDate', 'limit', 'offset'),
  },
};
