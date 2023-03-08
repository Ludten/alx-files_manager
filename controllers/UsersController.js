import dbClient from '../utils/db';

const crypto = require('crypto');

let database;

if (process.env.DB_DATABASE) {
  database = process.env.DB_DATABASE;
} else {
  database = 'files_manager';
}

class UsersController {
  static async postNew(request, response) {
    const user = request.body;
    if (!user.email) {
      response.status(400).send({ error: 'Missing email' });
      return;
    }

    if (!user.password) {
      response.status(400).send({ error: 'Missing password' });
      return;
    }

    if ((await dbClient.findUser(user.email)).length > 0) {
      response.status(400).send({ error: 'Already exist' });
      return;
    }

    const shasum = crypto.createHash('sha1')
      .update(user.password)
      .digest('hex');

    user.password = shasum;

    const db = dbClient.client.db(database);
    const collection = db.collection('users');
    const result = await collection.insertOne(user);

    response.status(201).send({
      id: result.insertedId,
      email: user.email,
    });
  }
}

export default UsersController;
