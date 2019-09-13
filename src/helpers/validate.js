import { celebrate, Joi } from 'celebrate';

import web3 from '../services/web3';

export const customJoi = Joi.extend(joi => {
  return {
    name: 'web3',
    base: joi.string(),
    language: {
      address: 'is invalid Ethereum address',
    },
    rules: [
      {
        name: 'address',
        validate(schema, value, state, options) {
          if (!web3.utils.isAddress(value)) {
            return this.createError('web3.address', {}, state, options);
          }

          return value;
        },
      },
    ],
  };
});

export default function validate(schema) {
  const joiOptions = {
    abortEarly: false,
  };

  return celebrate(schema, joiOptions);
}
