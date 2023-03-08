import { MongoClient, ObjectId } from 'mongodb';

let host;
let port;
let database;
if (process.env.DB_HOST) {
  host = process.env.DB_HOST;
} else {
  host = 'localhost';
}

if (process.env.DB_PORT) {
  port = process.env.DB_PORT;
} else {
  port = '27017';
}

if (process.env.DB_DATABASE) {
  database = process.env.DB_DATABASE;
} else {
  database = 'files_manager';
}

const url = `mongodb://${host}:${port}`;

class DBClient {
  constructor() {
    this.client = new MongoClient(url, { useUnifiedTopology: true });
    this.client.connect();
    this.db = '';
  }

  isAlive() {
    return this.client.isConnected();
  }

  async nbUsers() {
    this.db = this.client.db(database);
    const collection = this.db.collection('users');
    const findResult = await collection.find({}).toArray();
    return findResult.length;
  }

  async nbFiles() {
    this.db = this.client.db(database);
    const collection = this.db.collection('files');
    const findResult = await collection.find({}).toArray();
    return findResult.length;
  }

  async findUser(email) {
    this.db = this.client.db(database);
    const collection = this.db.collection('users');
    const findResult = await collection.find({ email: `${email}` }).toArray();
    return findResult;
  }

  async findUserByID(id) {
    this.db = this.client.db(database);
    const collection = this.db.collection('users');
    const findResult = await collection.find(new ObjectId(`${id}`)).toArray();
    return findResult;
  }

  async findFilesByPID(id) {
    this.db = this.client.db(database);
    const collection = this.db.collection('files');
    const findResult = await collection.find(new ObjectId(`${id}`)).toArray();
    return findResult;
  }

  async findFilesByUID(uid) {
    this.db = this.client.db(database);
    const collection = this.db.collection('files');
    const findResult = await collection.find({
      userId: uid,
    }).toArray();
    return findResult;
  }

  async findFilesByIdUID(id, uid) {
    this.db = this.client.db(database);
    const collection = this.db.collection('files');
    const findResult = await collection.find({
      _id: new ObjectId(`${id}`),
      userId: uid,
    }).toArray();
    return findResult;
  }

  async findFilesAgg(query, page) {
    this.db = this.client.db(database);
    const collection = this.db.collection('files');
    const findResult = await collection.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$_id',
          id: { $first: '$_id' },
          userId: { $first: '$userId' },
          name: { $first: '$name' },
          type: { $first: '$type' },
          isPublic: { $first: '$isPublic' },
          parentId: { $first: '$parentId' },
        },
      },
      { $sort: { _id: -1 } },
      { $skip: 20 * page },
      { $limit: 20 },
      { $project: { _id: 0 } },
    ]).toArray();
    return findResult;
  }
}

const dbClient = new DBClient();

export default dbClient;
