'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _heap = require('heap');

var _heap2 = _interopRequireDefault(_heap);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var MemoryStorage = function () {
    function MemoryStorage() {
        _classCallCheck(this, MemoryStorage);

        this.uid = 0;
        this.__packs__ = [];
        this.index = {};
        this.heap = new _heap2.default(function (a, b) {
            a.confirm = a.confirm || false;
            b.confirm = b.confirm || false;
            if (a.confirm && !b.confirm) {
                return true;
            } else if (!a.confirm && b.confirm) {
                return false;
            }
            if (a.timestamp == undefined && b.timestamp != undefined) {
                return true;
            } else if (a.timestamp != undefined && b.timestamp == undefined) {
                return false;
            } else if (a.timestamp == undefined && b.timestamp == undefined) {
                return a.msg_id > b.msg_id;
            }
            return a.timestamp > b.timestamp;
        });
        this.msgs = {};
    }

    // generate global unique id


    _createClass(MemoryStorage, [{
        key: 'uniqueId',
        value: function uniqueId() {
            return ++this.uid;
        }

        // insert pack and set timestamp

    }, {
        key: 'save',
        value: function save(pack) {
            pack.confirm = false;
            this.heap.push(pack);
            this.index[pack.msg_id] = pack;
        }

        // fetch up to limit unconfirmed packs

    }, {
        key: 'unconfirmed',
        value: function unconfirmed(limit) {
            var packs = [];
            while (limit > 0) {
                var pack = this.heap.pop();
                if (pack == undefined) {
                    break;
                } else if (pack.confirm) {
                    continue;
                } else {
                    packs.push(pack);
                    limit--;
                }
            }
            return packs;
        }

        // confirm and return message

    }, {
        key: 'confirm',
        value: function confirm(msg_id) {
            var pack = this.index[msg_id];
            if (pack != undefined) {
                pack.confirm = true;
                this.heap.updateItem(pack);
            }
            return pack;
        }

        // receive and storage message

    }, {
        key: 'receive',
        value: function receive(msg_id, payload) {
            this.msgs[msg_id] = payload;
        }

        // release and delete message

    }, {
        key: 'release',
        value: function release(msg_id) {
            return this.msgs[msg_id];
        }
    }]);

    return MemoryStorage;
}();

exports.default = MemoryStorage;
//# sourceMappingURL=MemoryStorage.js.map