import http from 'http';
import socketIO from 'socket.io';
import _ from 'lodash';
import Router from '@koa/router';
import moment from 'moment';
import shortid from 'shortid';
import { IApiResponse, IChatConversationRecord, IChatMessageRecord, IUserSocketRecord, IUserTypingData } from '../helpers/types';
import UserSocket from '../aws/UserSocket';
import ChatMessage from '../aws/ChatMessages';
import { isRead, setRead, setUnread, unsetUnread } from '../helpers/chatStatus';
import ChatConversations from '../aws/ChatConversation';
import { socketNamespace } from '../helpers/regex';
import { validate } from '../helpers/utility';

const router = new Router();
let client: socketIO.Namespace;
let io: socketIO.Server;

export const connectWithSocket = (appCallback: http.RequestListener): http.Server => {
  const serverWithSocket = http.createServer(appCallback)
  io = socketIO(serverWithSocket, { transports: ["polling", "websocket"], pingTimeout: 5000 })

  client = io.of(socketNamespace);

  client.on('connection', async socket => {
    const phId = _.split(socket.nsp.name, 'socketid-')[1];
    
    if (phId == socket.handshake.query.myNumber) {
      
      await UserSocket.createRecord({
        userId: phId, 
        socketId: socket.id, 
        time: moment.utc().toISOString(),
        name: socket.handshake.query.name,
        imageURL: socket.handshake.query.imageURL
      }).catch(err => console.log(err));
    
    } else {
      socket.emit("connect_error", {error: "The query 'myNumber' has mismatch ID"})
      socket.disconnect()
    }
    
    client.emit('user-status', {
      userId: phId,
      status: 1,
      time: moment.utc().toISOString()
    })

    socket.on('disconnect', async () => {
      // delete socket bindings
      await UserSocket.createRecord({userId: phId, socketId: ""}).catch(err => console.log(err));
      client.emit('user-status', {
        userId: phId,
        status: 2,
        time: moment.utc().toISOString()
      });
    })

    socket.on("user-typing-sender", async (data: IUserTypingData) => {
      const socketId: string = (await UserSocket.getRecord({userId: data.receiverId})).Item?.socketId?.S || "";
      data.time = data.time || moment.utc().toISOString();
      client.to(socketId).emit("user-typing-receiver", data)
    })

    // send all the stored messages via socket
    const messages = await ChatMessage.getRecordsByReceiverId({receiverId: phId, status: setUnread()})
    if (messages.Items) {
      _.forEach(messages.Items, message => {
        if(isRead(parseInt(message.status.S || "0"))) {
          return
        }
        const data : IChatMessageRecord = {
          senderId: message.senderId.S || "",
          receiverId: message.receiverId.S || "",
          id: message.id.S || "",
          message: message.message?.S || "",
          time : message.time?.S || "",
          status: parseInt(message.status.S || "0"),
        }

        client.to(socket.id).emit('chat-message', data);
        ChatMessage.createRecord({
          id: message.id.S,
          receiverId: message.receiverId.S || "",
          senderId: message.senderId.S || "",
          message: message.message.S,
          time: message.message.S,
          status: unsetUnread(setRead(parseInt(message.status.S || "0")))
        })
      })
    }
  })

  return serverWithSocket
}

