'use strict';

const Homey = require('homey');

class CameraDriver extends Homey.Driver {
  async onPairListDevices(data, callback) {
    const devices = await Homey.app.api.getCameras();

    callback(null, Object.values(devices).map(device => {
      // Add the required id property
      Object.assign(device, { id: device._id });

      return {
        name: device.name,
        data: device,
      };
    }));
  }
}

module.exports = CameraDriver;
