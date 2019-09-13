import { Joi } from 'celebrate';

import { customJoi } from '../helpers/validate';

export default {
  createNewUser: {
    body: Joi.object({
      address: customJoi
        .web3()
        .address()
        .required(),
      signature: Joi.string().required(),
      data: Joi.object({
        safeAddress: customJoi
          .web3()
          .address()
          .required(),
        username: Joi.string()
          .alphanum()
          .min(3)
          .max(24)
          .required(),
      }).required(),
    }),
  },
};
