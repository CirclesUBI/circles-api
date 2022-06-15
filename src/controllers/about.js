import httpStatus from 'http-status';
import fastJsonStringify from 'fast-json-stringify';

import APIError from '../helpers/errors';

import { getCurrentEndpoint } from '../services/graph';
import { respondWithSuccess } from '../helpers/responses';

const aboutDict = {
  name: 'Circles API',
  version: 1.6,
  graphEndpoint: getCurrentEndpoint(),
};
const aboutStringify = fastJsonStringify({
  title: 'Circles About Schema',
  type: 'object',
  properties: {
    name: {
      type: 'string',
    },
    version: {
      type: 'string',
    },
    graphEndpoint: {
      type: 'string',
    },
  },
});

export default {
  // aboutGET: function (req, res) {
  //   respondWithSuccess(res, aboutStringify(aboutDict), httpStatus.OK);
  // },
  aboutGET: async (req, res) => {
    respondWithSuccess(res, aboutStringify(aboutDict), httpStatus.OK);
  },
  getGraphEndpoint: async (req, res) => {
    const endpoint = getCurrentEndpoint();
    console.log(endpoint);
    if (endpoint) {
      res.send(endpoint);
    } else {
      throw new APIError(httpStatus.NO_CONTENT);
    }
  },
};
