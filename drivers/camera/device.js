'use strict';

const Homey = require('homey');
const fetch = require('node-fetch');
const UfvConstants = require('../../lib/ufvconstants');

const Api = Homey.app.api;

class Camera extends Homey.Device {
  async onInit() {
    this._data = this.getData();

    this._snapshotTrigger = new Homey.FlowCardTrigger(UfvConstants.EVENT_SNAPSHOT_CREATED);
    this._snapshotTrigger.register();

    new Homey.FlowCardAction(UfvConstants.ACTION_TAKE_SNAPSHOT)
      .register()
      .registerRunListener((args, state) => { // eslint-disable-line no-unused-vars
        Api.snapshot(args.device.getData(), args.width)
          .then(buffer => this._onSnapshotBuffer(this._data, buffer))
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

    // Subscribe to camera specific events
    Api.on(UfvConstants.EVENT_NVR_CAMERA, this._onCameraEvent.bind(this));
    Api.on(UfvConstants.EVENT_NVR_MOTION, this._onMotionEvent.bind(this));
    Api.on(UfvConstants.EVENT_NVR_RECORDING, this._onRecordingEvent.bind(this));
  }

  _onCameraEvent(camera) {
    this.log(JSON.stringify(camera, null, 2));

    // TODO correct?
    if (camera.id === this._data.id) {
      this.log(`CAMERA: name=[${camera.name}], recordingIndicator=[${camera.recordingIndicator}]`);
    }
  }

  _onMotionEvent(motion) {
    // TODO: filter for this camera
    this.log(JSON.stringify(motion, null, 2));

    if (motion.endTime === 0) {
      this.log(`MOTION STARTED: cameraId=[${motion.cameraId}]`);
    } else {
      this.log(`MOTION ENDED: cameraId=[${motion.cameraId}]`);
    }
  }

  _onRecordingEvent(recording) {
    this.log(JSON.stringify(recording, null, 2));

    // TODO: filter for this camera
    this.log(`RECORDING: eventType=[${recording.eventType}], cameraName=[${recording.meta.cameraName}]`);
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

      await Api.createSnapshotUrl(this._data, 1920)
        .then(url => { snapshotUrl = url; })
        .catch(this.error.bind(this, 'Could not create snapshot URL.'));

      if (!snapshotUrl) {
        throw new Error('Invalid snapshot url.');
      }

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
}

module.exports = Camera;
