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

        this.nid = 0;
        this.itemsByIndex = {};
        this.messages = {};
        this.heap = new _heap2.default(function (a, b) {
            if (a.isConfirmed) {
                return true;
            } else if (b.isConfirmed) {
                return false;
            }
            return a.timestamp > b.timestamp;
        });
    }

    _createClass(MemoryStorage, [{
        key: 'generateId',
        value: function generateId() {
            return Promise.resolve(++this.nid);
        }
    }, {
        key: 'savePacket',
        value: function savePacket(packet) {
            this.heap.push(packet);
            this.itemsByIndex[packet.identifier] = packet;
            return Promise.resolve(null);
        }
    }, {
        key: 'unconfirmedPacket',
        value: function unconfirmedPacket(limit) {
            var packets = [];
            while (limit > 0) {
                var packet = this.heap.pop();
                if (packet == undefined) {
                    break;
                } else if (packet.isConfirmed) {
                    continue;
                } else {
                    packets.push(packet);
                    limit--;
                }
            }
            return Promise.resolve(packets);
        }
    }, {
        key: 'confirmPacket',
        value: function confirmPacket(identifier) {
            var packet = this.itemsByIndex[identifier];
            if (packet != undefined) {
                packet.isConfirmed = true;
                this.heap.updateItem(packet);
            }
            return Promise.resolve(packet);
        }
    }, {
        key: 'receivePacket',
        value: function receivePacket(identifier, payload) {
            this.messages[identifier] = payload;
            return Promise.resolve(null);
        }
    }, {
        key: 'releasePacket',
        value: function releasePacket(identifier) {
            var payload = this.messages[identifier];
            delete this.messages[identifier];
            return Promise.resolve(payload);
        }
    }]);

    return MemoryStorage;
}();

exports.default = MemoryStorage;
//# sourceMappingURL=MemoryStorage.js.map