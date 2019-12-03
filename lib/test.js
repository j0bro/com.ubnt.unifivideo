'use strict';

const UfvConstants = require('./ufvconstants');
const UfvDiscovery = require('./ufvdiscovery');
const UfvEvents = require('./ufvevents');

let events = new UfvEvents();
events.start("j.brosens+ubiquiti@gmail.com", "D@gpauwoog23!");

let _onDevice = function (device) {
    console.log('Device found: ' + device.platform, '@', device.ip, '(' + device.hostname + ')');
};

let callback = function (error, data) {
    console.log(JSON.stringify(data, null, 2));
};

let discovery = new UfvDiscovery();
discovery.on(UfvConstants.DEVICE_ANY, _onDevice.bind(this));

discovery.scan()
    .then(devices => callback(null, devices))
    .catch(error => callback(error));