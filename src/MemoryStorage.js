import Heap from 'heap';

export default class MemoryStorage{
    constructor(){
        this.uid = 0;
        this.__packs__ = [];
        this.index = {};
        this.heap = new Heap(function(a, b){
            a.confirm = a.confirm || false;
            b.confirm = b.confirm || false;
            if(a.confirm && !b.confirm){
                return true;
            } else if(!a.confirm && b.confirm){
                return false;
            }
            if(a.timestamp == undefined && b.timestamp != undefined){
                return true;
            } else if(a.timestamp != undefined && b.timestamp == undefined){
                return false;
            } else if(a.timestamp == undefined && b.timestamp == undefined){
                return a.msg_id > b.msg_id;
            }
            return a.timestamp > b.timestamp;
        });
        this.msgs = {};
    }

    // generate global unique id
    uniqueId(){
        return ++this.uid;
    }

    // insert pack and set timestamp
    save(pack){
        pack.confirm = false;
        this.heap.push(pack);
        this.index[pack.msg_id] = pack;
    }

    // fetch up to limit unconfirmed packs
    unconfirmed(limit){
        let packs = [];
        while(limit > 0){
            let pack = this.heap.pop();
            if(pack == undefined){
                break;
            } else if(pack.confirm){
                continue;
            } else {
                packs.push(pack);
                limit--;
            }
        }
        return packs;
    }

    // confirm and return message
    confirm(msg_id){
        let pack = this.index[msg_id];
        if(pack != undefined){
            pack.confirm = true;
            this.heap.updateItem(pack);
        }
        return pack;
    }

    // receive and storage message
    receive(msg_id, payload){
        this.msgs[msg_id] = payload;
    }

    // release and delete message
    release(msg_id){
        return this.msgs[msg_id];
    }
}