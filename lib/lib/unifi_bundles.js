const mfi_bundles = {'M2M':{'display':'mFi '},'M2S':{'display':'mFi mPort Serial'},'P8U':{'display':'mFi mPower PRO'},'P6E':{'display':'mFi mPower PRO'},'P3U':{'display':'mFi mPower'},'P3E':{'display':'mFi mPower'},'P1U':{'display':'mFi mPower mini'},'P1E':{'display':'mFi mPower mini'},'IWO2U':{'display':'mFi In-Wall Outlet'},'IWD1U':{'display':'mFi Dimmer Switch'}};
const unifi_bundles = {'BZ2': {'base_model': 'BZ2', 'display': 'UniFi AP'}, 'BZ2LR': {'base_model': 'BZ2', 'display': 'UniFi AP-LR'}, 'S216150': {'base_model': 'US24P250', 'display': 'UniFi Switch 16 AT-150W'}, 'S224250': {'base_model': 'US24P250', 'display': 'UniFi Switch 24 AT-250W'}, 'S224500': {'base_model': 'US24P250', 'display': 'UniFi Switch 24 AT-500W'}, 'S248500': {'base_model': 'US24P250', 'display': 'UniFi Switch 48 AT-500W'}, 'S248750': {'base_model': 'US24P250', 'display': 'UniFi Switch 48 AT-750W'}, 'S28150': {'base_model': 'US24P250', 'display': 'UniFi Switch 8 AT-150W'}, 'U2HSR': {'base_model': 'U2HSR', 'display': 'UniFi AP-Outdoor+'}, 'U2IW': {'base_model': 'U2IW', 'display': 'UniFi AP-In Wall'}, 'U2Lv2': {'base_model': 'U2Sv2', 'display': 'UniFi AP-LR v2'}, 'U2O': {'base_model': 'BZ2', 'display': 'UniFi AP-Outdoor'}, 'U2Sv2': {'base_model': 'U2Sv2', 'display': 'UniFi AP v2'}, 'U5O': {'base_model': 'BZ2', 'display': 'UniFi AP-Outdoor 5G'}, 'U7E': {'base_model': 'U7E', 'display': 'UniFi AP-AC'}, 'U7EDU': {'base_model': 'U7PG2', 'display': 'UniFi AP-AC-EDU'}, 'U7Ev2': {'base_model': 'U7E', 'display': 'UniFi AP-AC v2'}, 'U7HD': {'base_model': 'U7HD', 'display': 'UniFi AP-AC-HD'}, 'U7IW': {'base_model': 'U7PG2', 'display': 'UniFi AP-AC-In Wall'}, 'U7IWP': {'base_model': 'U7PG2', 'display': 'UniFi AP-AC-InWall-Pro'}, 'U7LR': {'base_model': 'U7PG2', 'display': 'UniFi AP-AC-LR'}, 'U7LT': {'base_model': 'U7PG2', 'display': 'UniFi AP-AC-Lite'}, 'U7MP': {'base_model': 'U7PG2', 'display': 'UniFi AP-AC-Mesh-Pro'}, 'U7MSH': {'base_model': 'U7PG2', 'display': 'UniFi AP-AC-Mesh'}, 'U7O': {'base_model': 'U7E', 'display': 'UniFi AP-AC Outdoor'}, 'U7P': {'base_model': 'U7P', 'display': 'UniFi AP-Pro'}, 'U7PG2': {'base_model': 'U7PG2', 'display': 'UniFi AP-AC-Pro'}, 'U7SHD': {'base_model': 'U7HD', 'display': 'UniFi AP-AC-SHD'}, 'UGW3': {'base_model': 'UGW3', 'display': 'UniFi Security Gateway'}, 'UGW4': {'base_model': 'UGW4', 'display': 'UniFi Security Gateway-Pro'}, 'UGWXG': {'base_model': 'UGWXG', 'display': 'UniFi Security Gateway XG-8'}, 'US16P150': {'base_model': 'US24P250', 'display': 'UniFi Switch 16 POE-150W'}, 'US24': {'base_model': 'US24P250', 'display': 'UniFi Switch 24'}, 'US24P250': {'base_model': 'US24P250', 'display': 'UniFi Switch 24 POE-250W'}, 'US24P500': {'base_model': 'US24P250', 'display': 'UniFi Switch 24 POE-500W'}, 'US24PL2': {'base_model': 'US24PL2', 'display': 'UniFi Switch 24 L2 POE'}, 'US48': {'base_model': 'US24P250', 'display': 'UniFi Switch 48'}, 'US48P500': {'base_model': 'US24P250', 'display': 'UniFi Switch 48 POE-500W'}, 'US48P750': {'base_model': 'US24P250', 'display': 'UniFi Switch 48 POE-750W'}, 'US48PL2': {'base_model': 'US24PL2', 'display': 'UniFi Switch 48 L2 POE'}, 'US8': {'base_model': 'US24P250', 'display': 'UniFi Switch 8'}, 'US8P150': {'base_model': 'US24P250', 'display': 'UniFi Switch 8 POE-150W'}, 'US8P60': {'base_model': 'US24P250', 'display': 'UniFi Switch 8 POE-60W'}, 'USXG': {'base_model': 'USXG', 'display': 'UniFi Switch XG'}, 'p2N': {'base_model': 'p2N', 'display': 'PicoStation M2'}};
const uph_bundles = {'UP4': {'display': 'UniFi Phone-X'}, 'UP5': {'display': 'UniFi Phone'}, 'UP5c': {'display': 'UniFi Phone'}, 'UP5t': {'display': 'UniFi Phone-Pro'}, 'UP5tc': {'display': 'UniFi Phone-Pro'}, 'UP7': {'display': 'UniFi Phone-Executive'}, 'UP7c': {'display': 'UniFi Phone-Executive'}};
const uck_bundles = {'UCK':{ 'display' : 'UniFi CloudKey', 'is_cloudkey' : true }, 'UCKv2':{ 'display' : 'UniFi CloudKey version 2', 'is_cloudkey': true }};

class UniFiBundles {

    constructor() {
        this.mfi_bundles = mfi_bundles;
        this.unifi_bundles = unifi_bundles;
        this.uph_bundles = uph_bundles;
        this.uck_bundles = uck_bundles;
        
        for (var uph in uph_bundles) {
            this.unifi_bundles[uph] = uph_bundles[uph];
        }

        for (var uck in uck_bundles) {
            this.unifi_bundles[uck] = uck_bundles[uck];
        }
    }
}

module.exports = UniFiBundles;    