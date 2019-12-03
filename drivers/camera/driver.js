'use strict';

const Homey = require('homey');
const UfvApi = require('../../lib/ufvapi');
const UfvConstants = require('../../lib/ufvconstants');

class CameraDriver extends Homey.Driver {

    onInit() {
        this.log('Camera driver initialized.');
    }

    onPair(socket) {
        this._devices = {};
        this._api = new UfvApi();

        this._api.on(UfvConstants.DEVICE_CAMERA, device => {
            this.log('Camera found: ' + device.hostname, '@', device.ip);

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

        socket.on('ufv_apikey_submit', (data, callback) => {
            // Update in settings
            Homey.ManagerSettings.set(UfvConstants.API_KEY, data.apikey);

            // Update in API
            this._api.SetApiKey(data.apikey);

            callback(null, '[PAIR] API key set');
        });

        this._api.Discover();
    }
}

module.exports = CameraDriver;