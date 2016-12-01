'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _request = require('request');

var _request2 = _interopRequireDefault(_request);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _moment = require('moment');

var _moment2 = _interopRequireDefault(_moment);

var _MemoryStorage = require('./MemoryStorage');

var _MemoryStorage2 = _interopRequireDefault(_MemoryStorage);

var _Protocol = require('./Protocol');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var MAX_REQUEST_NUMBER = 20;

var HttpPack = function () {
    function HttpPack(opts, callback) {
        _classCallCheck(this, HttpPack);

        this.callback = callback != undefined ? callback : function () {};
        this.requestCallbackHook = opts.requestCallbackHook != undefined ? opts.requestCallbackHook : function () {};
        this.max_request_number = opts.max_request_number != undefined ? opts.max_request_number : MAX_REQUEST_NUMBER;
        this.storage = opts.storage != undefined ? opts.storage : new _MemoryStorage2.default();
        this.defaultRequestOpts = {
            method: 'POST',
            url: 'http://www.example.com/',
            forever: true,
            timeout: 60 * 1000,
            gzip: true,
            callback: this.requestCallback.bind(this)
        };
        this.requestOpts = opts.requestOpts != undefined ? Object.assign({}, this.defaultRequestOpts, opts.requestOpts) : this.defaultRequestOpts;
        this.heartbeat = opts.heartbeat != undefined ? opts.heartbeat : 1000;
        this.loopHandle = setTimeout(this.loop.bind(this), this.heartbeat);
    }

    _createClass(HttpPack, [{
        key: 'commit',
        value: function commit(data) {
            var qos = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;

            var pack = (0, _Protocol.Encode)(_Protocol.MSG_TYPE_SEND, qos, 0, this.storage.uniqueId(), data);
            this.storage.save(pack);
        }
    }, {
        key: 'retry',
        value: function retry(pack) {
            if (pack.qos == _Protocol.QoS0) {
                return null;
            } else {
                if (pack.retry_times != undefined && pack.retry_times > 0) {
                    var retry_pack = _lodash2.default.cloneDeep(pack);
                    retry_pack.retry_times++;
                    retry_pack.timestamp = (0, _moment2.default)().add(retry_pack.retry_times * 5, 's');
                    return retry_pack;
                } else {
                    var _retry_pack = (0, _Protocol.Encode)(pack.msg_type, pack.qos, 1, pack.msg_id, pack.payload);
                    _retry_pack.retry_times = 1;
                    _retry_pack.timestamp = (0, _moment2.default)().add(_retry_pack.retry_times * 5, 's');
                    return _retry_pack;
                }
            }
        }
    }, {
        key: 'loop',
        value: function loop() {
            var packs = this.storage.unconfirmed(this.max_request_number);
            packs.forEach(function (pack) {
                var retry_pack = this.retry(pack);
                if (retry_pack != undefined) {
                    this.storage.save(retry_pack);
                }
            }.bind(this));
            // if(packs.length > 0){
            //     this.requestInstance = request(Object.assign({}, this.requestOpts, {
            //         body: this.combine(packs)
            //     }));
            // } else {
            //     this.loopHandle = setTimeout(this.loop.bind(this), this.heartbeat);
            // }
            var body = this.combine(packs);
            if (body.length === 0) {
                body = '';
            }
            this.requestInstance = (0, _request2.default)(Object.assign({}, this.requestOpts, {
                body: body
            }));
        }

        // combine packs return body

    }, {
        key: 'combine',
        value: function combine(packs) {
            return Buffer.concat(packs.map(function (pack) {
                return pack.buffer;
            }));
        }

        // split body return packs

    }, {
        key: 'split',
        value: function split(body) {
            var packs = [];
            var offset = 0;
            while (offset < body.length) {
                var pack = (0, _Protocol.Decode)(body, offset);
                packs.push(pack);
                offset += pack.total_length;
            }
            return packs;
        }
    }, {
        key: 'requestCallback',
        value: function requestCallback(error, response, body) {
            this.requestCallbackHook(error, response, body);
            if (!error && response.statusCode >= 200 && response.statusCode < 300) {
                if (typeof body == 'string') {
                    body = Buffer.from(body);
                }
                var packs = this.split(body);
                packs.forEach(function (pack) {
                    if (pack.msg_type == _Protocol.MSG_TYPE_SEND) {
                        if (pack.qos == _Protocol.QoS0) {
                            this.callback(pack.payload, response);
                        } else if (pack.qos == _Protocol.QoS1) {
                            var reply = (0, _Protocol.Encode)(_Protocol.MSG_TYPE_ACK, _Protocol.QoS0, 0, pack.msg_id);
                            this.storage.save(reply);
                        } else if (pack.qos == _Protocol.QoS2) {
                            this.storage.receive(pack.msg_id, pack.payload);
                            var _reply = (0, _Protocol.Encode)(_Protocol.MSG_TYPE_RECEIVED, _Protocol.QoS0, 0, pack.msg_id);
                            this.storage.save(_reply);
                        }
                    } else if (pack.msg_type == _Protocol.MSG_TYPE_ACK) {
                        this.storage.confirm(pack.msg_id);
                    } else if (pack.msg_type == _Protocol.MSG_TYPE_RECEIVED) {
                        this.storage.confirm(pack.msg_id);
                        var _reply2 = (0, _Protocol.Encode)(_Protocol.MSG_TYPE_RELEASE, _Protocol.QoS1, 0, pack.msg_id);
                        this.storage.save(_reply2);
                    } else if (pack.msg_type == _Protocol.MSG_TYPE_RELEASE) {
                        var payload = this.storage.release(pack.msg_id);
                        if (payload != undefined) {
                            this.callback(pack.payload, response);
                        }
                        var _reply3 = (0, _Protocol.Encode)(_Protocol.MSG_TYPE_COMPLETED, _Protocol.QoS0, 0, pack.msg_id);
                        this.storage.save(_reply3);
                    } else if (pack.msg_type == _Protocol.MSG_TYPE_COMPLETED) {
                        this.storage.confirm(pack.msg_id);
                    }
                }.bind(this));
            }
            this.loopHandle = setTimeout(this.loop.bind(this), this.heartbeat);
        }
    }]);

    return HttpPack;
}();

exports.default = HttpPack;
//# sourceMappingURL=HttpPack.js.map