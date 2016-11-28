var mock = require('./mock');

var assert = require('chai').assert;

var HttpPack = require('../index').HttpPack.default;

var Encode = require('../lib/Protocol').Encode;
var Decode = require('../lib/Protocol').Decode;
var MSG_TYPE_COMPLETED = require('../lib/Protocol').MSG_TYPE_COMPLETED;

if(process.version < 'v5.10.0'){
    throw 'Require Nodejs version 5.10.0+';
}

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

describe('HttpPack', function(){
    it('send qos0 messages', function(done){
        var buf1 = new Buffer('hello world!', 'utf-8');
        var buf2 = new Buffer('hello foo!', 'utf-8');
        var buf3 = new Buffer('hello bar!', 'utf-8');

        var httpPack = new HttpPack({
            callback: function(payload, response){
                // pass
            },
            requestCallbackHook: function(error, response, body){
                assert.equal(response.statusCode, 200, 'response status equal 200');
                done(error);
            },
            requestOpts: {
                url: 'http://test.example.com/qos0'
            }
        });
        httpPack.commit(buf1, 0);
        httpPack.commit(buf2, 0);
        httpPack.commit(buf3, 0);
    });

    it('send qos1 messages', function(done){
        this.timeout(3000);
        var buf1 = new Buffer('hello world!', 'utf-8');
        var buf2 = new Buffer('hello foo!', 'utf-8');
        var buf3 = new Buffer('hello bar!', 'utf-8');

        var httpPack = new HttpPack({
            callback: function(payload, response){
                // pass
            },
            requestCallbackHook: function(error, response, body){
                if(response.statusCode == 200){
                    assert.isOk(true, 'response status equal 200');
                    done(error);
                }
            },
            requestOpts: {
                url: 'http://test.example.com/qos1'
            }
        });
        httpPack.commit(buf1, 1);
        httpPack.commit(buf2, 1);
        httpPack.commit(buf3, 1);
    });
    
    it('send qos2 messages', function(done){
        this.timeout(3000);
        var buf1 = new Buffer('hello world!', 'utf-8');
        var buf2 = new Buffer('hello foo!', 'utf-8');
        var buf3 = new Buffer('hello bar!', 'utf-8');

        var httpPack = new HttpPack({
            callback: function(payload, response){
                // pass
            },
            requestCallbackHook: function(error, response, body){
                var packs = parseBody(Buffer.from(body));
                if(response.statusCode == 200 && packs[0].msg_type == MSG_TYPE_COMPLETED){
                    assert.isOk(true, 'receive completed msg.');
                    done(error);
                }
            },
            requestOpts: {
                url: 'http://test.example.com/qos2'
            }
        });
        httpPack.commit(buf1, 2);
        httpPack.commit(buf2, 2);
        httpPack.commit(buf3, 2);
    });
});
