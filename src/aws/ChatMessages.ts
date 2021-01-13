import aws from 'aws-sdk';
import moment from 'moment';
import shortid from 'shortid';
import { setUnread } from '../helpers/chatStatus';
import { IChatMessageRecord } from '../helpers/types';
import db from './dynamodb'

export default class ChatMessage {
  static ChatTableInput: aws.DynamoDB.CreateTableInput = {
    AttributeDefinitions: [
      {
        AttributeName: 'id',
        AttributeType: 'S'
      },
      {
        AttributeName: 'receiverId',
        AttributeType: 'S'
      },
      {
        AttributeName: 'senderId',
        AttributeType: 'S'
      },
      {
        AttributeName: 'status',
        AttributeType: 'S'
      },
      
    ],
    KeySchema: [
      {
        AttributeName: 'receiverId',
        KeyType: 'HASH'
      },
      {
        AttributeName: 'id',
        KeyType: 'RANGE'
      }
    ],
    BillingMode:"PAY_PER_REQUEST",
    TableName: 'ChatMessageHistory',
    LocalSecondaryIndexes: [
      {
        IndexName: 'ChatMessageBySenderId', 
        KeySchema: [ 
          {
            AttributeName: 'receiverId', 
            KeyType: "HASH" 
          },
          {
            AttributeName: 'senderId', 
            KeyType: "RANGE" 
          },
        ],
        Projection: { 
          ProjectionType: "ALL"
        },
      },
      {
        IndexName: 'ChatMessageByReceiverId', 
        KeySchema: [ 
          {
            AttributeName: 'receiverId', 
            KeyType: "HASH" 
          },
          {
            AttributeName: 'status', 
            KeyType: "RANGE" 
          },
        ],
        Projection: { 
          ProjectionType: "ALL"
        },
      },

    ]
  };

  static createRecord = (record: IChatMessageRecord) => {
    const params: aws.DynamoDB.PutItemInput =  {
      TableName: ChatMessage.ChatTableInput.TableName,
      Item: {
        id: {S: record.id || shortid.generate()},
        receiverId: { S: record.receiverId},
        senderId: {S: record.senderId},
        message: {S: record.message},
        time: {S: record.time || moment.utc().toISOString()},
        status: {S: `${record.status || setUnread()}`}
      }
    }
    return db.putItem(params).promise();
  }

  static getRecordsBySenderId = (record: IChatMessageRecord, filters? : {from : string, to :string}) => {

    const params : aws.DynamoDB.ScanInput = {
      TableName: ChatMessage.ChatTableInput.TableName,
      IndexName: "ChatMessageBySenderId",
      FilterExpression: '(#senderId = :senderId AND #receiverId = :receiverId) OR (#senderId = :receiverId AND #receiverId = :senderId)',
      ExpressionAttributeNames: {
        "#senderId": "senderId",
        "#receiverId": "receiverId",
      },
      ExpressionAttributeValues: {
        ":senderId": {S: record.senderId},
        ":receiverId": {S: record.receiverId}
      },
    }

    if(filters?.from) {
      if(params.FilterExpression && params.FilterExpression?.length > 0) { 
        params.FilterExpression += " AND #timeFrom >= :timeFrom" 
      } else {
        params.FilterExpression = "#timeFrom >= :timeFrom";
      } 
      params.ExpressionAttributeNames = {
        ...params.ExpressionAttributeNames,
        ['#timeFrom'] : "time"
      }
      params.ExpressionAttributeValues = {
        ...params.ExpressionAttributeValues,
        ":timeFrom": { S : filters.from}
      }
    }

    if(filters?.to) {
      if(params.FilterExpression && params.FilterExpression?.length > 0) { 
        params.FilterExpression += " AND #timeTo >= :timeTo" 
      } else {
        params.FilterExpression = "#timeTo >= :timeTo";
      } 
      params.ExpressionAttributeNames = {
        ...params.ExpressionAttributeNames,
        ['#timeTo'] : "time"
      }
      params.ExpressionAttributeValues = {
        ...params.ExpressionAttributeValues,
        ":timeTo": { S : filters.to}
      }
    }

    return db.scan(params).promise();
  }

  static getRecordsByReceiverId = (record: IChatMessageRecord) => {

    const params : aws.DynamoDB.QueryInput = {
      TableName: ChatMessage.ChatTableInput.TableName,
      IndexName: "ChatMessageByReceiverId",
      KeyConditionExpression: '#status >= :status AND #receiverId = :receiverId',
      ExpressionAttributeNames: {
        "#status": "status",
        "#receiverId": "receiverId",
      },
      ExpressionAttributeValues: {
        ":status": {S: `${record.status}`},
        ":receiverId": {S: record.receiverId}
      },
      ScanIndexForward: true,
    }

    return db.query(params).promise();
  }

}