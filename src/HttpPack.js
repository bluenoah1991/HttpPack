import _ from 'lodash';
import moment from 'moment';

import {Request, DefaultRequestOpts} from './HttpClient';
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
    constructor(opts){
        this.callback = opts.callback != undefined ? opts.callback : function(){};
        this.requestCallbackHook = opts.requestCallbackHook != undefined ? opts.requestCallbackHook : function(){};
        this.max_request_number = opts.max_request_number != undefined ? opts.max_request_number : MAX_REQUEST_NUMBER;
        this.storage = opts.storage != undefined ? opts.storage : new MemoryStorage();
        this.defaultRequestOpts = DefaultRequestOpts;
        this.requestOpts = opts.requestOpts != undefined ? _.merge({}, this.defaultRequestOpts, opts.requestOpts) : this.defaultRequestOpts;
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

        let body = this.combine(packs);
        if(body.length === 0){
            body = '';
        }
        Request(_.assign({}, this.requestOpts, {
            body: body
        }), this.requestCallback.bind(this));
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
        if(body != undefined){
            let packs = this.split(body);
            packs.forEach(function(pack){
                if(pack.msg_type == MSG_TYPE_SEND){
                    if(pack.qos == QoS0){
                        this.callback(pack.payload, response);
                    } else if(pack.qos == QoS1){
                        let reply = Encode(MSG_TYPE_ACK, QoS0, 0, pack.msg_id);
                        this.storage.save(reply);
                        this.callback(pack.payload, response);
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
                        this.callback(payload, response);
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