import { Joi } from 'celebrate';

export default {
  findNews: {
    query: Joi.object({
      active: Joi.boolean(),
      afterDate: Joi.date(),
    }).or('active', 'date'),
  },
};
