var HttpPack = require('./index').HttpPack.default;

var Encode = require('./lib/Protocol').Encode;
var Decode = require('./lib/Protocol').Decode;
var MSG_TYPE_COMPLETED = require('./lib/Protocol').MSG_TYPE_COMPLETED;


var buf1 = new Buffer('hello world!', 'utf-8');
var buf2 = new Buffer('hello foo!', 'utf-8');
var buf3 = new Buffer('hello bar!', 'utf-8');

var httpPack = new HttpPack({
    callback: function(payload, response){
        console.log(payload);
    },
    requestCallbackHook: function(error, response, body){
        console.log(body);
    },
    requestOpts: {
        url: 'http://192.168.102.73:8080'
    }
});

httpPack.commit(buf1, 0);
httpPack.commit(buf2, 1);
httpPack.commit(buf3, 2);
