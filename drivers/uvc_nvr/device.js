'use strict';

const Homey = require('homey');
const Ufv = Homey.app.ufv;

class UvcNvr extends Homey.Device {

    onInit() {
        this._data = this.getData();

        Ufv.on('nvr', () => {
            Ufv.GetSysInfo()
                .then(sysinfo => {
                    this.log('UVC-NVR version: ' + sysinfo.version
                        + ', running on: ' + sysinfo.platform);
                })
                .catch(this.error.bind(this, 'sysinfo'));

            Ufv.GetServer()
                .then(server => {
                    this.log('Server name: ' + server.name
                        + ', model: ' + server.model
                        + ', address: ' + server.host);
                })
                .catch(this.error.bind(this, 'server'));

            Ufv.GetCameras()
                .then(cameras => {
                    this._cameras = cameras;

                    for (let i = 0; i < this._cameras.length; i++) {
                        let camera = this._cameras[i];

                        this.log('Camera name: ' + camera.name
                            + ', model: ' + camera.model
                            + ', address: ' + camera.host);
                    }
                })
                .catch(this.error.bind(this, 'camera'));
        });

        new Homey.FlowCardAction('take_snapshot_nvr')
            .register()
            .registerRunListener((args, state) => {
                let snapshot = (camera, width) => Ufv.Snapshot(camera, width)
                    .then(buffer => this._onSnapshot(camera, buffer))
                    .catch(this.error.bind(this, 'snapshot'));

                Ufv.FindCamera(args.camera.mac)
                    .then(camera => snapshot(camera, args.width))
                    .catch(this.error.bind(this, 'camera.find'));

                return Promise.resolve(true);
            })
            .getArgument('camera')
            .registerAutocompleteListener((query, args) => {
                return this._cameras;
            });
    }

    _onSnapshot(camera, buffer) {
        let img = new Homey.Image('jpg');

        img.setBuffer(buffer);
        img.register()
            .then(() => {
                Homey.app.snapshotToken.setValue(img);

                new Homey.FlowCardTrigger('snapshot_created')
                    .register()
                    .trigger({
                        'snapshot_token': img,
                        'snapshot_camera': camera.name
                    });
            })
            .catch(this.error.bind(this, 'snapshot.register'));
    }
}

module.exports = UvcNvr;
