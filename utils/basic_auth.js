import dbClient from './db';
import redisClient from './redis';

const crypto = require('crypto');

class BasicAuth {
  static authHeader(request = null) {
    if (!request) return null;
    if (!request.get('Authorization')) return null;
    return request.get('Authorization');
  }

  static extractBaseAuthHdr(authHeader) {
    if (!authHeader) return null;
    if ((typeof authHeader) !== 'string') return null;
    if (authHeader.startsWith('Basic ')) {
      const basic = authHeader.split(' ');
      return basic[1];
    }
    return null;
  }

  static decodeAuthHeader(authHeader) {
    if (!authHeader) return null;
    if (typeof authHeader !== 'string') return null;
    try {
      return Buffer.from(authHeader, 'base64').toString('utf8');
    } catch (err) {
      return null;
    }
  }

  static extractUserCred(decodeB64AuthHeader) {
    if (!decodeB64AuthHeader) return [null, null];
    if (typeof decodeB64AuthHeader !== 'string') return [null, null];
    if (decodeB64AuthHeader.includes(':')) {
      const basic = decodeB64AuthHeader.split(':', 2);
      return basic;
    }
    return [null, null];
  }

  static async userObjFromCred(userEmail, userPwd) {
    if (!userEmail || typeof userEmail !== 'string') return null;
    if (!userPwd || typeof userPwd !== 'string') return null;
    if ((await dbClient.nbUsers()) > 0) {
      const users = await dbClient.findUser(userEmail);
      if (users !== []) {
        const user = users[0];
        const shasum = crypto.createHash('sha1')
          .update(userPwd)
          .digest('hex');
        if (user.password === shasum) return user;
      }
    }
    return null;
  }

  static tokenHeader(request = null) {
    if (!request) return null;
    if (!request.get('X-Token')) return null;
    return request.get('X-Token');
  }

  static async extractTokenHdr(token) {
    if (!token) return null;
    if (typeof token !== 'string') return null;
    const key = `auth_${token}`;
    const usrID = await redisClient.get(key);
    if (usrID) return usrID;
    return null;
  }

  static async delTokenHdr(token) {
    if (!token) return false;
    if (typeof token !== 'string') return false;
    const key = `auth_${token}`;
    await redisClient.del(key);
    return true;
  }

  async currUser(request = null) {
    const token = this.constructor.tokenHeader(request);
    if (!token) return null;
    const usrID = await this.constructor.extractTokenHdr(token);
    if (!usrID) return null;
    const usr = await dbClient.findUserByID(usrID);
    if (usr !== []) return usr[0];
    return null;
  }
}

export default BasicAuth;
