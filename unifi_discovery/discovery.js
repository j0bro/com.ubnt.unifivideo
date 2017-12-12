'use strict';

const os = require('os');
const dgram = require('dgram');

const ip_calc = require('./lib/ip_calc');
const UniFiBundles = require('./unifi_bundles');

const BIND_PORT = 0;

const MCAST_ADDR = '233.89.188.1';
const MCAST_PORT = 10001;

class UniFiVideoDiscovery  {

    constructor() {
        this.instance = this;
        this.bundles = new UniFiBundles();

        this.knownDevices = {};
        this.PORTS = [];
        this.SKIP_IPS = [];
        this.CK_SOCKET_ID = [];

        this.socketV1 = this.createMulticastSocket(BIND_PORT);
        this.socketV2 = this.createMulticastSocket(MCAST_PORT);
    }

    formatMacAddress(buffer) {
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

    formatIPAddress(buffer) {
        var i,
            a;

        a = [];

        for (i = 0; i < buffer.length; i++) {
            a.push(buffer[i]);
        }
        return a.join('.');
    }

    getIntValue(array) {
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

    deviceFound(device) {
        this.knownDevices[device.ip] = device;
        var i,
            m;
    
        device.model = device.discovered_by === 1 ? device.platform : device.model;
    
        if (device.model) {
            device.subtype = device.model.replace(/([^-]+)-?(.*)/, '$2');
            device.model = device.model.replace(/([^-]+)-?(.*)/, '$1');
        }
    
        if (device.discovered_by === 2 && !this.bundles.mfi_bundles[device.model]) {
            device.family = 'UniFi';
        } else if (device.discovered_by === 1 && this.bundles.unifi_bundles[device.model]) {
            device.family = 'UniFi';
        } else {
            device.family = 'AirOS';
        }
    
        if (this.bundles.unifi_bundles[device.model]) {
            device.display = this.bundles.unifi_bundles[device.model].display + (device.subtype.length == 0 ? '' : ' ' + device.subtype);
            device.is_cloudkey = !!this.bundles.unifi_bundles[device.model].is_cloudkey;
        } else if (this.bundles.mfi_bundles[device.model]) {
            device.display = this.bundles.mfi_bundles[device.model].display;
        } else {
            device.display = device.model;
        }
    
        console.log('device found: ' + JSON.stringify(device, null, 2));
    
        m = {
            action: 'DEVICE_DISCOVERED',
            device: device
        };
    
        for (i = 0; i < this.PORTS.length; i++) {
            this.PORTS[i].postMessage(m);
        }
    }

    createMulticastSocket(port) {
        var socket = dgram.createSocket('udp4');

        socket.on('error', (error) => console.error(error));
    
        socket.on('message', (msg, rinfo) => {
            var device = this.parsePacket(rinfo, msg);
         
            if (device) {
                this.deviceFound(device);
            }
        });

        socket.on('listening', () => socket.setMulticastTTL(100));
        
        socket.bind(port);

        return socket;
    }

    parsePacket(info, packet) {
        console.log('info: ' + JSON.stringify(info, null, 2));

        if (!packet) {
            return;
        }

        var version = packet.slice(0, 1).readUInt8(0);
        console.log('version: ' + version);

        var cmd = packet.slice(1, 2).readUInt8(0);
        console.log('cmd: ' + cmd);
        var length = packet.slice(2, 4).readUInt16BE(0);
        console.log('length: ' + length);

        if (length + 4 > packet.length) {
            // Packet reports invalid data length, discarding.
            return;
        }

        if (version == 1 && cmd == 0 && length == 0) {
            // ignore ubnt-dp request
            return;
        }

        if (version == 1 && cmd == 0) {
            return this.parseV1Packet(packet);
        } else if (version == 2) {
            return this.parseV2Packet(info, cmd, packet);
        } else {
            // not supported
        }
    }

    parseV1Packet(packet) {
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
        msg.discovered_by = 1;

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
                    msg.mac = msg.mac || this.formatMacAddress(piece.slice(0, 6));
                    msg.ip = msg.ip || this.formatIPAddress(piece.slice(6, 10));
                }
                break;

            case PKT_V1_HWADDR:
                msg.mac = this.formatMacAddress(piece);
                break;

            case PKT_V1_WEBUI:
                if (piece.length === 4) {
                    piece = this.getIntValue(piece);
                    msg.webPort = piece & 0xFFFF;
                    msg.webProtocol = ((piece >> 16) & 0xFFFF) > 0 ? 'https' : 'http';
                }
                break;

            case PKT_V1_WMODE:
                if (piece.length === 4) {
                    msg.wmode = this.getIntValue(piece);

                    // this is unifi-video specific
                    // 0x101 || 0x102 means it has already gone through wizard
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

    parseV2Packet(info, cmd, packet) {
        var PKT_V2_HWADDR = 0x01,
            PKT_V2_IPINFO = 0x02,
            PKT_V2_FWVERSION = 0x03,
            PKT_V2_UPTIME = 0x0A,
            PKT_V2_HOSTNAME = 0x0B,
            PKT_V2_PLATFORM = 0x0C,
            PKT_V2_ESSID = 0x0D,
            PKT_V2_WMODE = 0x0E,
            PKT_V2_SEQ = 0x12,
            PKT_V2_SOURCE_MAC = 0x13,
            PKT_V2_MODEL = 0x15,
            PKT_V2_SHORT_VER = 0x16,
            PKT_V2_DEFAULT = 0x17,
            PKT_V2_LOCATING = 0x18,
            PKT_V2_DHCPC = 0x19,
            PKT_V2_DHCPC_BOUND = 0x1A,
            PKT_V2_REQ_FW = 0x1B,
            PKT_V2_SSHD_PORT = 0x1C;

        var i,
            l,
            end,
            msg,
            type,
            piece;

        i = 4;
        l = 2;

        msg = {};
        msg.discovered_by = 2;

        end = packet.length;

        if (cmd != 6 && cmd != 9 && cmd != 11)
            return;

        while (i < end) {
            type = packet.readUInt8(i++);
            piece = packet.slice(i, i + 2);
            l = piece.readUInt16BE(0);
            i += piece.length;

            piece = packet.slice(i, i + l);

            switch (type) {

            case PKT_V2_HWADDR:
                msg.mac = this.formatMacAddress(piece);
                break;

            case PKT_V2_IPINFO:
                if (piece.length === 10) {
                    msg.mac = msg.mac || this.formatMacAddress(piece.slice(0, 6));
                    msg.ip = msg.ip || this.formatIPAddress(piece.slice(6, 10));
                }
                break;

            case PKT_V2_FWVERSION:
                msg.firmware = piece.toString();
                break;

            case PKT_V2_UPTIME:
                msg.uptime = this.getIntValue(piece);
                break;

            case PKT_V2_HOSTNAME:
                msg.hostname = piece.toString();
                break;

            case PKT_V2_PLATFORM:
                msg.platform = piece.toString();
                break;

            case PKT_V2_ESSID:
                msg.essid = piece.toString();
                break;

            case PKT_V2_WMODE:
                if (piece.length === 4) {
                    msg.wmode = this.getIntValue(piece);
                }
                break;

            case PKT_V2_SEQ:
                msg.seq = this.getIntValue(piece);
                break;

            case PKT_V2_SOURCE_MAC:
                msg.src_mac = this.formatMacAddress(piece);
                break;

            case PKT_V2_MODEL:
                msg.model = piece.toString();
                break;

            case PKT_V2_SHORT_VER:
                msg.short_ver = piece.toString();
                break;

            case PKT_V2_DEFAULT:
                msg.is_default = piece.readUInt8(0) == 1;
                break;

            case PKT_V2_LOCATING:
                msg.is_locating = piece.readUInt8(0) == 1;
                break;

            case PKT_V2_DHCPC:
                msg.is_dhcpc = piece.readUInt8(0) == 1;
                break;

            case PKT_V2_DHCPC_BOUND:
                msg.is_dhcpc_bound = piece.readUInt8(0) == 1;
                break;

            case PKT_V2_REQ_FW:
                msg.req_fwversion = piece.toString();
                break;

            case PKT_V2_SSHD_PORT:
                msg.sshd_port = this.getIntValue(piece);
                break;

            default:
                break;
            }
            i += l;
        }
    }

    scanForDevices() {
        var message;
    
        message = new Buffer([0x01, 0x00, 0x00, 0x00]);
    
        this.socketV1.send(message, MCAST_PORT, MCAST_ADDR, function (result) {
            console.log('Sent multicast search.');
        });
    
        function scanSubnet(subnet) {
            console.log('scanForDevices::scanSubnet');

            var i;
    
            function doSend(ip) {
                if (this.SKIP_IPS.indexOf(ip) > -1) {
                    //return;
                }
    
                this.socketV1.send(this.SOCKET_ID, message, ip, MCAST_PORT, function (result) {
                    if (result.resultCode === -109) {
                        this.SKIP_IPS.push(ip);
                    }
                });
            }
    
            for (i = subnet.netaddressInteger + 1; i < subnet.netbcastInteger; i++) {
                doSend(ip_calc.IPv4_intA_to_dotquadA(i));
            }
        }
    
        var interfaces = os.networkInterfaces();
        
        (function (interfaces) {
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
        })(interfaces);
    
        var m = {
            action: 'SCAN_COMPLETED'
        };
    
        for (var i = 0; i < this.PORTS.length; i++) {
            this.PORTS[i].postMessage(m);
        }
    }

    scanForV2Devices() {
        var message = new Buffer([0x02, 0x08, 0x00, 0x00]).arrayBuffer;
    
        for (var i = 0; i < this.CK_SOCKET_ID.length; i++) {
            var socket_id = this.CK_SOCKET_ID[i];
    
            this.socketV2.send(socket_id, message, MCAST_ADDR, MCAST_PORT, function (result) {
                // NOP
            });
        }
    
        if (!this.SOCKET_ID) {
            return;
        }
    
        function scanSubnet(subnet) {
            console.log('scanForV2Devices::scanSubnet');

            var i;
    
            function doSend(ip) {
                if (this.SKIP_IPS.indexOf(ip) > -1) {
                    //return;
                }
    
                this.socketV2.send(this.SOCKET_ID, message, ip, MCAST_PORT, function (result) {
                    if (result.resultCode === -109) {
                        this.SKIP_IPS.push(ip);
                    }
                });
            }
    
            for (i = subnet.netaddressInteger + 1; i < subnet.netbcastInteger; i++) {
                doSend(ip_calc.IPv4_intA_to_dotquadA(i));
            }
        }

        var interfaces = os.networkInterfaces();
        
        (function(interfaces) {
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
        })(interfaces);
    }

    start() {
        this.scanForDevices();
        this.scanForV2Devices();
    }
}

module.exports = UniFiVideoDiscovery;