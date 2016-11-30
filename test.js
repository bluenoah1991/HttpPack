var HttpPack = require('./index').HttpPack.default;

var Encode = require('./lib/Protocol').Encode;
var Decode = require('./lib/Protocol').Decode;
var MSG_TYPE_COMPLETED = require('./lib/Protocol').MSG_TYPE_COMPLETED;


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
        url: 'http://localhost:8080'
    }
});

httpPack.commit(buf1, 0);
httpPack.commit(buf2, 0);
httpPack.commit(buf3, 0);
