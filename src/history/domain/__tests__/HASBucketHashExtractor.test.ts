import { HistoryArchiveState } from '../history-archive/HistoryArchiveState';
import { HASBucketHashExtractor } from '../history-archive/HASBucketHashExtractor';

it('should extract all urls from HAS', function () {
	const historyArchiveState: HistoryArchiveState = JSON.parse(
		'{\n' +
			'    "version": 1,\n' +
			'    "server": "stellar-core 18.5.0 (d387c6a710322135ac076804490af22c4587b96d)",\n' +
			'    "currentLedger": 40351615,\n' +
			'    "networkPassphrase": "Public Global Stellar Network ; September 2015",\n' +
			'    "currentBuckets": [\n' +
			'        {\n' +
			'            "curr": "17c917990b64770e9139406cf57067abb250017017bc3882d433d81b4fe02303",\n' +
			'            "next": {\n' +
			'                "state": 0\n' +
			'            },\n' +
			'            "snap": "4776a45500b6552e8ac2836db8e9993d8c1fc89da25cc59a95ef85e1db1674c1"\n' +
			'        },\n' +
			'        {\n' +
			'            "curr": "570426ca3049de4525e224540bde6aa153d0fb75cbda5162b80c993f70f8f35e",\n' +
			'            "next": {\n' +
			'               "state": 1,\n' +
			'               "output": "1230000000000000000000000000000000000000000000000000000000000000"\n' +
			'               },\n' +
			'            "snap": "a80add0ee0ef4fcf5e74b0febb2d06d1f10bcef9bd26f4bf86a691c4846b109a"\n' +
			'        }\n' +
			'    ]\n' +
			'}'
	);

	expect(HASBucketHashExtractor.getHashes(historyArchiveState)).toEqual([
		'17c917990b64770e9139406cf57067abb250017017bc3882d433d81b4fe02303',
		'4776a45500b6552e8ac2836db8e9993d8c1fc89da25cc59a95ef85e1db1674c1',
		'570426ca3049de4525e224540bde6aa153d0fb75cbda5162b80c993f70f8f35e',
		'a80add0ee0ef4fcf5e74b0febb2d06d1f10bcef9bd26f4bf86a691c4846b109a',
		'1230000000000000000000000000000000000000000000000000000000000000'
	]);
});
