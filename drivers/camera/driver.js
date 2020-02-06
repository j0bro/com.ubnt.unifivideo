'use strict';

const Homey = require('homey');

class CameraDriver extends Homey.Driver {
  onInit() {
    this.api = Homey.app.api;
    this.cameras = {};

    this.log('Camera driver initialized.');
  }

  onPair(socket) {
    // Validate NVR IP address
    socket.on('validate', (data, callback) => {
      const nvrip = Homey.ManagerSettings.get('ufv:nvrip');
      callback(null, nvrip ? 'ok' : 'nok');
    });

    // Perform when device list is shown
    socket.on('list_devices', async (data, callback) => {
      callback(null, Object.values(await this.api.getCameras()).map(camera => {
        return {
          data: { id: String(camera._id) },
          name: camera.name,
        };
      }));
    });
  }

  async getCamera(id) {
    this.log(`getCamera for [${id}]`);
    this.log(Object.keys(this.cameras));
    this.log(Object.keys(this.cameras).length);

    if (Object.keys(this.cameras).length === 0) {
      this.log('Obtaining cameras from API...');
      const result = await this.api.getCameras();

      Object.values(result).forEach(camera => {
        this.log(`Adding camera [${camera._id}]`);
        this.cameras[camera._id] = camera;
      });
      this.log('Finished obtaining cameras from API.');
    }
    this.log(`# of cameras: ${Object.keys(this.cameras).length}`);
    this.log(`Found [${this.cameras[id].name}]`);

    return this.cameras[id];
  }

  onMotion(motion) {
    const device = this.getDevice({ id: String(motion.cameraId) });
    if (device instanceof Error) return;

    if (motion.endTime === 0) {
      device.onMotionStart();
    } else {
      device.onMotionEnd();
    }
  }

  onCamera(camera) {
    const device = this.getDevice({ id: String(camera._id) });
    if (device instanceof Error) return;

    const status = {
      recordingIndicator: camera.recordingIndicator,
    };
    device.onCamera(status);
  }
}

module.exports = CameraDriver;
