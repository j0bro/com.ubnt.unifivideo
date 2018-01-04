# UniFi Video

Adds support for Ubiquiti UniFi Video cameras in Homey.

## What's new?
* Everything; this is the initial release!

## Getting started
1. Create a user in the UniFi Video management application that belongs to a group that has permission to at least 'view cameras'.
2. Enable API access for this user and note/copy the API key.
3. Install this Homey app, go to its Settings screen and enter/paste the API key.
4. Start the 'add device wizard' in Homey, search for your connected UniFi camera(s), optionally name them and add them to your devices.

## Usage
* In the flow editor, a UniFi Camera action card can be used to create a snapshot, which is is saved to an Image tag.
* A flow can also be triggered when a snapshot is created using the UniFi Video application card. This card supplies the name of the camera that created the snapshot and the snapshot image itself.

## Supported devices

* UniFi® Video Camera G3 series:
	* UVC-G3
	* UVC-G3-AF
	* UVC-G3-DOME

## Changelog

### 0.9.1
Resolved issues:
* Device pairing wizard doesn't ask the user for the API key ([#1][i1])

[i1]: https://github.com/j0bro/com.ubnt.unifivideo/issues/1

### 0.9.0
Initial beta release. If you find a bug, please [create an issue here](https://github.com/j0bro/com.ubnt.unifivideo/issues).
