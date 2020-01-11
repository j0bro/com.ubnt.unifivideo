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
- motion alarm in Homey camera device
- update pair flow:
  - discover NVR
  - log in 
  - discover cameras
- log in during pairing
- fix double snapshot target
- camera: filter events by camera id -> forward event from driver to device instance
- Camera events in UI
- NVR events in UI
- Complete API
- Update README
  - Make sure API access is ON