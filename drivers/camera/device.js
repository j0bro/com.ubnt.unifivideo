'use strict';

const Homey = require('homey');
const fetch = require('node-fetch');
const UfvConstants = require('../../lib/ufvconstants');

const Api = Homey.app.api;

class Camera extends Homey.Device {
  async onInit() {
    this._snapshotTrigger = new Homey.FlowCardTrigger(UfvConstants.EVENT_SNAPSHOT_CREATED);
    this._snapshotTrigger.register();

    new Homey.FlowCardAction(UfvConstants.ACTION_TAKE_SNAPSHOT)
      .register()
      .registerRunListener((args, state) => { // eslint-disable-line no-unused-vars
        Api.snapshot(args.device.getData().id, args.width)
          .then(buffer => this._onSnapshotBuffer(this._getCamera(), buffer))
          .catch(this.error.bind(this, 'Could not take snapshot.'));

        return Promise.resolve(true);
      });

    new Homey.FlowCardAction(UfvConstants.ACTION_SET_RECORDING_MODE)
      .register()
      .registerRunListener((args, state) => { // eslint-disable-line no-unused-vars
        const isFullTimeEnabled = args.recording_mode === 'always';
        const isMotionEnabled = args.recording_mode === 'motion';

        Api.setRecordingMode(args.device.getData(), isFullTimeEnabled, isMotionEnabled)
          .then(this.log.bind(this, '[recordingmode.set]'))
          .catch(this.error.bind(this, '[recordingmode.set]'));

        return Promise.resolve(true);
      });

    await this._createSnapshotImage();
  }

  _getCamera() {
    return this.getDriver().getCamera(this.getData().id);
  }

  _onSnapshotBuffer(camera, buffer) {
    const img = new Homey.Image('jpg');

    img.setBuffer(buffer);
    img.register()
      .then(() => {
        Homey.app.snapshotToken.setValue(img);

        this._snapshotTrigger.trigger({
          ufv_snapshot_token: img,
          ufv_snapshot_camera: camera.name,
        });
      })
      .catch(this.error.bind(this, '[snapshot.register]'));
  }

  async _createSnapshotImage() {
    this._snapshotImage = new Homey.Image();
    this._snapshotImage.setStream(async stream => {
      // Obtain snapshot URL
      let snapshotUrl = null;

      await Api.createSnapshotUrl(this._getCamera(), 1920)
        .then(url => { snapshotUrl = url; })
        .catch(this.error.bind(this, 'Could not create snapshot URL.'));

      if (!snapshotUrl) {
        throw new Error('Invalid snapshot url.');
      }
      this.log(snapshotUrl);

      // Fetch image
      const res = await fetch(snapshotUrl);
      if (!res.ok) throw new Error('Could not fetch snapshot image.');

      return res.body.pipe(stream);
    });

    // Register snapshot and set camera image
    this._snapshotImage.register()
      .then(() => this.setCameraImage('snapshot', 'Snapshot', this._snapshotImage))
      .catch(this.error);
  }

  // eslint-disable-next-line no-unused-vars
  onMotionStart() {
    this.log('Motion start.');
    this.setCapabilityValue('alarm_motion', true);
  }

  // eslint-disable-next-line no-unused-vars
  onMotionEnd() {
    this.log('Motion end.');
    this.setCapabilityValue('alarm_motion', false);
  }

  onCamera(status) {
    this.log('Camera');
    this.log(status);
    this.setCapabilityValue('camera_recording_status', status.recordingIndicator);
    // "MOTION_STARTED"
    // "MOTION_ENDED"
    // "MOTION_INPROGRESS"
    // "FTR_INPROGRESS"
    // "DISABLED"
    // "FAILED"
    // "DONE";
  }
}

module.exports = Camera;
