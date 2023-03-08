import { MongoClient } from 'mongodb';

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
}

const dbClient = new DBClient();

export default dbClient;
