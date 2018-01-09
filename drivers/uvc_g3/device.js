'use strict';

const Homey = require('homey');
const Ufv = Homey.app.ufv;

class UvcG3 extends Homey.Device {

    onInit() {
        this._data = this.getData();

        this._snapshotTrigger = new Homey.FlowCardTrigger('ufv_snapshot_created');
        this._snapshotTrigger.register();

        new Homey.FlowCardAction('ufv_take_snapshot')
            .register()
            .registerRunListener((args, state) => {
                let device = args.device.getData();

                Ufv.FindCamera(device.mac)
                    .then(camera => Ufv.Snapshot(camera, args.width)
                        .then(buffer => this._onSnapshotBuffer(camera, buffer))
                        .catch(this.error.bind(this, '[snapshot.buffer]'))
                    )
                    .catch(this.error.bind(this, '[camera.find]'));

                return Promise.resolve(true);
            });

        new Homey.FlowCardAction('ufv_set_recording_mode')
            .register()
            .registerRunListener((args, state) => {
                let device = args.device.getData();

                Ufv.FindCamera(device.mac)
                    .then(camera => {
                        let isFullTimeEnabled = args.recording_mode === 'always';
                        let isMotionEnabled = args.recording_mode === 'motion';

                        Ufv.SetRecordingMode(camera, isFullTimeEnabled, isMotionEnabled)
                            .then(this.log.bind(this, '[recordingmode.set]'))
                            .catch(this.error.bind(this, '[recordingmode.set]'));
                    })
                    .catch(this.error.bind(this, '[camera.find]'));

                return Promise.resolve(true);
            });

        Ufv.on('ufv_discovered_nvr', this._updateModel.bind(this));
        Ufv.on('ufv_apikey_set', this._updateModel.bind(this));
    }

    _updateModel() {
        Ufv.GetSysInfo()
            .then(sysinfo => {
                if (Homey.env.DEBUG) {
                    this.log('UVC-NVR found running UniFi Video version: ' + sysinfo.version);
                }
            })
            .catch(this.error.bind(this, '[sysinfo]'));

        Ufv.GetServer()
            .then(server => {
                if (Homey.env.DEBUG) {
                    this.log('Server name: ' + server.name + ', address: ' + server.host);
                }
            })
            .catch(this.error.bind(this, '[server]'));

        Ufv.GetCameras()
            .then(cameras => {
                this._cameras = cameras;

                if (Homey.env.DEBUG) {
                    for (let i = 0; i < this._cameras.length; i++) {
                        let camera = this._cameras[i];

                        this.log('Camera name: ' + camera.name
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
