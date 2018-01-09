'use strict';

const os = require('os');
const dgram = require('dgram');
const { EventEmitter } = require('events');
const ip_calc = require('./lib/ip_calc');

const MCAST_ADDR = '233.89.188.1';
const MCAST_PORT = 10001;

var SKIP_IPS = [];

class UfvDiscovery extends EventEmitter {

    constructor() {
        super();

        this._devices = [];
        this._found = {};
        this._socket = this._createMulticastSocket(MCAST_PORT);
    }

    _formatMacAddress(buffer) {
        var i,
            tmp,
            mac;

        mac = '';

        for (i = 0; i < buffer.length; i++) {
            tmp = buffer[i].toString(16);

            if (tmp.length < 2) {
                tmp = '0' + tmp;
            }
            mac += tmp;
        }
        return mac.toUpperCase();
    }

    _formatIPAddress(buffer) {
        var i,
            a;

        a = [];

        for (i = 0; i < buffer.length; i++) {
            a.push(buffer[i]);
        }
        return a.join('.');
    }

    _getIntValue(array) {
        var val = 0;

        val += array.readUInt8(0);
        val = val << 8;
        val += array.readUInt8(1);
        val = val << 8;
        val += array.readUInt8(2);
        val = val << 8;
        val += array.readUInt8(3);

        return val;
    }

    _createMulticastSocket(port) {
        var socket = dgram.createSocket('udp4');

        socket.on('error', (error) => console.error(error));
        socket.on('message', (msg, rinfo) => {
            var device = this._parsePacket(rinfo, msg);

            if (device) {
                this._deviceFound(device);
            }
        });
        socket.on('listening', () => socket.setMulticastTTL(100));
        socket.bind(port);

        return socket;
    }

    _closeSocket(socket) {
        socket.close();
    }

    _parsePacket(info, packet) {
        if (!packet) {
            return;
        }

        var version = packet.slice(0, 1).readUInt8(0);
        var cmd = packet.slice(1, 2).readUInt8(0);
        var length = packet.slice(2, 4).readUInt16BE(0);

        if (length + 4 > packet.length) {
            return;
        }

        if (version == 1 && cmd == 0 && length == 0) {
            return;
        }

        if (version == 1 && cmd == 0) {
            return this._parseV1Packet(packet);
        } else {
            // not supported
        }
    }

    _parseV1Packet(packet) {
        var PKT_V1_HWADDR = 0x01,
            PKT_V1_IPINFO = 0x02,
            PKT_V1_FWVERSION = 0x03,
            PKT_V1_USERNAME = 0x06,
            PKT_V1_SALT = 0x07,
            PKT_V1_RND_CHALLENGE = 0x08,
            PKT_V1_CHALLENGE = 0x09,
            PKT_V1_MODEL = 0x14,
            PKT_V1_UPTIME = 0x0A,
            PKT_V1_HOSTNAME = 0x0B,
            PKT_V1_PLATFORM = 0x0C,
            PKT_V1_ESSID = 0x0D,
            PKT_V1_WMODE = 0x0E,
            PKT_V1_WEBUI = 0x0F;

        var i,
            l,
            end,
            msg,
            type,
            piece;

        i = 4;
        l = 2;

        msg = {};

        end = packet.length;

        while (i < end) {
            type = packet.readUInt8(i++);
            piece = packet.slice(i, i + 2);
            l = piece.readUInt16BE(0);
            i += piece.length;

            piece = packet.slice(i, i + l);

            switch (type) {
                case PKT_V1_FWVERSION:
                    msg.firmware = piece.toString();
                    break;

                case PKT_V1_HOSTNAME:
                    msg.hostname = piece.toString();
                    break;

                case PKT_V1_PLATFORM:
                    msg.platform = piece.toString();
                    break;

                case PKT_V1_IPINFO:
                    if (piece.length === 10) {
                        msg.mac = msg.mac || this._formatMacAddress(piece.slice(0, 6));
                        msg.ip = msg.ip || this._formatIPAddress(piece.slice(6, 10));
                    }
                    break;

                case PKT_V1_HWADDR:
                    msg.mac = this._formatMacAddress(piece);
                    break;

                case PKT_V1_WEBUI:
                    if (piece.length === 4) {
                        piece = this._getIntValue(piece);
                        msg.webPort = piece & 0xFFFF;
                        msg.webProtocol = ((piece >> 16) & 0xFFFF) > 0 ? 'https' : 'http';
                    }
                    break;

                case PKT_V1_WMODE:
                    if (piece.length === 4) {
                        msg.wmode = this._getIntValue(piece);
                        msg.isSetup = true;
                        if (msg.wmode === 0x100) {
                            msg.isSetup = false;
                        }
                    }
                    break;

                case PKT_V1_ESSID:
                    msg.essid = piece.toString();
                    break;

                case PKT_V1_MODEL:
                    msg.model = piece.toString();
                    break;

                default:
                    break;
            }
            i += l;
        }
        return msg;
    }

    _scanForDevices(callback) {
        let message = new Buffer([0x01, 0x00, 0x00, 0x00]);
        this._socket.send(message, MCAST_PORT, MCAST_ADDR, callback);

        function scanSubnet(subnet) {
            var i;

            function doSend(ip) {
                if (SKIP_IPS.indexOf(ip) > -1) {
                    return;
                }

                this._socket.send(message, ip, MCAST_PORT, function (result) {
                    if (result.resultCode === -109) {
                        SKIP_IPS.push(ip);
                    }
                });
            }

            for (i = subnet.netaddressInteger + 1; i < subnet.netbcastInteger; i++) {
                doSend(ip_calc.IPv4_intA_to_dotquadA(i));
            }
        }

        function scanInterfaces(interfaces) {
            var i,
                intf,
                subnets;

            subnets = [];

            for (i = 0; i < interfaces.length; i++) {
                intf = interfaces[i];

                if (intf.address.split('.').length !== 4 || intf.prefixLength <= 20) {
                    continue;
                }
                subnets.push(new ip_calc.IPv4_Address(intf.address, intf.prefixLength));
            }

            for (i = 0; i < subnets.length; i++) {
                scanSubnet(subnets[i]);
            }
        }

        scanInterfaces(os.networkInterfaces());
    }

    _deviceFound(device) {
        if (this._found.hasOwnProperty(device.mac)) {
            return;
        }
        this._found[device.mac] = device;
        this._devices.push(device);
        this.emit('device', device);
    }

    scan(timeout = 3000) {
        this._devices = [];
        this._found = {};

        return new Promise((resolve, reject) => {
            let timer = setTimeout(() => {
                this._closeSocket(this._socket);

                resolve(this._devices);
            }, timeout);

            let failed = (error) => {
                if (error) {
                    this._closeSocket(this._socket);
                    clearTimeout(timer);

                    reject(error);
                }
            };

            this._scanForDevices(failed);
        });
    }
}

module.exports = UfvDiscovery;