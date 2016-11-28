var nock = require('nock');

var Encode = require('../lib/Protocol').Encode;
var Decode = require('../lib/Protocol').Decode;
var MSG_TYPE_SEND = require('../lib/Protocol').MSG_TYPE_SEND;
var MSG_TYPE_ACK = require('../lib/Protocol').MSG_TYPE_ACK;
var MSG_TYPE_RECEIVED = require('../lib/Protocol').MSG_TYPE_RECEIVED;
var MSG_TYPE_RELEASE = require('../lib/Protocol').MSG_TYPE_RELEASE;
var MSG_TYPE_COMPLETED = require('../lib/Protocol').MSG_TYPE_COMPLETED;
var QoS0 = require('../lib/Protocol').QoS0;

function parseBody(body){
    var packs = [];
    var offset = 0;
    while(offset < body.length){
        var pack = Decode(body, offset);
        packs.push(pack);
        offset += pack.total_length;
    }
    return packs;
}

nock('http://test.example.com')
    .persist()
    .post('/qos0')
    .reply(function(uri, requestBody){
        return [200, ''];
    });

nock('http://test.example.com')
    .persist()
    .post('/qos1')
    .reply(function(uri, requestBody){
        var packs = parseBody(Buffer.from(requestBody));
        if(packs[0].dup == 0){
            return [400, ''];
        } else {
            var replys = [];
            packs.forEach(function(pack){
                var reply = Encode(MSG_TYPE_ACK, QoS0, 0, pack.msg_id)
                replys.push(reply);
            });
            return [200, Buffer.concat(replys.map(function(reply){
                return reply.buffer;
            }))];
        }
    });

nock('http://test.example.com')
    .persist()
    .post('/qos2')
    .reply(function(uri, requestBody){
        var packs = parseBody(Buffer.from(requestBody));
        if(packs[0].dup == 0){
            return [400, ''];
        } else {
            var replys = [];
            packs.forEach(function(pack){
                if(pack.msg_type == MSG_TYPE_SEND){
                    var reply = Encode(MSG_TYPE_RECEIVED, QoS0, 0, pack.msg_id)
                    replys.push(reply);
                } else if(pack.msg_type == MSG_TYPE_RELEASE){
                    var reply = Encode(MSG_TYPE_COMPLETED, QoS0, 0, pack.msg_id)
                    replys.push(reply);
                }
            });
            return [200, Buffer.concat(replys.map(function(reply){
                return reply.buffer;
            }))];
        }
    });