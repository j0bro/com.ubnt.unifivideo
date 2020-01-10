# UniFi Video

Adds support for Ubiquiti UniFi Video devices in Homey.

## Supported devices

* UniFi® NVR (Network Video Recorder):
	* UVC‑NVR
* UniFi® Video Camera G3 series:
	* UVC-G3
	* UVC-G3-AF
	* UVC-G3-DOME
	* UVC-G3-FLEX
	* UVC-G3-PRO
* UniFi® Video Camera G4 series:
	* UVC-G4-PRO

## Getting started

1. Create a user in the UniFi Video web interface that belongs to a group that has permissions `view camera` and `edit camera`.
2. Enable 'local access' for the user and remember the username and password, you will need them later.
3. Install this UniFi Video app on your Homey.
4. Start the 'add device wizard' in Homey, search for your UniFi NVR and/or cameras and add them to your devices. You will be prompted to enter the credentials of the UniFi Video user you created in step 2.
5. If the user credentials changed, they can be updated on the UniFi Video app's Settings page.

## Usage

* A flow action card can be used to create a snapshot, which is is saved to an Image tag.
* A flow can be triggered when a snapshot is created using the UniFi Video trigger card. This card supplies the name of the camera that created the snapshot and the snapshot image itself.
* A flow action card is available to set a camera's recording mode, being one of 'Don't record', 'Always record' or 'Record only motion'.

## Troubleshooting / FAQ

Q: I can't seem to create a snapshot, what's wrong?
A: Make sure the UniFi Video user is part of a group that has the `view camera` permission.

Q: I can't seem to change the recording mode on a camera, what's wrong?
A: Make sure the UniFi Video user is part of a group that has the `edit camera` permission.

Q: I am running UniFi Protect on a Cloud Key V2, can I use this app with it?
A: Unfortunately, UniFi Protect is not supported.

## Changelog

### Version 1.1.0
* Added support for events:
	* Health
	* Camera
	* Motion (yes, you can now use your cameras as motion sensors!)
	* Recording
	* Server

### Version 1.0.0
* Updated to comply with the new Homey App Store 
* Moved out of beta/testing

### Version 0.9.3
* Adds support for Homey Camera SDK
* Adds support for UVC G3 Flex
* Adds support for UVC G3 Micro
* Adds support for UVC G3 Pro
* Adds support for UVC G4 Pro

### Version 0.9.2
* NVR can't be discovered if it's on a different subnet than Homey ([#5][i5])
* UVC G3 Dome camera can't be discovered ([#6][i6])

### Version 0.9.1
* Device pairing wizard doesn't ask the user for the API key ([#1][i1])
* Add support for controlling recording mode ([#2][i2])

### Version 0.9.0
* Initial beta release.

## Feedback

If you find a bug or if you are missing a feature, please [create an issue here](https://github.com/j0bro/com.ubnt.unifivideo/issues).
Thank you for using this app!

[i1]: https://github.com/j0bro/com.ubnt.unifivideo/issues/1
[i2]: https://github.com/j0bro/com.ubnt.unifivideo/issues/2
[i5]: https://github.com/j0bro/com.ubnt.unifivideo/issues/5
[i6]: https://github.com/j0bro/com.ubnt.unifivideo/issues/6