Adds support for Ubiquiti UniFi Video devices in Homey.

TODO:
v Move login request from events to ufvapi
v save NVR ip at first discovery
v allow only 1 login
v product images
x check if API key is still needed or cookie can be used, snapshot
v get API key and save
v get camera data from NVR instead of discovery
v fix snapshot url
v camera: filter events by camera id -> forward event from driver to device instance
v motion alarm in Homey camera device
v fix double snapshot target
v Camera events in UI
v NVR events in UI
v Custom capabilities NVR (health:[status,phrase];server:[cpuload])
v Custom capabilities Camera (recording:[type];recordingMode,motion)
- update pairing flows
- load initial device state on start
- i18n event values
- fix snapshot Image deprecations
- Update README
  - Make sure API access is ON