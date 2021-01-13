export interface IChatMessageRecord {
  id?: string;
  senderId?: IUserSocketRecord['userId'];
  receiverId: IUserSocketRecord['userId'];
  message?: string;
  time?: string;
  status?: number;
}

export interface IUserTypingData {
  senderId: IUserSocketRecord['userId'];
  receiverId: IUserSocketRecord['userId'];
  status: boolean;
  time: string;
}

export interface IChatConversationRecord {
  senderId: IUserSocketRecord['userId'];
  receiverId: IUserSocketRecord['userId'];
  message?: IChatMessageRecord['message'];
  time?: string;
  messageId?: IChatMessageRecord['id'];
  status?: IUserSocketRecord['status'];
  lastStatusTime?: IUserSocketRecord['time'];
  name?: IUserSocketRecord['name'];
  imageURL?: IUserSocketRecord['imageURL'];
}

export interface IUserSocketRecord {
  type?: string;
  userId: string;
  socketId?: string;
  status?: number;
  time?: string;
  name?: string;
  imageURL?: string;
}

export interface IApiResponse<type = any> {
  status: number;
  data: type;
  message: string;
  code: string;
}