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