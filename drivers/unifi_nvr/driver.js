'use strict';

const Homey = require('homey');
const UnifiVideoDiscovery = require('../../lib/UnifiVideoDiscovery');

class UnifiNvrDriver extends Homey.Driver {

    onInit() {

    }

    _onUnifiVideoDevice(device) {
        if (device && device.platform === 'UniFi Video') {
            console.log('Device found: ' + device.hostname, '@', device.ip);

            this.found.push(device);
        }
    }

    onPair(socket) {
        socket.on('list_devices', (data, callback) => {
            callback(null, this.found.map(device => (
                {
                    name: device.hostname,
                    data: device
                }
            )));
        });
        
        this.found = [];
        
        this._discovery = new UnifiVideoDiscovery();
        this._discovery.on('device', this._onUnifiVideoDevice.bind(this));
        this._discovery.start();
    }
}

module.exports = UnifiNvrDriver;