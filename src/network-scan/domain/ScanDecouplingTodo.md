## Goal: Make scan time independent of network transitive quorumSet size
At the moment scan time is a function of the network transitive quorumSet size. 
We want to know which nodes are validating in a timely fashion, 
but heavy analysis (e.g. network splitting sets, quorum intersection,...) could derail this as the network transitive quorumset grows. 

To achieve this we want to decouple node, organization and network scanning. 
* Node scanning: crawl the network, determine validation state, ledger state, uptime stats, etc...
* Organization scanning: Which nodes belong to which organization, uptime stats, ...
* Network scanning: Calculate the heavy network statistics, like Quorum intersection, Splitting sets,...

Node scanning (and organization scanning) should always run quickly and should not fall behind the actual network traffic.
The network scanning in turn could be run async, and show the results on the frontend with a 'last calculated at' specification.

## Status
At the moment the node, organization and network scanning business logic is more or less decoupled (see node, organization and network folder) 
and is handled as three separate transactions. But they are still run sequentially in the ScanRepository class.

## Todo
* Some data from the network scan entity (e.g. the latest closed ledger) should be moved to the node scan entity.
* NodeScan and OrganizationScan entities should be stored in database if needed.
* NodeScanRepository and OrganizationScanRepository classes have to be created 
with the responsibility to store and fetch the scan data and the node/organization snapshots that go with it. 
At the moment this responsibility is mingled in the ScanRepository class.
* Run network scan async



