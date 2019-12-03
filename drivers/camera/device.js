'use strict';

const Homey = require('homey');
const Api = Homey.app.api;
const UfvConstants = require('../../lib/ufvconstants');
const fetch = require('node-fetch');

class Camera extends Homey.Device {

    async onInit() {
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

        // Register image
        await this._registerSnapshotImage();
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
                .then(camera => Api.SnapshotUrl(camera, 1920)
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
}

module.exports = Camera;
