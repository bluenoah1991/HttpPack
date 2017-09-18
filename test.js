var HttpPack = require('./index').HttpPack;
var Protocol = require('./index').Protocol;

var isBrowser=new Function("try {return this===window;} catch(e) {return false;}");

function checkStatus(response) {
    if (response.status >= 200 && response.status < 300) {
        return response;
    } else {
        var error = new Error(response.statusText);
        error.response = response;
        throw error;
    }
}

if(isBrowser()){
    require('whatwg-fetch');
} else {
    request = require('request');
}

function Request(url, body, callback){
    if(isBrowser()){
        fetch(url, {
            method: 'POST',
            body: body,
            headers: {
                'Content-Type': 'application/octet-stream'
            },
            credentials: 'same-origin'
        }).then(checkStatus).then(function(response){
            return response.arrayBuffer().then(function(buffer){
                // https://github.com/nodejs/node/issues/106
                callback(null, response, new Buffer(new Uint8Array(buffer)));
            });
        }).catch(function(error){
            callback(error, error.response, null);
        });
    } else {
        request({
            method: 'POST',
            body: body,
            url: url,
            headers: {
                'Content-Type': 'application/octet-stream'
            },
            forever: true,
            timeout: 60 * 1000,
            gzip: true,
            encoding: null
        }, function (error, response, body) {
            if (error != undefined) {
                callback(error, response, body);
            } else if (response.statusCode >= 200 && response.statusCode < 300) {
                callback(error, response, body);
            } else {
                var err = new Error(response.statusText);
                callback(error, response, null);
            }
        });
    }
}

var buf1 = new Buffer('hello world!', 'utf-8');
var buf2 = new Buffer('hello foo!', 'utf-8');
var buf3 = new Buffer('hello bar!', 'utf-8');
var buf4 = new Buffer('do you copy?', 'utf-8');

var httpPack = new HttpPack();
function loop(){
    httpPack.generateBody().then(function(body){
        Request('http://127.0.0.1:8080', body, function(error, response, body){
            httpPack.parseBody(body, function(payload){
                console.log(payload.toString('utf-8'));
            });
            setTimeout(loop, 1000);
        })
    });
}
loop();

httpPack.commit(buf1, 0);
httpPack.commit(buf2, 1);
httpPack.commit(buf3, 2);
httpPack.commit(buf4, 2);
