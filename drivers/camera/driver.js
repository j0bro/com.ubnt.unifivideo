'use strict';

const Homey = require('homey');
const UfvConstants = require('../../lib/ufvconstants');

class CameraDriver extends Homey.Driver {
  onInit() {
    this.api = Homey.app.api;
    this.cameras = {};

    this.api.on(UfvConstants.EVENT_NVR_CAMERA, this.setCamera.bind(this));
  }

  async onPairListDevices(data, callback) {
    const devices = Object.values(await this.api.getCameras()).map(camera => {
      this.setCamera(camera);

      return {
        data: { id: String(camera._id) },
        name: camera.name,
      };
    });

    callback(null, devices);
  }

  setCamera(camera) {
    this.cameras[camera._id] = camera;
  }

  getCamera(id) {
    return this.cameras[id] || null;
  }

  onMotion(motion) {
    this.log('onMotion.');
    const device = this.getDevice({ id: String(motion.cameraId) });

    if (motion.endTime === 0) {
      device.onMotionStart();
    } else {
      device.onMotionEnd();
    }
  }

  onRecording(recording) {
    this.log('onRecording');
    this.log(JSON.stringify(recording, null, 2));

    const device = this.getDevice({ id: String(recording.cameraId) });
    this.log(`RECORDING: eventType=[${recording.eventType}], cameraName=[${recording.meta.cameraName}]`);
    // TODO: use eventType to trigger specific event handler
    device.onRecording();
  }
}

module.exports = CameraDriver;
