'use strict';

const Homey = require('homey');

class UvcG3 extends Homey.Device {

    onInit() {
        this._data = this.getData();
        this.log(this._data);

        new Homey.FlowCardAction('take_snapshot_camera')
            .register()
            .registerRunListener((args, state) => {

                // TODO obtain ref to NVR in a nice way
                let nvr = Homey.ManagerDrivers.getDriver('uvc_nvr').getDevices()[0];
                if (nvr) {
                    nvr.takeSnapshot(this._data.mac, args.width);
                    
                    return Promise.resolve(true);
                } else {
                    return Promise.reject('Error resolving NVR device.');
                }
            });
    }
}

module.exports = UvcG3;
