'use strict';

const Homey = require('homey');
const UfvApi = require('../../lib/ufvapi');

class UvcG3Driver extends Homey.Driver {

    _onDevice(device) {
        this.log('Device: ' + device.hostname, '@', device.ip);

        if (this._found.hasOwnProperty(device.mac)) {
            return;
        }
        this._found[device.mac] = device;
        this._devices.push(device);
    }

    onInit() {
        this.log('Driver initialized.');
    }

    onPair(socket) {
        this._found = {};
        this._devices = [];

        this._ufv = new UfvApi();
        this._ufv.on('ufv_discovered_uvc_g3', device => this._onDevice(device));
        this._ufv.on('ufv_discovered_nvr', nvr => {
            Homey.ManagerSettings.set('ufv_nvr', nvr);
            socket.emit('ufv_nvr_set', nvr);
        });

        if (Homey.ManagerSettings.get('ufv_apikey')) {
            this.log('[DRIVER] API key is set');

            socket.emit('api_key_set');
        }

        socket.on('list_devices', (data, callback) => {
            callback(null, this._devices.map(device => (
                {
                    name: device.hostname,
                    data: device
                }
            )));
        });

        socket.on('ufv_apikey_submit', (data, callback) => {
            this.log('[DRIVER] API key set');

            Homey.ManagerSettings.set('ufv_apikey', data.apikey);
            this._ufv.SetApiKey(data.apikey);

            callback(null, '[DRIVER] API key set');
        });

        this._ufv.Discover();
    }
}

module.exports = UvcG3Driver;