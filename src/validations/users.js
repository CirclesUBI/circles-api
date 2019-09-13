import { Joi } from 'celebrate';

import { customJoi } from '../helpers/validate';

export default {
  createNewUser: {
    body: Joi.object({
      address: customJoi
        .web3()
        .address()
        .required(),
      nonce: Joi.number()
        .min(0)
        .integer(),
      signature: Joi.string()
        .length(132)
        .required(),
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
