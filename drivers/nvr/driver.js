'use strict';

const Homey = require('homey');
const UfvApi = require('../../lib/ufvapi');
const UfvConstants = require('../../lib/ufvconstants');

class NvrDriver extends Homey.Driver {

    onInit() {
        this.log('NVR driver initialized.');
    }

    onPair(socket) {
        this._devices = {};
        this._api = new UfvApi();

        this._api.on(UfvConstants.DEVICE_NVR, device => {
            this.log('NVR found: ' + device.hostname, '@', device.ip);

            if (!this._devices.hasOwnProperty(device.mac)) {
                this._devices[device.mac] = device;
            }
        });

        socket.on('list_devices', (data, callback) => {
            callback(null, Object.values(this._devices).map(device => (
                {
                    name: device.hostname,
                    data: device
                }
            )));
        });

        this._api.Discover();
    }
}

module.exports = NvrDriver;