import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { ObjectId } from 'mongodb';
import dbClient from '../utils/db';
import BasicAuth from '../utils/basic_auth';

const path = require('path');
const mime = require('mime-types');

let fpath;
let database;

if (process.env.FOLDER_PATH) {
  fpath = process.env.FOLDER_PATH;
} else {
  fpath = '/tmp/files_manager';
}

if (process.env.DB_DATABASE) {
  database = process.env.DB_DATABASE;
} else {
  database = 'files_manager';
}

const fileTypes = ['folder', 'file', 'image'];

class FilesController {
  static async postUpload(request, response) {
    const user = await BasicAuth.currUser(request);
    if (!user) {
      response.status(401).send({ error: 'Unauthorized' });
      return;
    }

    const file = request.body;
    if (!file.name) {
      response.status(400).send({ error: 'Missing name' });
      return;
    }

    if (!file.type || !fileTypes.includes(file.type)) {
      response.status(400).send({ error: 'Missing type' });
      return;
    }

    if (!file.data && file.type !== 'folder') {
      response.status(400).send({ error: 'Missing data' });
      return;
    }

    if (file.parentId && (file.parentId !== 0 || file.parentId !== '0')) {
      const users = await dbClient.findFilesByPID(file.parentId);
      if (users.length < 1) {
        response.status(400).send({ error: 'Parent not found' });
        return;
      }
      if (users[0].type !== 'folder') {
        response.status(400).send({ error: 'Parent is not a folder' });
        return;
      }
    } else {
      file.parentId = 0;
    }

    if (!file.isPublic) file.isPublic = false;

    file.userId = user._id.toString();
    const db = dbClient.client.db(database);
    const collection = db.collection('files');
    if (file.type === 'folder') {
      const result = await collection.insertOne(file);
      response.status(201).send({
        id: result.insertedId,
        userId: file.userId,
        name: file.name,
        type: file.type,
        isPublic: file.isPublic,
        parentId: file.parentId,
      });
    } else {
      const uID = uuidv4();
      const localPath = `${fpath}/${uID}`;
      const data = Buffer.from(file.data, 'base64').toString('utf8');
      const result = await collection.insertOne({
        userId: file.userId,
        name: file.name,
        type: file.type,
        isPublic: file.isPublic,
        parentId: file.parentId,
        localPath,
      });
      try {
        fs.mkdirSync(fpath, { recursive: true });
      } catch (e) {
        console.log('Cannot create folder ', e);
      }
      fs.writeFile(path.join(fpath, uID), data, (err) => {
        try {
          if (err) throw err;
          response.status(201).send({
            id: result.insertedId,
            userId: file.userId,
            name: file.name,
            type: file.type,
            isPublic: file.isPublic,
            parentId: file.parentId,
          });
        } catch (error) {
          console.log(error);
          response.status(400).send({ error });
        }
      });
    }
  }

  static async getShow(request, response) {
    const user = await BasicAuth.currUser(request);
    if (!user) {
      response.status(401).send({ error: 'Unauthorized' });
      return;
    }

    const { id } = request.params;
    if (!id) {
      response.status(404).send({ error: 'Not found' });
      return;
    }
    const userId = user._id.toString();
    const files = await dbClient.findFilesByIdUID(id, userId);
    if (files.length < 1) {
      response.status(404).send({ error: 'Not found' });
      return;
    }
    response.status(200).send(files[0]);
  }

  static async getIndex(request, response) {
    const user = await BasicAuth.currUser(request);
    if (!user) {
      response.status(401).send({ error: 'Unauthorized' });
      return;
    }
    const userId = user._id.toString();
    const { parentId } = request.query;
    let { page } = request.query;

    if (!parentId) {
      if (!page) page = 0;
      else page = Number.parseInt(page, 10);
      const query = { userId: new ObjectId(`${userId}`) };
      const files = await dbClient.findFilesAgg(query, page);
      response.status(200).send(files);
    } else {
      if (!page) page = 0;
      else page = Number.parseInt(page, 10);
      const query = { userId: new ObjectId(`${userId}`), parentId: new ObjectId(`${parentId}`) };
      const files = await dbClient.findFilesAgg(query, page);
      response.status(200).send(files);
    }
  }

  static async putPublish(request, response) {
    const user = await BasicAuth.currUser(request);
    if (!user) {
      response.status(401).send({ error: 'Unauthorized' });
      return;
    }
    const { id } = request.params;
    if (!id) {
      response.status(404).send({ error: 'Not found' });
      return;
    }
    const userId = user._id.toString();
    const files = await dbClient.findFilesByIdUID(id, userId);
    if (files.length < 1) {
      response.status(404).send({ error: 'Not found' });
      return;
    }
    await dbClient.updateFiles(id, userId, true);
    response.status(200).send({
      id: files[0]._id.toString(),
      userId: files[0].userId,
      name: files[0].name,
      type: files[0].type,
      isPublic: true,
      parentId: files[0].parentId,
    });
  }

  static async putUnpublish(request, response) {
    const user = await BasicAuth.currUser(request);
    if (!user) {
      response.status(401).send({ error: 'Unauthorized' });
      return;
    }
    const { id } = request.params;
    if (!id) {
      response.status(404).send({ error: 'Not found' });
      return;
    }
    const userId = user._id.toString();
    const files = await dbClient.findFilesByIdUID(id, userId);
    if (files.length < 1) {
      response.status(404).send({ error: 'Not found' });
      return;
    }
    await dbClient.updateFiles(id, userId, false);
    response.status(200).send({
      id: files[0]._id.toString(),
      userId: files[0].userId,
      name: files[0].name,
      type: files[0].type,
      isPublic: false,
      parentId: files[0].parentId,
    });
  }

  static async getFile(request, response) {
    const { id } = request.params;

    if (!id) {
      response.status(404).send({ error: 'Not found' });
      return;
    }
    const files = await dbClient.findFilesByID(id);
    if (files.length < 1) {
      response.status(404).send({ error: 'Not found' });
      return;
    }
    const file = files[0];
    const user = await BasicAuth.currUser(request);

    if (!file.isPublic && (!user || user._id.toString() !== file.userId.toString())) {
      response.status(404).send({ error: 'Not found' });
      return;
    }

    if (file.type === 'folder') {
      response.status(400).send({ error: 'A folder doesn\'t have content' });
      return;
    }

    fs.access(file.localPath, fs.F_OK, (err) => {
      if (err) {
        response.status(404).send({ error: 'Not found' });
      } else {
        fs.readFile(file.localPath, (err, data) => {
          response.setHeader('Content-Type', mime.contentType(file.name) || 'text/plain; charset=utf-8');
          response.status(200).send(data);
        });
      }
    });
  }
}

export default FilesController;
