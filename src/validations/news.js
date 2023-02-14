import { Joi } from 'celebrate';

export default {
  findNews: {
    query: Joi.object({
      isActive: Joi.boolean(),
      afterDate: Joi.date(),
      limit: Joi.number().integer(),
      offset: Joi.number().integer(),
    }),
  },
};
