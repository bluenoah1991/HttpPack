/**
 * bit           | 7 | 6 | 5 | 4 |  3  |  2  |    1     |    0     |
 * byte1         | Message Type  | QoS Level | Dup flag | Reserved |
 * byte1 - byte2 |              Message Identifiers
 * byte3 - byte4 |              Remaining Length
 * 
 * * * Message Type * *
 * 0 Reserved
 * 1 Send
 * 2 Ack
 * 3 Received
 * 4 Released
 * 5 Completed
 * 
 * * * QoS Level * *
 * 0 1 2
 * 
 * * * Dup flag * *
 * 0 1
 * 
 * * * Message Identifiers * *
 * 0 - 2^32
 */

export const MSG_TYPE_SEND = 0x1;
export const MSG_TYPE_ACK = 0x2;
export const MSG_TYPE_RECEIVED = 0x3;
export const MSG_TYPE_RELEASE = 0x4;
export const MSG_TYPE_COMPLETED = 0x5;

export const QoS0 = 0;
export const QoS1 = 1;
export const QoS2 = 2;

var isBrowser=new Function("try {return this===window;} catch(e) {return false;}");

function allocUnsafe(val){
    // check whether is running under nodejs or browser
    if (isBrowser()) {
        // https://github.com/feross/buffer
        return new Buffer(val);
    } else {
        return Buffer.allocUnsafe(val);
    }
}

export function Encode(msg_type = 0x1, qos = 0, dup = 0, msg_id = 0, payload = null, offset = 0, remaining_length = null){
    if(payload != undefined){
        remaining_length = remaining_length || payload.length;
    } else {
        remaining_length = 0;
    }  
    let buffer = allocUnsafe(5 + remaining_length);
    let fixed_header = (msg_type << 4) | (qos << 2) | (dup << 1);
    buffer.writeUInt8(fixed_header, 0);
    buffer.writeInt16BE(msg_id, 1);
    buffer.writeUInt16BE(remaining_length, 3);
    if(payload != undefined){
        payload.copy(buffer, 5, offset, offset + remaining_length);
    }
    return {
        msg_type: msg_type,
        qos: qos,
        dup: dup,
        msg_id: msg_id,
        remaining_length: remaining_length,
        total_length: 5 + remaining_length,
        payload: payload,
        buffer: buffer
    };
};

export function Decode(buffer, offset = 0){
    if(buffer == undefined){
        throw 'Buffer cannot be null.';
    }
    let fixed_header = buffer.readInt8(offset);
    let msg_type = fixed_header >> 4;
    let qos = (fixed_header & 0xf) >> 2;
    let dup = (fixed_header & 0x3) >> 1;
    let msg_id = buffer.readInt16BE(offset + 1);
    let remaining_length = buffer.readUInt16BE(offset + 3);
    let payload = allocUnsafe(remaining_length);
    buffer.copy(payload, 0, offset + 5, offset + 5 + remaining_length);
    return {
        msg_type: msg_type,
        qos: qos,
        dup: dup,
        msg_id: msg_id,
        remaining_length: remaining_length,
        total_length: 5 + remaining_length,
        payload: payload
    };
};