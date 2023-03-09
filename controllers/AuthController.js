import { v4 as uuidv4 } from 'uuid';
import BasicAuth from '../utils/basic_auth';
import redisClient from '../utils/redis';

class AuthController {
  static async getConnect(request, response) {
    const header = BasicAuth.authHeader(request);
    const b64 = BasicAuth.extractBaseAuthHdr(header);
    const db64 = BasicAuth.decodeAuthHeader(b64);
    const cred = BasicAuth.extractUserCred(db64);
    const usr = await BasicAuth.userObjFromCred(cred[0], cred[1]);

    if (!usr) {
      response.status(401).send({ error: 'Unauthorized' });
      return;
    }

    const uID = uuidv4();
    const key = `auth_${uID}`;
    await redisClient.set(key, usr._id.toString(), 24 * 60 * 60);

    response.status(200).send({
      token: uID,
    });
  }

  static async getDisconnect(request, response) {
    const token = BasicAuth.tokenHeader(request);
    const bool = await BasicAuth.delTokenHdr(token);
    if (!bool) {
      response.status(401).send({ error: 'Unauthorized' });
      return;
    }
    response.status(204).send();
  }

  static async getMe(request, response) {
    const user = await BasicAuth.currUser(request);
    if (!user) {
      response.status(401).send({ error: 'Unauthorized' });
      return;
    }

    response.status(200).send({
      id: user._id,
      email: user.email,
    });
  }
}

export default AuthController;
