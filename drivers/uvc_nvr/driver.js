'use strict';

const Homey = require('homey');
const UnifiDeviceDiscovery = require('../../lib/discovery');

class UvcNvrDriver extends Homey.Driver {

    _onDevice(device) {
        if (device && device.platform === 'UniFi Video') {
            this.log('Found: ' + device.hostname, '@', device.ip);

            if (this._found.hasOwnProperty(device.mac)) {
                return;
            }
            this._found[device.mac] = device;
            this._devices.push(device);
        }
    }

    onPair(socket) {
        this.log('onPair');

        this._found = {};
        this._devices = [];

        socket.on('list_devices', (data, callback) => {
            callback(null, this._devices.map(device => (
                {
                    name: device.hostname,
                    data: device
                }
            )));
        });

        this._discovery = new UnifiDeviceDiscovery();
        this._discovery.on('device', this._onDevice.bind(this));
        this._discovery.start();
    }
}

module.exports = UvcNvrDriver;
