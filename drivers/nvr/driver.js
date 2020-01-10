'use strict';

const Homey = require('homey');
const UfvApi = require('../../lib/ufvapi');
const UfvConstants = require('../../lib/ufvconstants');

class NvrDriver extends Homey.Driver {
  onInit() {
    this.log('NVR driver initialized.');
  }

  onPair(socket) {
    this.devices = {};
    this.api = new UfvApi();

    this.api.on(UfvConstants.DEVICE_NVR, device => {
      this.log(`Device found: ${device.hostname} (${device.ip})`);

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

    this.api.discover();
  }
}

module.exports = NvrDriver;
