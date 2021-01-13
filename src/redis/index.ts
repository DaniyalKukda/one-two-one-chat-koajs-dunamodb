import redis from 'redis';
import _ from 'lodash'
import { IUserSocketRecord } from '../helpers/types';

const client = redis.createClient({
    port: 6379,               
    host: '127.0.0.1',        
    password: 'admin',    
});

client.on("error", error => {
    console.error(error);
});

export default class RedisUserSocket {  // wrapping in promises
    static get =  function (userId: IUserSocketRecord['userId']) : Promise<IUserSocketRecord> {
        return new Promise<IUserSocketRecord>((resolve, reject) => {
            if(!userId) return resolve(undefined);
            client.get(userId, (err, result) => {
                if (err) throw err;
                return resolve(JSON.parse(result || "{}"));
            })
        })
    }
    static set = function (record: IUserSocketRecord)  : Promise<string> {
        return new Promise<string>((resolve, reject) => {
            if(!record.userId) return resolve("");
            client.set(record.userId, JSON.stringify(record), (err, result) => {
                if (err) {
                    console.log(err)
                    throw err
                }
                return resolve(result);
            })
        })
    }
    static del = function (userId: IUserSocketRecord['userId'])  : Promise<number>  {
        return new Promise<number>((resolve, reject) => {
            if(!userId) return resolve(0);
            client.del(userId, (err, result) => {
                if (err) {
                    reject(err);
                }
                if (result == 1) {
                    resolve(result);
                } else {
                    reject(result || "Cannot delete")
                }
            });
        })
    }
    static getAll = function ()  : Promise<{[key in IUserSocketRecord['userId']] : IUserSocketRecord}> {
        return new Promise<{[key in IUserSocketRecord['userId']] : IUserSocketRecord}>((resolve, reject) => {
            const keyValues: {[key in IUserSocketRecord['userId']]: IUserSocketRecord} = {};
            client.keys('*', async (err, keys) => {
                if (err) throw err;
                if(keys){
                    for(const key of keys) {
                        try {
                            if(key) keyValues[key] = await RedisUserSocket.get(key)
                        } catch(e) {
                            console.log(e)
                        }
                    }
                    resolve(keyValues)
                }
            });
        })
    }
}