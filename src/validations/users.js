import { Joi } from 'celebrate';

import { customJoi } from '../helpers/validate';

const defaultUserBody = Joi.object({
  address: customJoi.web3().address().addressChecksum().required(),
  nonce: Joi.number().min(0).integer(),
  signature: Joi.string().length(132).required(),
  data: Joi.object({
    safeAddress: customJoi.web3().address().addressChecksum().required(),
    username: Joi.string().alphanum().min(3).max(24).required(),
    email: Joi.string().email().required(''),
    avatarUrl: Joi.string().uri().empty(''),
  }).required(),
});

export default {
  dryRunCreateNewUser: {
    body: Joi.object({
      avatarUrl: Joi.string().uri().empty(''),
      email: Joi.string().email().empty(''),
      username: Joi.string().alphanum().min(3).max(24).empty(''),
    }),
  },
  createNewUser: {
    body: defaultUserBody,
  },
  updateUser: {
    body: defaultUserBody,
    params: {
      safeAddress: customJoi.web3().address().addressChecksum(),
    },
  },
  getByUsername: {
    params: {
      username: Joi.string().required(),
    },
  },
  findUsers: {
    query: Joi.object({
      username: Joi.array().items(Joi.string().alphanum()),
      address: Joi.array().items(customJoi.web3().address().addressChecksum()),
      query: Joi.string().max(256),
    }).or('username', 'address', 'query'),
  },
};
