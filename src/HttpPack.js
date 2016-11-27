import request from 'request';

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

class HttpPack {
    constructor(opts, callback){
        this.max_request_number = opts.max_request_number != undefined ? opts.max_request_number : MAX_REQUEST_NUMBER;
        this.callback = callback != undefined ? callback : function(){};
        this.storage = opts.storage != undefined ? opts.storage : new MemoryStorage();
        this.defaultRequestOpts = {
            method: 'POST',
            url: 'http://www.example.com/',
            forever: true,
            timeout: 60 * 1000,
            gzip: true,
            callback: this.requestCallback
        };
        this.requestOpts = opts.requestOpts != undefined ? Object.assign({}, opts.requestOpts, opts.requestOpts) : this.defaultRequestOpts;
        this.heartbeat = opts.heartbeat != undefined ? opts.heartbeat : 1000;
        this.loopHandle = setTimeout(this.loop, this.heartbeat);
    }

    buffer(buf){
        let pack = Encode(MSG_TYPE_SEND, QoS2, 0, this.storage.uniqueId(), buf);
        this.storage.save(pack);
    }

    loop(){
        let packs = this.storage.unconfirmed(this.max_request_number);
        this.requestInstance = request(Object.assign({}, this.requestOpts, {
            body: this.combine(packs)
        }));
    }

    // combine packs return body
    combine(packs){
        return Buffer.concat(packs.map(function(pack){
            return pack.buffer;
        }));
    }

    // split body return packs
    split(body){
        // TODO
    }

    requestCallback(error, response, body){
        if(!error && response.statusCode >= 200 && response.statusCode < 300){
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
        this.loopHandle = setTimeout(this.loop, this.heartbeat);
    }
}