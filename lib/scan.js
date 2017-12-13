'use strict';

const UnifiDeviceDiscovery = require('./UnifiDeviceDiscovery');

let _onDevice = function (device) {
    console.log('Device found: ' + device.platform, '@', device.ip, '(' + device.hostname + ')');
};

let callback = function (error, data) {
    console.log(JSON.stringify(data, null, 2));
};

let discovery = new UnifiDeviceDiscovery();
discovery.on('device', _onDevice.bind(this));

discovery.start()
    .then(devices => callback(null, devices.map(device => (
        {
            name: device.hostname,
            data: device
        }
    ))))
    .catch(error => callback(error));