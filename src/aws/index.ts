import UserSocket from './UserSocket'
import db from './dynamodb';
import ChatMessage from './ChatMessages';
import ChatConversation from './ChatConversation';

export const initDynamoDB = async () => {
    try {
        
        // await db.createTable(ChatMessage.ChatTableInput).promise() // Init ChatMessage Table
        // await db.createTable(UserSocket.UserTableInput).promise() // Init UserSocket Table
        // await db.createTable(ChatConversation.ChatTableInput).promise() // Init ChatConversation Table
        console.log("Successfully created DynamoDB Tables")
    } catch (e) {
        console.log("DynamoDB Init error", e)
    }
    return db;
}