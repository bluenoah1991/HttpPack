'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.Encode = Encode;
exports.Decode = Decode;
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

var MSG_TYPE_SEND = exports.MSG_TYPE_SEND = 0x1;
var MSG_TYPE_ACK = exports.MSG_TYPE_ACK = 0x2;
var MSG_TYPE_RECEIVED = exports.MSG_TYPE_RECEIVED = 0x3;
var MSG_TYPE_RELEASE = exports.MSG_TYPE_RELEASE = 0x4;
var MSG_TYPE_COMPLETED = exports.MSG_TYPE_COMPLETED = 0x5;

var QoS0 = exports.QoS0 = 0;
var QoS1 = exports.QoS1 = 1;
var QoS2 = exports.QoS2 = 2;

function Encode() {
    var msg_type = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0x1;
    var qos = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
    var dup = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
    var msg_id = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 0;
    var payload = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : null;
    var offset = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : 0;
    var remaining_length = arguments.length > 6 && arguments[6] !== undefined ? arguments[6] : null;

    if (payload != undefined) {
        remaining_length = remaining_length || payload.length;
    } else {
        remaining_length = 0;
    }
    var buffer = Buffer.allocUnsafe(5 + remaining_length);
    var fixed_header = msg_type << 4 | qos << 2 | dup << 1;
    buffer.writeUInt8(fixed_header, 0);
    buffer.writeUInt16BE(msg_id, 1);
    buffer.writeUInt16BE(remaining_length, 3);
    if (payload != undefined) {
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

function Decode(buffer) {
    var offset = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;

    if (buffer == undefined) {
        throw 'Buffer cannot be null.';
    }
    var fixed_header = buffer.readInt8(offset);
    var msg_type = fixed_header >> 4;
    var qos = (fixed_header & 0xf) >> 2;
    var dup = (fixed_header & 0x3) >> 1;
    var msg_id = buffer.readUInt16BE(offset + 1);
    var remaining_length = buffer.readUInt16BE(offset + 3);
    var payload = Buffer.allocUnsafe(remaining_length);
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
//# sourceMappingURL=Protocol.js.map