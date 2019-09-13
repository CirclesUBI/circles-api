import { respondWithSuccess } from '../helpers/responses';

function createNewUser(req, res) {
  // eslint-disable-next-line no-unused-vars
  const { address, signature, data } = req.body;

  respondWithSuccess(res);
}

export default {
  createNewUser,
};
