import aws from 'aws-sdk';
import moment from 'moment';
import { IChatConversationRecord } from '../helpers/types';
import db from './dynamodb'

export default class ChatConversations {
  static ChatTableInput: aws.DynamoDB.CreateTableInput = {
    AttributeDefinitions: [
      {
        AttributeName: 'conversationKey',
        AttributeType: 'S'
      },
      {
        AttributeName: 'type',
        AttributeType: 'S'
      },
    ],
    KeySchema: [
      {
        AttributeName: 'conversationKey',
        KeyType: 'HASH'
      },
      {
        AttributeName: 'type',
        KeyType: 'RANGE'
      }
    ],
    BillingMode:"PAY_PER_REQUEST",
    TableName: 'ChatConversations'
  };

  static createRecord = (record: IChatConversationRecord) => {
    const params: aws.DynamoDB.PutItemInput =  {
      TableName: ChatConversations.ChatTableInput.TableName,
      Item: {
        conversationKey: {S: ChatConversations.getConversationKey(record.senderId, record.receiverId)},
        senderId: { S: record.senderId},
        messageId: {S: record.messageId},
        time: {S: record.time || moment.utc().toISOString()},
        message: {S: record.message},
        type: {S: "conversation"}
      }
    }
    return db.putItem(params).promise();
  }

  static getRecordsById = (id: IChatConversationRecord['receiverId']) => {

    const params : aws.DynamoDB.ScanInput = {
      TableName: ChatConversations.ChatTableInput.TableName,
      ExpressionAttributeValues: {
        ':conversationKey' : {S: id}
      },
      FilterExpression: 'contains (conversationKey, :conversationKey)',
    }

    return db.scan(params).promise();
  }

  static getConversationKey = (senderId: IChatConversationRecord['senderId'], receiverId: IChatConversationRecord['receiverId']): string => {
    return [senderId || "",receiverId || ""].sort((a: string, b: string) => {
      return a.localeCompare(b);
    }).join('$')
  }

  static getIdFromConverationKey = (id: string) => id.split('$')
}

