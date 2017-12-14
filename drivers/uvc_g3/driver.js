'use strict';

const Homey = require('homey');
const UnifiDeviceDiscovery = require('../../lib/UnifiDeviceDiscovery');

class UvcG3Driver extends Homey.Driver {

    _onDevice(device) {
        if (device && device.platform === 'UVC G3') {
            this.log('Found: ' + device.hostname, '@', device.ip);

            this._found.push(device);
        }
    }

    onPair(socket) {
        socket.on('list_devices', (data, callback) => {
            callback(null, this._found.map(device => (
                {
                    name: device.hostname,
                    data: device
                }
            )));
        });

        this._found = [];

        this._discovery = new UnifiDeviceDiscovery();
        this._discovery.on('device', this._onDevice.bind(this));
        this._discovery.start();
    }
}

module.exports = UvcG3Driver;