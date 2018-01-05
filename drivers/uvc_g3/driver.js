'use strict';

const Homey = require('homey');
const UfvApi = require('../../lib/ufvapi');

class UvcG3Driver extends Homey.Driver {

    onInit() {
        this._ufv = new UfvApi();

        this._ufv.on('ufv_discovered_uvc_g3', device => {
            if (this._found.hasOwnProperty(device.mac)) {
                return;
            }
            this._found[device.mac] = device;
            this._devices.push(device);

            this.log('Added: ' + device.hostname, '@', device.ip);
        });
    }

    onPair(socket) {
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

        socket.on('ufv_apikey_submit', (data, callback) => {
            Homey.ManagerSettings.set('ufv_apikey', data.apikey);
            this._ufv.SetApiKey(data.apikey);

            callback(null, 'API key set.');
        });

        this._ufv.on('ufv_discovered_nvr', nvr => {
            Homey.ManagerSettings.set('ufv_nvr', nvr);
            socket.emit('ufv_nvr', nvr);
        });

        this._ufv.Discover();
    }
}

module.exports = UvcG3Driver;