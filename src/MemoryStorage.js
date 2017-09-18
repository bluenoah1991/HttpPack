import Heap from 'heap';

export default class MemoryStorage{
    constructor(){
        this.nid = 0;
        this.itemsByIndex = {};
        this.messages = {};
        this.heap = new Heap(function(a, b){
            if(a.isConfirmed){
                return true;
            } else if(b.isConfirmed){
                return false;
            }
            return a.timestamp > b.timestamp;
        });
    }

    generateId(){
        return Promise.resolve(++this.nid);
    }

    savePacket(packet){
        this.heap.push(packet);
        this.itemsByIndex[packet.identifier] = packet;
        return Promise.resolve(null);
    }

    unconfirmedPacket(limit){
        let packets = [];
        while(limit > 0){
            let packet = this.heap.pop();
            if(packet == undefined){
                break;
            } else if(packet.isConfirmed){
                continue;
            } else {
                packets.push(packet);
                limit--;
            }
        }
        return Promise.resolve(packets);
    }

    confirmPacket(identifier){
        let packet = this.itemsByIndex[identifier];
        if(packet != undefined){
            packet.isConfirmed = true;
            this.heap.updateItem(packet);
        }
        return Promise.resolve(packet);
    }

    receivePacket(identifier, payload){
        this.messages[identifier] = payload;
        return Promise.resolve(null);
    }

    releasePacket(identifier){
        let payload = this.messages[identifier];
        delete this.messages[identifier];
        return Promise.resolve(payload);
    }
}