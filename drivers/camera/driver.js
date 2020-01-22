'use strict';

const Homey = require('homey');

class CameraDriver extends Homey.Driver {
  onInit() {
    this.api = Homey.app.api;
    this.cameras = {};
  }

  async onPairListDevices(data, callback) {
    callback(null, Object.values(await this.api.getCameras()).map(camera => {
      return {
        data: { id: String(camera._id) },
        name: camera.name,
      };
    }));
  }

  async getCamera(id) {
    if (Object.values(this.cameras).length === 0) {
      this.cameras = await this.api.getCameras();
    }
    return this.cameras[id] || null;
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
