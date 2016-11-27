class MemoryStorage{
    constructor(){
        this.__packs__ = [];
    }

    // generate global unique id
    uniqueId(){

    }

    // insert pack
    save(pack){

    }

    // fetch up to limit unconfirmed packs and update dup flag and retry_times and timestamp
    unconfirmed(limit){

    }

    // confirm and return message
    confirm(msg_id){

    }

    // receive and storage message
    receive(msg_id, payload){

    }

    // release and delete message
    release(msg_id){

    }
}