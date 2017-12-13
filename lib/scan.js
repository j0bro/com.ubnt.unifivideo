'use strict';

const UnifiVideoDiscovery = require('./UnifiVideoDiscovery');

let callback = function (error, results) {
    console.log('Results: ' + JSON.stringify(results, null, 2));
};

let discovery = new UnifiVideoDiscovery();
discovery.on('device', onUnifiVideoDevice.bind(this));

discovery.start()
    .then(devices => callback(null, devices.map(device => (
        {
            name: device.hostname,
            data: device
        }
    ))))
    .catch(error => callback(error));

function onUnifiVideoDevice(device) {
    console.log('Device found: ' + device.platform, '@', device.ip, '(' + device.hostname + ')');
}