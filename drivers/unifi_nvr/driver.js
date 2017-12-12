'use strict';

const Homey = require('homey');

class UniFiNvr extends Homey.Driver {

    onPairListDevices( data, callback ) {
        
        let devices = [
            {
                'name': 'My Device',
                'data': { },
        
                // Optional properties, these overwrite those specified in app.json:
                // "icon": "/path/to/another/icon.svg",
                // "capabilities": [ "onoff", "dim" ],
                // "capabilitiesOptions: { "onoff": {} },
                // "mobile": {},
        
                // Optional properties, device-specific:
                // "store": { "foo": "bar" },
                // "settings": {}
            }
        ];
        
        callback( null, devices );
    }
}

module.exports = UniFiNvr;