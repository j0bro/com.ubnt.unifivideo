'use strict';

const Homey = require('homey');
const UfvConstants = require('../../lib/ufvconstants');

class NvrDriver extends Homey.Driver {
  onPair(socket) {
    this.devices = {};

    const Api = Homey.app.api;

    Api.on(UfvConstants.DEVICE_NVR, device => {
      if (!Object.prototype.hasOwnProperty.call(this.devices, device.mac)) {
        this.devices[device.mac] = device;
      }
    });

    socket.on('list_devices', (data, callback) => {
      callback(null, Object.values(this.devices).map(device => (
        {
          name: device.hostname,
          data: device,
        }
      )));
    });

    Api.discover();
  }
}

module.exports = NvrDriver;
