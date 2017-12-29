'use strict';

const Homey = require('homey');
const Ufv = Homey.app.ufv;

class UvcG3 extends Homey.Device {

    onInit() {
        this._data = this.getData();

        new Homey.FlowCardAction('take_snapshot_camera')
            .register()
            .registerRunListener((args, state) => {
                let snapshot = (camera, width) => Ufv.Snapshot(camera, width)
                    .then(buffer => this._onSnapshot(camera, buffer))
                    .catch(this.error.bind(this, 'snapshot'));

                Ufv.FindCamera(args.camera.mac)
                    .then(camera => snapshot(camera, args.width))
                    .catch(this.error.bind(this, 'camera.find'));

                return Promise.resolve(true);
            });
    }
}

module.exports = UvcG3;
