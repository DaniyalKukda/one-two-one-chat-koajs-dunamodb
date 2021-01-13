const UNREAD: number = 1;
const READ: number = 2;
const DELETED: number = 4;
const FAILED: number = 8;
const STARRED: number = 16;

export const setRead = (status: number = 0) => status | READ;
export const setUnread = (status: number = 0) => status | UNREAD;
export const setDeleted = (status: number = 0) => status | DELETED;
export const setFailed = (status: number = 0) => status | FAILED;
export const setStarred = (status: number = 0) => status | STARRED;

export const isRead = (status: number = 0) => (status & READ) == READ;
export const isUnread = (status: number = 0) => (status & UNREAD) == UNREAD;
export const isDeleted = (status: number = 0) => (status & DELETED) == DELETED;
export const isFailed = (status: number = 0) => (status & FAILED) == FAILED;
export const isStarred = (status: number = 0) => (status & STARRED) == STARRED;

export const unsetRead = (status: number = 0) => status & ~READ;
export const unsetUnread = (status: number = 0) => status & ~UNREAD;
export const unsetDeleted = (status: number = 0) => status & ~DELETED;
export const unsetFailed = (status: number = 0) => status & ~FAILED;
export const unsetStarred = (status: number = 0) => status & ~STARRED;

// export default { UNREAD, READ, DELETED, FAILED, STARRED }