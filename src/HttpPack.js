import request from 'request';
import _ from 'lodash';
import moment from 'moment';

import MemoryStorage from './MemoryStorage';
import {
    Encode, 
    Decode,
    MSG_TYPE_SEND,
    MSG_TYPE_ACK,
    MSG_TYPE_RECEIVED,
    MSG_TYPE_RELEASE,
    MSG_TYPE_COMPLETED,
    QoS0, QoS1, QoS2
} from './Protocol';

const MAX_REQUEST_NUMBER = 20;

export default class HttpPack {
    constructor(opts, callback){
        this.callback = callback != undefined ? callback : function(){};
        this.requestCallbackHook = opts.requestCallbackHook != undefined ? opts.requestCallbackHook : function(){};
        this.max_request_number = opts.max_request_number != undefined ? opts.max_request_number : MAX_REQUEST_NUMBER;
        this.storage = opts.storage != undefined ? opts.storage : new MemoryStorage();
        this.defaultRequestOpts = {
            method: 'POST',
            url: 'http://www.example.com/',
            forever: true,
            timeout: 60 * 1000,
            gzip: true,
            callback: this.requestCallback.bind(this)
        };
        this.requestOpts = opts.requestOpts != undefined ? Object.assign({}, this.defaultRequestOpts, opts.requestOpts) : this.defaultRequestOpts;
        this.heartbeat = opts.heartbeat != undefined ? opts.heartbeat : 1000;
        this.loopHandle = setTimeout(this.loop.bind(this), this.heartbeat);
    }

    commit(data, qos = 0){
        let pack = Encode(MSG_TYPE_SEND, qos, 0, this.storage.uniqueId(), data);
        this.storage.save(pack);
    }

    retry(pack){
        if(pack.qos == QoS0){
            return null;
        } else {
            if(pack.retry_times != undefined && pack.retry_times > 0) {
                let retry_pack = _.cloneDeep(pack);
                retry_pack.retry_times++;
                retry_pack.timestamp = moment().add(retry_pack.retry_times * 5, 's');
                return retry_pack;
            } else {
                let retry_pack = Encode(pack.msg_type, pack.qos, 1, pack.msg_id, pack.payload);
                retry_pack.retry_times = 1;
                retry_pack.timestamp = moment().add(retry_pack.retry_times * 5, 's');
                return retry_pack;
            }
        }
    }

    loop(){
        let packs = this.storage.unconfirmed(this.max_request_number);
        packs.forEach(function(pack){
            let retry_pack = this.retry(pack);
            if(retry_pack != undefined){
                this.storage.save(retry_pack);
            }
        }.bind(this));
        if(packs.length > 0){
            this.requestInstance = request(Object.assign({}, this.requestOpts, {
                body: this.combine(packs)
            }));
        } else {
            this.loopHandle = setTimeout(this.loop.bind(this), this.heartbeat);
        }
    }

    // combine packs return body
    combine(packs){
        return Buffer.concat(packs.map(function(pack){
            return pack.buffer;
        }));
    }

    // split body return packs
    split(body){
        let packs = [];
        let offset = 0;
        while(offset < body.length){
            let pack = Decode(body, offset);
            packs.push(pack);
            offset += pack.total_length;
        }
        return packs;
    }

    requestCallback(error, response, body){
        this.requestCallbackHook(error, response, body);
        if(!error && response.statusCode >= 200 && response.statusCode < 300){
            if(typeof body == 'string'){
                body = Buffer.from(body);
            }
            let packs = this.split(body);
            packs.forEach(function(pack){
                if(pack.msg_type == MSG_TYPE_SEND){
                    if(pack.qos == QoS0){
                        this.callback(pack.payload, response);
                    } else if(pack.qos == QoS1){
                        let reply = Encode(MSG_TYPE_ACK, QoS0, 0, pack.msg_id);
                        this.storage.save(reply);
                    } else if(pack.qos == QoS2){
                        this.storage.receive(pack.msg_id, pack.payload);
                        let reply = Encode(MSG_TYPE_RECEIVED, QoS0, 0, pack.msg_id);
                        this.storage.save(reply);
                    }
                } else if(pack.msg_type == MSG_TYPE_ACK){
                    this.storage.confirm(pack.msg_id);
                } else if(pack.msg_type == MSG_TYPE_RECEIVED){
                    this.storage.confirm(pack.msg_id);
                    let reply = Encode(MSG_TYPE_RELEASE, QoS1, 0, pack.msg_id);
                    this.storage.save(reply);
                } else if(pack.msg_type == MSG_TYPE_RELEASE){
                    let payload = this.storage.release(pack.msg_id);
                    if(payload != undefined){
                        this.callback(pack.msg_id, payload);
                    }
                    let reply = Encode(MSG_TYPE_COMPLETED, QoS0, 0, pack.msg_id);
                    this.storage.save(reply);
                } else if(pack.msg_type == MSG_TYPE_COMPLETED){
                    this.storage.confirm(pack.msg_id);
                }
            }.bind(this));
        }
        this.loopHandle = setTimeout(this.loop.bind(this), this.heartbeat);
    }
}