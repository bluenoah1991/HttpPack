"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.Encode = Encode;
exports.Decode = Decode;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

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

var isBrowser = new Function("try {return this===window;} catch(e) {return false;}");

function allocUnsafe(val) {
    // check whether is running under nodejs or browser
    if (isBrowser()) {
        // https://github.com/feross/buffer
        return new Buffer(val);
    } else {
        return Buffer.allocUnsafe(val);
    }
}

function Encode() {
    var msgType = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : MSG_TYPE_SEND;
    var qos = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : QoS0;
    var dup = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
    var identifier = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 0;
    var payload = arguments[4];

    var remainingLength = 0;
    if (payload != undefined) {
        remainingLength = payload.length;
    }
    var buffer = allocUnsafe(5 + remainingLength);
    var fixedHeader = msgType << 4 | qos << 2 | dup << 1;
    buffer.writeUInt8(fixedHeader, 0);
    buffer.writeUInt16BE(identifier, 1);
    buffer.writeUInt16BE(remainingLength, 3);
    if (payload != undefined) {
        payload.copy(buffer, 5, 0, remainingLength);
    }
    var packet = new Packet(msgType, qos, dup, identifier, payload);
    packet.buffer = buffer;
    return packet;
}

function Decode(buffer) {
    var offset = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;

    var fixedHeader = buffer.readInt8(offset);
    var msgType = fixedHeader >> 4;
    var qos = (fixedHeader & 0xf) >> 2;
    var dup = (fixedHeader & 0x3) >> 1;
    var identifier = buffer.readUInt16BE(offset + 1);
    var remainingLength = buffer.readUInt16BE(offset + 3);
    var payload = allocUnsafe(remainingLength);
    buffer.copy(payload, 0, offset + 5, offset + 5 + remainingLength);
    var packet = new Packet(msgType, qos, dup, identifier, payload);
    packet.buffer = buffer;
    return packet;
}

var Packet = exports.Packet = function Packet() {
    var msgType = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : MSG_TYPE_SEND;
    var qos = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : QoS0;
    var dup = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
    var identifier = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 0;
    var payload = arguments[4];

    _classCallCheck(this, Packet);

    this.msgType = msgType;
    this.qos = qos;
    this.dup = dup;
    this.identifier = identifier;
    this.payload = payload;
    if (payload == undefined) {
        this.remainingLength = 0;
    } else {
        this.remainingLength = payload.length;
    }
    this.totalLength = 5 + this.remainingLength;
    this.retryTimes = 0;
    this.timestamp = 0;
    this.isConfirmed = false;
    this.buffer = null;
};
//# sourceMappingURL=Protocol.js.map