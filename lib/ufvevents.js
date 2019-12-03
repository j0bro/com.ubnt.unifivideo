'use strict';

const http = require('http');
const WebSocket = require('ws');
const {EventEmitter} = require('events');
const UfvConstants = require('./ufvconstants');

class UfvEvents extends EventEmitter {

    constructor() {
        super();
    }

    // TODO keep?
    _log = (msg) => {
        var t = new Date().toLocaleTimeString();
        console.info('[' + t + '] ' + msg)
    };

    _connectWs = (cookie) => {
        // TODO get ip/port from discovery
        const url = 'wss://192.168.1.2:7443/ws/update?compress=false';
        const connection = new WebSocket(url, {
            rejectUnauthorized: false,
            headers: {
                Cookie: cookie
            }
        });

        connection.onopen = () => {
            connection.send('ping')
        };

        connection.onerror = (error) => {
            console.error(error)
        };

        connection.onmessage = (e) => {
            if (e.data === "pong") return;

            var evt = JSON.parse(e.data);

            switch (evt.dataType) {
                case "camera":
                    this._onCameraEvent(evt.data);
                    break;
                case "health":
                    this._onHealthEvent(evt.data);
                    break;
                case "motion":
                    this._onMotionEvent(evt.data);
                    break;
                case "recording":
                    this._onRecordingEvent(evt.data);
                    break;
                case "server":
                    this._onServerEvent(evt.data);
                    break;
            }
        };

        // TODO cancel interval on exit/disconnect
        let interval = setInterval(() => {
            connection.send("ping")
        }, 5000)
    };

    _onCameraEvent = (data) => {
        this.emit(UfvConstants.EVENT_NVR_CAMERA, data);
        this._log('CAMERA: name=[' + data.name + '], recordingIndicator=[' + data.recordingIndicator + ']')
    };

    _onHealthEvent = (data) => {
        this._log('HEALTH: status=[' + data.status + '], statusPhrase=[' + data.statusPhrase + ']')
    };

    _onMotionEvent = (data) => {
        if (data.endTime === 0) {
            this._log('MOTION STARTED: cameraId=[' + data.cameraId + ']')
        } else {
            this._log('MOTION ENDED: cameraId=[' + data.cameraId + ']')
        }
    };

    _onRecordingEvent = (data) => {
        this._log('RECORDING: eventType=[' + data.eventType + '], cameraName=[' + data.meta.cameraName + ']')
    };

    _onServerEvent = (data) => {
        this._log('SERVER: cpuLoad=[' + data.systemInfo.cpuLoad + ']')
    };

    _getSessionCookie = (response) => {
        let cookie = '';
        response.rawHeaders.forEach((item, index) => {
            if (item.toLowerCase() === 'set-cookie') {
                cookie = response.rawHeaders[index + 1]
            }
        });
        return cookie
    };

    start = (username, password) => {
        // TODO get ip/port from discovery
        let options = {
            host: '192.168.1.2',
            port: 7080,
            path: '/api/2.0/login',
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        };

        let req = http.request(options, res => {
            if (res.statusCode !== 200) {
                console.error(new Error('Request failed: ' + options.host + options.path + ' (status code: ' + res.statusCode + ')'));
                return
            }
            let data = [];

            res.on('data', chunk => data.push(chunk));
            res.on('end', () => {
                this._connectWs(this._getSessionCookie(res))
            })
        });

        // TODO handle error
        req.on('error', error => console.error(error));

        let credentials = {
            "email": username,
            "password": password
        };
        req.write(JSON.stringify(credentials))
    }
}

module.exports = UfvEvents;