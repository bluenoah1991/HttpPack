import _ from 'lodash';
import moment from 'moment';

import MemoryStorage from './MemoryStorage';
import * as Protocol from './Protocol';

export default class HttpPack {
    constructor(options){
        if(options == undefined){
            options = {};
        }
        this.storage = options['storage'] || new MemoryStorage();
    }

    generateRetryPacket(packet){
        if(packet.qos == Protocol.QoS0){
            return null;
        } else {
            if(packet.retryTimes != undefined && packet.retryTimes > 0) {
                let retryPacket = _.cloneDeep(packet);
                retryPacket.retryTimes++;
                retryPacket.timestamp = moment().add(retryPacket.retryTimes * 5, 's').unix();
                return retryPacket;
            } else {
                let retryPacket = Protocol.Encode(
                    packet.msgType, packet.qos, 1, packet.identifier, packet.payload);
                retryPacket.retryTimes = 1;
                retryPacket.timestamp = moment().add(retryPacket.retryTimes * 5, 's').unix();
                return retryPacket;
            }
        }
    }

    handlePacket(packet, callback){
        if(packet.msgType == Protocol.MSG_TYPE_SEND){
            if(packet.qos == Protocol.QoS0){
                callback(packet.payload);
                return null;
            } else if(packet.qos == Protocol.QoS1){
                let replyPacket = Protocol.Encode(Protocol.MSG_TYPE_ACK, Protocol.QoS0, 0, packet.identifier);
                replyPacket.timestamp = moment().unix();
                return this.storage.savePacket(replyPacket).then(function(){
                    callback(packet.payload);
                }.bind(this));
            } else if(packet.qos == Protocol.QoS2){
                return this.storage.receivePacket(packet.identifier, packet.payload).then(function(){
                    let replyPacket = Protocol.Encode(Protocol.MSG_TYPE_RECEIVED, Protocol.QoS0, 0, packet.identifier);
                    replyPacket.timestamp = moment().unix();
                    return this.storage.savePacket(replyPacket);
                }.bind(this));
            }
        } else if(packet.msgType == Protocol.MSG_TYPE_ACK){
            return this.storage.confirmPacket(packet.identifier);
        } else if(packet.msgType == Protocol.MSG_TYPE_RECEIVED){
            return this.storage.confirmPacket(packet.identifier).then(function(){
                let replyPacket = Protocol.Encode(Protocol.MSG_TYPE_RELEASE, Protocol.QoS1, 0, packet.identifier);
                replyPacket.timestamp = moment().unix();
                return this.storage.savePacket(replyPacket);
            }.bind(this));      
        } else if(packet.msgType == Protocol.MSG_TYPE_RELEASE){
            return this.storage.releasePacket(packet.identifier).then(function(payload){
                if(payload != undefined){
                    callback(payload);
                }
                let replyPacket = Protocol.Encode(Protocol.MSG_TYPE_COMPLETED, Protocol.QoS0, 0, packet.identifier);
                replyPacket.timestamp = moment().unix();
                return this.storage.savePacket(replyPacket);
            }.bind(this));
        } else if(packet.msgType == Protocol.MSG_TYPE_COMPLETED){
            return this.storage.confirmPacket(packet.identifier);
        }
    }

    combinePacket(packets){
        let buffers = _.map(packets, function(packet){
            return packet.buffer;
        }.bind(this));
        return Buffer.concat(buffers);
    }

    splitBuffer(buffer){
        let packets = [];
        let length = buffer.length;
        let offset = 0;
        while(offset < buffer.length){
            let packet = Protocol.Decode(buffer, offset);
            packets.push(packet);
            offset += packet.totalLength;
        }
        return packets;
    }

    // Public method

    commit(payload, qos = Protocol.QoS0){
        if(typeof payload == 'string'){
            payload = new Buffer(payload, 'utf-8');
        }
        return this.storage.generateId().then(function(id){
            let packet = Protocol.Encode(
                Protocol.MSG_TYPE_SEND, qos, 0, id, payload);
            packet.timestamp = moment().unix();
            return this.storage.savePacket(packet);
        }.bind(this));
    }

    generateBody(){
        let respondPackets = this.storage.unconfirmedPacket(5);
        return respondPackets.then(function(packets){
            let waitHandles = _.map(packets, function(packet){
                let retryPacket = this.generateRetryPacket(packet);
                if(retryPacket != undefined){
                    return this.storage.savePacket(retryPacket).then(function(){
                        return packet;
                    });
                }
                return packet;
            }.bind(this));
            return Promise.all(waitHandles).then(function(packets){
                return this.combinePacket(packets);
            }.bind(this));
        }.bind(this));
    }

    parseBody(body, callback){
        if(body == undefined){
            let nullString = new Buffer('', 'utf-8');
            return Promise.resolve(nullString);
        }
        body = new Buffer(body, 'utf-8');
        let packets = this.splitBuffer(body);
        let waitHandles = _.map(packets, function(packet){
            return this.handlePacket(packet, callback);
        }.bind(this));
        return Promise.all(waitHandles);
    }
}