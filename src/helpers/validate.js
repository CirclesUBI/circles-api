import { celebrate, Joi } from 'celebrate';

import web3 from '../services/web3';

export const customJoi = Joi.extend(joi => {
  return {
    type: 'web3',
    base: joi.string(),
    messages: {
      'web3.address': 'is invalid Ethereum address',
      'web3.addressChecksum': 'is invalid address checksum',
    },
    rules: {
      address: {
        validate(schema, value, state, options) {
          if (!value || !web3.utils.isAddress(value)) {
            return this.createError('web3.address', {}, state, options);
          }

          return value;
        },
      },
      addressChecksum: {
        validate(schema, value, state, options) {
          if (!value || !web3.utils.checkAddressChecksum(value)) {
            return this.createError('web3.addressChecksum', {}, state, options);
          }

          return value;
        },
      },
    },
  };
});

export default function validate(schema) {
  const joiOptions = {
    abortEarly: false,
  };

  return celebrate(schema, joiOptions);
}
