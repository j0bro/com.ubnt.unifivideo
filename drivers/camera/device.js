'use strict';

const Homey = require('homey');
const fetch = require('node-fetch');
const UfvConstants = require('../../lib/ufvconstants');

const Api = Homey.app.api;

class Camera extends Homey.Device {
  async onInit() {
    this.camera = await this.getDriver().getCamera(this.getData().id);

    // Snapshot trigger
    this._snapshotTrigger = new Homey.FlowCardTrigger(UfvConstants.EVENT_SNAPSHOT_CREATED);
    this._snapshotTrigger.register();

    // Action 'take snapshot'
    new Homey.FlowCardAction(UfvConstants.ACTION_TAKE_SNAPSHOT)
      .register()
      .registerRunListener((args, state) => { // eslint-disable-line no-unused-vars
        Api.snapshot(args.device.getData().id, args.width)
          .then(buffer => this._onSnapshotBuffer(this.camera, buffer))
          .catch(this.error.bind(this, 'Could not take snapshot.'));

        return Promise.resolve(true);
      });

    // Action 'set recording mode'
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
    this.log('Creating snapshot image.');

    this._snapshotImage = new Homey.Image();
    this._snapshotImage.setStream(async stream => {
      // Obtain snapshot URL
      let snapshotUrl = null;

      await Api.createSnapshotUrl(this.camera, 1920)
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

  onMotionStart() {
    this.log('onMotionStart');
    this.setCapabilityValue('alarm_motion', true);
  }

  onMotionEnd() {
    this.log('onMotionEnd');
    this.setCapabilityValue('alarm_motion', false);
  }

  onCamera(status) {
    this.log('onCamera');
    this.setCapabilityValue('camera_recording_status',
      Homey.__(`events.camera.${String(status.recordingIndicator).toLowerCase()}`));
  }
}

module.exports = Camera;
