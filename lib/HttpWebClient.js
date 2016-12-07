'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.DefaultRequestOpts = undefined;
exports.Request = Request;

require('whatwg-fetch');

var DefaultRequestOpts = exports.DefaultRequestOpts = {
    method: 'POST',
    url: 'http://www.example.com/', // window.fetch does not use a url option, this is to be compatible with node
    credentials: 'same-origin'
};

function checkStatus(response) {
    if (response.status >= 200 && response.status < 300) {
        return response;
    } else {
        var error = new Error(response.statusText);
        error.response = response;
        throw error;
    }
}

function Request(opts, callback) {
    fetch(opts.url, opts).then(checkStatus).then(function (response) {
        return response.arrayBuffer().then(function (buffer) {
            // https://github.com/nodejs/node/issues/106
            callback(null, response, new Buffer(new Uint8Array(buffer)));
        });
    }).catch(function (error) {
        callback(error, error.response, null);
    });
}
//# sourceMappingURL=HttpWebClient.js.map