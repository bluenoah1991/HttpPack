'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.DefaultRequestOpts = undefined;
exports.Request = Request;

var _request = require('request');

var _request2 = _interopRequireDefault(_request);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var DefaultRequestOpts = exports.DefaultRequestOpts = {
    method: 'POST',
    url: 'http://www.example.com/',
    forever: true,
    timeout: 60 * 1000,
    gzip: true,
    encoding: null
};

function Request(opts, callback) {
    return (0, _request2.default)(opts, function (error, response, body) {
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
//# sourceMappingURL=HttpClient.js.map