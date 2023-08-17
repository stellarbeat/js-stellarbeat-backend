## 0.3.0
BC Breaks: 
* Network environment variable now takes the full network string.
`NETWORK="Public Global Stellar Network ; September 2015"`
* To enable Deadman snitch heartbeat, set ENABLE_HEART_BEAT to true.
* To enable Sentry exception logging, set ENABLE_SENTRY to true.
* To enable AWS backup: set ENABLE_S3_BACKUP to true.
* To be able to connect to other nodes, set the following env variables and keep them up-to-date:
  * CRAWLER_NODE_LEDGER_VERSION=18,
  * CRAWLER_NODE_OVERLAY_VERSION=18,
  * CRAWLER_NODE_OVERLAY_MIN_VERSION=17.
* The script update-nodes was renamed to update-network and can be found in src/network/infrastructure/cli. Use yarn update-network to avoid being impacted by these changes.

## 0.4.0
Network update component refactored out of network component for better component cohesion

## 0.5.0
History scan module for archive scanning and verification. Improved module naming and structure.

## 0.6.0
* Replaced TRUSTED_TOP_TIER_NODES with NETWORK_QUORUM_SET in json format 
to define the nodes that are used to determine validating status for the network. 
It is now json format to allow grouping by org. For example: ["publicKeyA", "publicKeyB", ["ORG1ValidatorA", "ORG1ValidatorB"], ["ORG2ValidatorA", "ORG2ValidatorB"]];
This will map to a quorumSet with simple majority thresholds. In the example the main threshold is 3 where publicKeyA, publicKeyB, Org1 and Org2 get a vote. 
* Loop option is moved to network update cli command parameter instead of env variable. Added dry-run option to network update cli command.
* UpdateNetwork useCase is now ScanNetwork. UpdateNetwork now only updates the network information and does not perform any measurements/crawling/....
* NETWORK env variable is now split out in 
  * NETWORK_PASSPHRASE="Public Global Stellar Network ; September 2015"
  * NETWORK_ID=public (slug of the network name)
  * NETWORK_NAME="Public Stellar Network"
* CRAWLER env settings moved to network:
  * NETWORK_OVERLAY_VERSION=24
  * NETWORK_LEDGER_VERSION=20
  * NETWORK_OVERLAY_MIN_VERSION=17
  * NETWORK_STELLAR_CORE_VERSION=19.6.0 => should match latest version of https://github.com/stellar/stellar-core
## 0.7.0
* homeDomain is now a required and unique field for organization. Migration is handled automatically. 
* SeedDb is no longer necessary, you can define KNOWN_PEERS in the .env file to bootstrap the network-scan.
* BC break: NETWORK_KNOWN_PEERS is now a mandatory env variable. 
## 0.8.0
* AWS_REGION now mandatory env variable