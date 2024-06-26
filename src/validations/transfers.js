import { Joi } from 'celebrate';

import { customJoi } from '../helpers/validate';

export default {
  createNewTransfer: {
    body: Joi.object({
      address: customJoi.web3().address().addressChecksum().required(),
      signature: Joi.string().length(132).required(),
      data: Joi.object({
        from: customJoi.web3().address().addressChecksum().required(),
        paymentNote: Joi.string().max(100).empty(''),
        to: customJoi.web3().address().addressChecksum().required(),
        transactionHash: customJoi.web3().transactionHash().required(),
      }).required(),
    }),
  },
  getByTransactionHash: {
    params: {
      transactionHash: customJoi.web3().transactionHash().required(),
    },
    body: Joi.object({
      address: customJoi.web3().address().addressChecksum().required(),
      signature: Joi.string().length(132).required(),
    }),
  },
  findTransferSteps: {
    body: Joi.object({
      from: customJoi.web3().address().addressChecksum().required(),
      to: customJoi.web3().address().addressChecksum().required(),
      value: Joi.string()
        .pattern(/^[0-9]+$/, { name: 'numbers' })
        .required(),
      hops: Joi.number().integer().min(1).max(100).allow(null),
    }),
  },
};
