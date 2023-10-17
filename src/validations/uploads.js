import { Joi } from 'celebrate';

export default {
  deleteAvatarImage: {
    body: Joi.object({
      url: Joi.string()
        .uri({ scheme: ['http', 'https'] })
        .required(),
    }),
  },
};
