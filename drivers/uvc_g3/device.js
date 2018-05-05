'use strict';

const Homey = require('homey');
const Api = Homey.app.api;
const UfvConstants = require('../../lib/ufvconstants');

class UvcG3 extends Homey.Device {

    onInit() {
        this._data = this.getData();

        this._snapshotTrigger = new Homey.FlowCardTrigger(UfvConstants.EVENT_SNAPSHOT_CREATED);
        this._snapshotTrigger.register();

        new Homey.FlowCardAction(UfvConstants.ACTION_TAKE_SNAPSHOT)
            .register()
            .registerRunListener((args, state) => { // eslint-disable-line no-unused-vars
                let device = args.device.getData();

                Api.FindCamera(device.mac)
                    .then(camera => Api.Snapshot(camera, args.width)
                        .then(buffer => this._onSnapshotBuffer(camera, buffer))
                        .catch(this.error.bind(this, '[snapshot.buffer]'))
                    )
                    .catch(this.error.bind(this, '[camera.find]'));

                return Promise.resolve(true);
            });

        new Homey.FlowCardAction(UfvConstants.ACTION_SET_RECORDING_MODE)
            .register()
            .registerRunListener((args, state) => { // eslint-disable-line no-unused-vars
                let device = args.device.getData();

                Api.FindCamera(device.mac)
                    .then(camera => {
                        let isFullTimeEnabled = args.recording_mode === 'always';
                        let isMotionEnabled = args.recording_mode === 'motion';

                        Api.SetRecordingMode(camera, isFullTimeEnabled, isMotionEnabled)
                            .then(this.log.bind(this, '[recordingmode.set]'))
                            .catch(this.error.bind(this, '[recordingmode.set]'));
                    })
                    .catch(this.error.bind(this, '[camera.find]'));

                return Promise.resolve(true);
            });

        Api.on(UfvConstants.API_HOST, this._updateModel.bind(this));
        Api.on(UfvConstants.API_KEY, this._updateModel.bind(this));
    }

    _updateModel() {
        Api.GetSysInfo()
            .then(sysinfo => {
                if (Homey.env.DEBUG) {
                    this.log('[DEVICE] UVC-NVR found running UniFi Video version: ' + sysinfo.version);
                }
            })
            .catch(this.error.bind(this, '[sysinfo]'));

        Api.GetServer()
            .then(server => {
                if (Homey.env.DEBUG) {
                    this.log('[DEVICE] Server name: ' + server.name + ', address: ' + server.host);
                }
            })
            .catch(this.error.bind(this, '[server]'));

        Api.GetCameras()
            .then(cameras => {
                this._cameras = cameras;

                if (Homey.env.DEBUG) {
                    for (let i = 0; i < this._cameras.length; i++) {
                        let camera = this._cameras[i];

                        this.log('[DEVICE] Camera name: ' + camera.name
                            + ', model: ' + camera.model
                            + ', address: ' + camera.host);
                    }
                }
            })
            .catch(this.error.bind(this, '[camera]'));
    }

    _onSnapshotBuffer(camera, buffer) {
        let img = new Homey.Image('jpg');

        img.setBuffer(buffer);
        img.register()
            .then(() => {
                Homey.app.snapshotToken.setValue(img);

                this._snapshotTrigger.trigger({
                    'ufv_snapshot_token': img,
                    'ufv_snapshot_camera': camera.name
                });
            })
            .catch(this.error.bind(this, '[snapshot.register]'));
    }
}

module.exports = UvcG3;
