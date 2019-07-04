'use strict';

const Homey = require('homey');
const Api = Homey.app.api;
const UfvConstants = require('../../lib/ufvconstants');
const fetch = require('node-fetch');

class UvcG3 extends Homey.Device {

    async onInit() {

        let apiHost = Homey.ManagerSettings.get(UfvConstants.API_HOST);
        let apiKey = Homey.ManagerSettings.get(UfvConstants.API_KEY);
        Api.SetApiHost(apiHost);
        Api.SetApiKey(apiKey);


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

        // Register images
        await this._registerSnapshotImage();
        await this._registerLastEventImage();
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

    /**
     * Method that registers a snapshot image and calls setCameraImage.
     * @private
     */
    async _registerSnapshotImage() {

        this._snapshotImage = new Homey.Image();

        // Set stream, this method is called when image.update() is called
        this._snapshotImage.setStream(async (stream) => {
            let fullUrl = null;

            await Api.FindCamera(this._data.mac)
                .then(cammera => Api.SnapshotUrl(cammera, 1080)
                    .then(url => fullUrl = url)
                    .catch(this.error))
                .catch(this.error);

            this.log('_registerSnapshotImage() -> setStream -> SnapshotUrl');


            if (!fullUrl) {
                this.error('_registerSnapshotImage() -> setStream ->', 'failed no image url available');
                throw new Error('No image url available');
            }

            this.log('_registerSnapshotImage() -> setStream ->', fullUrl);

            const headers = {
                "Host": Api.GetApiHost(),
                "Content-Type": "*/*"
            };

            const options = {
                method: "GET",
                headers: headers
            };

            // Fetch image from url and pipe
            const res = await fetch(fullUrl, options);
            if (!res.ok) {
                this.error('_registerSnapshotImage() -> setStream -> failed', res.statusText);
                throw new Error('Could not fetch image');
            }

            this.log('_registerSnapshotImage() -> setStream ->', fullUrl);

            res.body.pipe(stream);
        });

        // Register and set camera iamge
        return this._snapshotImage.register()
            .then(() => this.log('_registerSnapshotImage() -> registered'))
            .then(() => this.setCameraImage('snapshot', 'Snapshot', this._snapshotImage))
            .catch(this.error);
    }

    /**
     * Method that registers a last event image and calls setCameraImage
     * @private
     */
    async _registerLastEventImage() {

        this._snapshotImage = new Homey.Image();

        // Set stream, this method is called when image.update() is called
        this._snapshotImage.setStream(async (stream) => {
            let fullUrl = null;

            await Api.FindCamera(this._data.mac)
                .then(cammera => Api.SnapshotUrl(cammera, 1080, false)
                    .then(url => fullUrl = url)
                    .catch(this.error))
                .catch(this.error);

            if (Homey.env.DEBUG) {
                this.log('_registerSnapshotImage() -> setStream -> SnapshotUrl');
            }


            if (!fullUrl) {
                this.error('_registerSnapshotImage() -> setStream ->', 'failed no image url available');
                throw new Error('No image url available');
            }
            
            this.log('_registerSnapshotImage() -> setStream ->', fullUrl);

            const headers = {
                "Host": Api.GetApiHost(),
                "Content-Type": "*/*"
            };

            const options = {
                method: "GET",
                headers: headers
            };

            // Fetch image from url and pipe
            const res = await fetch(fullUrl, options);
            if (!res.ok) {
                this.error('_registerSnapshotImage() -> setStream -> failed', res.statusText);
                throw new Error('Could not fetch image');
            }

            res.body.pipe(stream);
        });

        // Register and set camera iamge
        return this._snapshotImage.register()
            .then(() => this.log('_registerSnapshotImage() -> registered'))
            .then(() => this.setCameraImage('lastEvent', 'Event snapshot', this._snapshotImage))
            .catch(this.error);
    }
}

module.exports = UvcG3;
