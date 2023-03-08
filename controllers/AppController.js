import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class AppController {
  static getStatus(_request, response) {
    response.status(200).send({
      redis: redisClient.isAlive(),
      db: dbClient.isAlive(),
    });
  }

  static async getStats(_request, response) {
    const users = await dbClient.nbUsers();
    const files = await dbClient.nbFiles();
    response.status(200).send({
      users,
      files,
    });
  }
}

export default AppController;