export const registerSocketRoutes = () => {

  router.get("/", async ctx => {
    ctx.status = 200;
    ctx.body = "Success"
  })

  router.post('/chat/send', async ctx => {
    const data: IChatMessageRecord = ctx.request?.body;
    
    if(!validate(data.message)) {
      ctx.status = 400;
      const response: IApiResponse<string> = {
        status: 400,
        data: "The property 'message' is missing from the body request",
        message: "Success",
        code: "E/P-C/001"  
      }
      return ctx.body = response
    }

    if(!validate(data.receiverId)) {
      ctx.status = 400;
      const response: IApiResponse<string> = {
        status: 400,
        data: "The property 'receiverId' is missing from the body request",
        message: "Success",
        code: "E/P-C/001"  
      }
      return ctx.body = response
    }

    if(!validate(data.senderId)) {
      ctx.status = 400;
      const response: IApiResponse<string> = {
        status: 400,
        data: "The property 'senderId' is missing from the body request",
        message: "Success",
        code: "E/P-C/001"  
      }
      return ctx.body = response
    }

    try {
      const socketId: string = (await UserSocket.getRecord({userId: data.receiverId})).Item?.socketId?.S || "";
      const socketNamespace = _.first(_.split(socketId, '#')) || '';
      let status = setUnread();
      data.id = shortid.generate();
      if (socketId && socketNamespace && _.includes(Object.keys(io.nsps[socketNamespace]?.connected), socketId)) {
        client.to(socketId).emit('chat-message', data);
        status = setRead(status)
      }

      await ChatMessage.createRecord({
        id: data.id,
        receiverId: data.receiverId,
        senderId: data.senderId,
        message: data.message,
        status,
      })
      await ChatConversations.createRecord({
        receiverId: data.receiverId,
        senderId: data.senderId || "",
        message: data.message,
        messageId: data.id
      })
      ctx.status = 200;
    } catch (e) {
      console.log(e);
      ctx.status = 500;
    }
    
    const response: IApiResponse<string> = {
      status: 200,
      data: "Message Sent",
      message: "Success",
      code: "S/P-C.S/001"  
    }

    ctx.body = response;
  });

  router.post('/chat/history', async ctx => {
    const {receiverId, senderId} =  ctx.request?.body || {};
    const {pageSize, pageIndex, from, to} = ctx.request.query || {};

    if(!validate(receiverId)) {
      ctx.status = 400;
      const response: IApiResponse<string> = {
        status: 400,
        data: "The property 'receiverId' is missing from the body request",
        message: "Success",
        code: "E/P-C/001"  
      }
      return ctx.body = response
    }

    if(!validate(senderId)) {
      ctx.status = 400;
      const response: IApiResponse<string> = {
        status: 400,
        data: "The property 'senderId' is missing from the body request",
        message: "Success",
        code: "E/P-C/002"  
      }
      return ctx.body = response
    }

    const options = {
      from : from && moment(from, moment.ISO_8601, true).isValid() ? from : undefined,
      to: to && moment(to, moment.ISO_8601, true).isValid() ? to : undefined
    }

    const records = await ChatMessage.getRecordsBySenderId({
      receiverId,
      senderId
    }, options);
    
    const optimizedRecords = _.map(records.Items, (v) : IChatMessageRecord=> {
      return {
        id: v.id.S || "",
        senderId: v.senderId.S || "",
        receiverId: v.receiverId.S || "",
        message: v.message.S || "",
        time: v.time.S || "",
        status: parseInt(v.status.S || "0"),
      }
    })

    let data: Array<IChatMessageRecord> = []

    if(pageIndex && pageSize) {
      const chunks = _.chunk(optimizedRecords, pageSize)
      data = chunks[pageIndex] as any
    } else {
      data = optimizedRecords
    }

    data.sort((a,b) => a.time?.localeCompare(b.time || "") || 0);

    const response: IApiResponse<Array<IChatMessageRecord>> = {
      status: 200,
      data,
      message: "Success",
      code: "S/G-C.H/001"  
    }

    ctx.status = 200;
    ctx.body = response;

  });

  router.post('/chat', async ctx => {
    const {id} =  ctx.request?.body || {};

    if(!validate(id)) {
      ctx.status = 400;
      return ctx.body = "The property 'id' is missing from the body request"
    }

    const records = await ChatConversations.getRecordsById(id);
    const connectedSockets = await UserSocket.getAllRecords()
    const onlineSockets = _.keyBy(_.map(connectedSockets.Items, (v) : IUserSocketRecord=> {
      return {
        userId: `${v.userId.S}`,
        socketId: v.socketId?.S,
        time: v.time?.S,
        name: v.name?.S,
        imageURL: v.imageURL?.S,
      }
    }), "userId")
    
    const data: Array<IChatConversationRecord> = _.map(records.Items, (v) : IChatConversationRecord=> {
      const [tempSenderId, tempReceiverId] = ChatConversations.getIdFromConverationKey(v.conversationKey.S || "")
      const otherId = id?.trim().toLowerCase() == `${v.senderId.S}`.trim().toLowerCase() ? tempReceiverId : `${v.senderId.S}`      
      
      return {
        senderId: v.senderId.S || "",
        receiverId: tempSenderId == (v.senderId.S || "") ? tempReceiverId : tempSenderId,
        message: v.message.S || "",
        time: v.time.S || "",
        messageId: v.messageId.S || "",
        status: onlineSockets[otherId]?.socketId ? 1 : 2,
        lastStatusTime: onlineSockets[otherId]?.time || "",
        name: onlineSockets[otherId]?.name || "",
        imageURL: onlineSockets[otherId]?.imageURL || "",
      }
    })
    data.sort((a,b) => a.time?.localeCompare(b.time || "") || 0);
    const response: IApiResponse<Array<IChatConversationRecord>> = {
      status: 200,
      data,
      message: "Success",
      code: "S/P-C/001"  
    }

    ctx.status = 200;
    ctx.body = response;

  });

  return router;
}