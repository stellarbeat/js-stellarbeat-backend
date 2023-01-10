# Network component

## Description

Nodes and organizations are persisted through snapshotting.

## crawler and snapshotter/backend decoupling and storage for nodes

Every node is represented by one or more snapshots in the database. A snapshot has a start and end time to designate when it was 'active'. A node can only have one active snapshot at a time.

The snapshot contains the data that could change over time like name, ip, version,... Only when the data has changed, a new snapshot is created with the new data.

A node also has measurements, e.g. validating, active,... Every backend run these measurements are saved.

Every backend run, the crawler provides nodes to the snapshotter. The snapshotter has a database of the nodes it knows, and checks if the provided nodes have changed (geodata, name,...).
* If a node has changed: create a new snapshot for that node, and update the endtime for the previous active snapshot.
* If the node is new to the snapshotter: create a fresh snapshot for that node.
* A node could also be missing, maybe due to a software bug in the crawler. The snapshotter doesn't register a change. However, it does record a measurement for this node. e.g. active = false, validating = false, ...

A separate archiver process is run to deactivate snapshots of nodes that are inactive for over 7 days. A deactivated snapshot is no longer fed to the crawler on the next run. No more measurements for that node will be stored. this archival could be improved by looking at the lifetime of nodes. We don't need to store 7 days of measurements for a node that was only active for an hour in its lifetime, or was just used in a test(script) for example. 

## IN PROGRESS
currently in the progress of moving out js-stellar-domain classes (Node, Organization, Network) to the application layer. Will take some time to finish this. 