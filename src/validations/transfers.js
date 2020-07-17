import { Joi } from 'celebrate';

import { customJoi } from '../helpers/validate';

export default {
  findTransferSteps: {
    body: Joi.object({
      from: customJoi.web3().address().addressChecksum().required(),
      to: customJoi.web3().address().addressChecksum().required(),
      value: Joi.number().positive().required(),
    }),
  },
};
