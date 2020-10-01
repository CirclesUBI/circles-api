import { celebrate, Joi } from 'celebrate';

import web3 from '../services/web3';

export const customJoi = Joi.extend((joi) => {
  return {
    type: 'web3',
    base: joi.string(),
    messages: {
      'web3.address': 'is invalid Ethereum address',
      'web3.addressChecksum': 'is invalid address checksum',
      'web3.transactionHash': 'is invalid transaction hash',
    },
    rules: {
      transactionHash: {
        validate(value, helpers) {
          if (!/^0x([A-Fa-f0-9]{64})$/.test(value)) {
            return helpers.error('web3.transactionHash');
          }

          return value;
        },
      },
      address: {
        validate(value, helpers) {
          if (!value || !web3.utils.isAddress(value)) {
            return helpers.error('web3.address');
          }

          return value;
        },
      },
      addressChecksum: {
        validate(value, helpers) {
          if (!value || !web3.utils.checkAddressChecksum(value)) {
            return helpers.error('web3.addressChecksum');
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
