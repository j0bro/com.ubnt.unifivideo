'use strict';

const Homey = require('homey');

class CameraDriver extends Homey.Driver {
  onInit() {
    this.log('Camera driver initialized.');
  }

  onPair(socket) {
    Homey.app.api.getCameras()
      .then(devices => { this.devices = devices; })
      .catch(this.error.bind(this, 'Could not get cameras.'));

    socket.on('list_devices', (data, callback) => {
      callback(null, Object.values(this.devices).map(device => (
        {
          name: device.name,
          data: device,
        }
      )));
    });
  }
}

module.exports = CameraDriver;
