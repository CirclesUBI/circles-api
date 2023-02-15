import { Joi } from 'celebrate';

export default {
  findNews: {
    query: Joi.object({
      isActive: Joi.boolean().default(true),
      afterDate: Joi.date(),
      limit: Joi.number().integer().default(10),
      offset: Joi.number().integer().default(0),
    }),
  },
};
