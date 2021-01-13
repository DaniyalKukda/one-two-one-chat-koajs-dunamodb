import aws from 'aws-sdk';
import db from './dynamodb'
import moment from 'moment';
import { IUserSocketRecord } from '../helpers/types';

export default class UserSocket {
  static UserTableInput: aws.DynamoDB.CreateTableInput = {
    AttributeDefinitions: [
      {
        AttributeName: 'userId',
        AttributeType: 'S'
      },
      {
        AttributeName: 'type',
        AttributeType: 'S'
      },
    ],
    KeySchema: [
      {
        AttributeName: 'userId',
        KeyType: 'HASH'
      },
      {
        AttributeName: 'type',
        KeyType: 'RANGE'
      }
    ],
    BillingMode:"PAY_PER_REQUEST",
    TableName: 'UserSocketBindings',
  };

  static createRecord = (record: IUserSocketRecord) => {
    const params: aws.DynamoDB.PutItemInput =  {
      TableName: UserSocket.UserTableInput.TableName,
      Item: {
        userId: { S: record.userId},
        type: {S: "user_socket"},
        socketId: {S: record.socketId},
        time: {S: record.time || moment.utc().toISOString()},
        name: {S: record.name},
        imageURL: {S: record.imageURL}
      }
    }
    return db.putItem(params).promise();
  }

  static deleteRecord = (record: IUserSocketRecord) => {
    const params: aws.DynamoDB.DeleteItemInput =  {
      TableName: UserSocket.UserTableInput.TableName,
      Key: {
        userId: { S: record.userId},
        type: {S: "user_socket"},
      }
    }
    return db.deleteItem(params).promise();
  }

  static getRecord = async (record: IUserSocketRecord) => {
    const params: aws.DynamoDB.DeleteItemInput =  {
      TableName: UserSocket.UserTableInput.TableName,
      Key: {
        userId: { S: record.userId},
        type: {S: "user_socket"},
      }
    }
    return db.getItem(params).promise();
  }

  static getAllRecords = () => {
    const params: aws.DynamoDB.ScanInput =  {
      TableName: UserSocket.UserTableInput.TableName
    }
    return db.scan(params).promise();
  }

}