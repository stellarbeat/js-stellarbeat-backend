import { HistoryArchiveState } from '../HistoryArchiveState';

export function getDummyHistoryArchiveState(): HistoryArchiveState {
	return JSON.parse(
		`{
    "version": 1,
    "server": "stellar-core 18.5.0 (d387c6a710322135ac076804490af22c4587b96d)",
    "currentLedger": 40351615,
    "networkPassphrase": "Public Global Stellar Network ; September 2015",
    "currentBuckets": [
        {
            "curr": "17c917990b64770e9139406cf57067abb250017017bc3882d433d81b4fe02303",
            "next": {
                "state": 0
            },
            "snap": "4776a45500b6552e8ac2836db8e9993d8c1fc89da25cc59a95ef85e1db1674c1"
        },
        {
            "curr": "570426ca3049de4525e224540bde6aa153d0fb75cbda5162b80c993f70f8f35e",
            "next": {
                "state": 0
            },
            "snap": "a80add0ee0ef4fcf5e74b0febb2d06d1f10bcef9bd26f4bf86a691c4846b109a"
        },
        {
            "curr": "c223a380931ec541e66ea71e120181772480b2c69915f8bc9b447980ecc33661",
            "next": {
                "state": 0
            },
            "snap": "eb04a2f8d1112d4c7f9d6b849d1ecf679acbb530ade8985bb475709a12989f2e"
        },
        {
            "curr": "4d179e5f720d5b3733eb619fd85e7574feb1532fd78dea83fa45068008c68f22",
            "next": {
                "state": 0
            },
            "snap": "75d9be63bf7d70bb7de471a0ca37c33c1f2f0ea23247ff9767a428546df0d7cb"
        },
        {
            "curr": "d75a53fcae672546a314381d7ad1bd39ed63fbd0e16a94331188804fc7054fbb",
            "next": {
                "state": 0
            },
            "snap": "8b0206897f6d35c358185a85d211c3f7fd99aea99c4591e1904c851e1c2bc8ab"
        },
        {
            "curr": "7afe40b5ae5de4d6252cab6088ff803d84b6d9511c2a81dede71fe2e4af7093c",
            "next": {
                "state": 0
            },
            "snap": "a03f317365925b45ba4ed714da9c478fa34f37c9b511bda9539e600121b5851e"
        },
        {
            "curr": "d8c2eabaa2cbfd2e510f2a3e5d7a14cc567888b0e127521228e16a7bdee84a05",
            "next": {
                "state": 0
            },
            "snap": "e00e3b056973369830da5737828728fa1bbc0cdfaf93534cca5e9092da4a0023"
        },
        {
            "curr": "3169bf74387a097414fff97c99514e12dac791a0d4047fd60a357f73186c09af",
            "next": {
                "state": 0
            },
            "snap": "9e5b01b50563bb3bec93ad1217abf6459652745bd8a0a2f5f7183312d139521b"
        },
        {
            "curr": "2204cc91211b53dc6ba56bf62f2278fc77a371cddb56daf92ac5af2e6356b9cf",
            "next": {
                "state": 0
            },
            "snap": "87a5a8f73ce20902b7df49d63d0813c9acfa98832f5ea1d7dcf053ecea1f95da"
        },
        {
            "curr": "cf523812e392e05fc2ce6b34a3abc289b6cc968d0c851bdd372d9c0e948a727b",
            "next": {
                "state": 0
            },
            "snap": "fce3b2ec1f89983d71065d31236c135d3cdc518ea3ed0de16b589dad7f548c03"
        },
        {
            "curr": "ed31280497ce5703b9fe8ab25ef9f50da56e359271a981da18d51b53d3b9853a",
            "next": {
                "state": 0
            },
            "snap": "0000000000000000000000000000000000000000000000000000000000000000"
        }
    ]
}`
	);
}
