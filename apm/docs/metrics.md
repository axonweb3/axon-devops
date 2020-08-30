# Monitor metrics description
This document is a description of the monitoring metrics and all headings correspond to the dashboard on Grafana.

## muta-node
### Resource Overview 
#### Overall total 5m load & average CPU used
- type: CPU
- description: Monitor overall cpu usage
<details>
<summary>Legende details</summary>

##### CPU Cores
Number of cores for all CPUs
```
count(node_cpu_seconds_total{job=~"node_exporter", mode='system'})
```
##### Total 5m load
load5 for all CPUs
```
sum(node_load5{job=~"node_exporter"})
```
##### Overall average used%
Average utilization of all CPUs
```
avg(1 - avg(irate(node_cpu_seconds_total{job=~"node_exporter",mode="idle"}[5m])) by (instance)) * 100
```
###### Alert threshold:
Utilization rate over 60%

##### Load5 Avg
load5 Avg for all CPUs
```
sum(node_load5{job=~"node_exporter"}) / count(node_cpu_seconds_total{job=~"node_exporter", mode='system'})
```
###### Alert threshold:
Load5 Avg greater than 0.7

</details>

#### Overall total memory & average memory used
- type: Memory
- description: Monitor overall memory usage

<details>
<summary>Legende details</summary>

##### Total
Total memory
```
sum(node_memory_MemTotal_bytes{job=~"node_exporter"})
```

##### Total Used
Overall used memory
```
sum(node_memory_MemTotal_bytes{job=~"node_exporter"} - node_memory_MemAvailable_bytes{job=~"node_exporter"})
```

##### Overall Average Used%
Utilization of all memory
```
(sum(node_memory_MemTotal_bytes{job=~"node_exporter"} - node_memory_MemAvailable_bytes{job=~"node_exporter"}) / sum(node_memory_MemTotal_bytes{job=~"node_exporter"}))*100
```
###### Alert threshold:
Utilization rate over 70%

</details>


#### Overall total disk & average disk used%
- type: Disk
- description: Monitor overall disk usage

<details>
<summary>Legende details</summary>

##### Total
Total memory
```
sum(avg(node_filesystem_size_bytes{job=~"node_exporter",fstype=~"xfs|ext.*"})by(device,instance))

```

##### Total Used
Overall used disk
```
sum(avg(node_filesystem_size_bytes{job=~"node_exporter",fstype=~"xfs|ext.*"})by(device,instance)) - sum(avg(node_filesystem_free_bytes{job=~"node_exporter",fstype=~"xfs|ext.*"})by(device,instance))

```

##### Overall Average Used%
Utilization of all disk
```
(sum(avg(node_filesystem_size_bytes{job=~"node_exporter",fstype=~"xfs|ext.*"})by(device,instance)) - sum(avg(node_filesystem_free_bytes{job=~"node_exporter",fstype=~"xfs|ext.*"})by(device,instance))) *100/(sum(avg(node_filesystem_avail_bytes{job=~"node_exporter",fstype=~"xfs|ext.*"})by(device,instance))+(sum(avg(node_filesystem_size_bytes{job=~"node_exporter",fstype=~"xfs|ext.*"})by(device,instance)) - sum(avg(node_filesystem_free_bytes{job=~"node_exporter",fstype=~"xfs|ext.*"})by(device,instance))))

```
###### Alert threshold:
Utilization rate over 70%

</details>


### Resource Details					
#### Internet traffic per hour 
- type: Network
- description: Traffic statistics

<details>
<summary>Legende details</summary>

##### receive
Receive statistics
```
increase(node_network_receive_bytes_total{instance=~"$node",device=~"$device"}[60m])
```

##### transmit
transmit statistics
```
increase(node_network_transmit_bytes_total{instance=~"$node",device=~"$device"}[60m])
```
</details>

#### CPU% Basic
- type: CPU
- description: Node CPU usage

<details>
<summary>Legende details</summary>

##### System
Average sy ratio
```
avg(irate(node_cpu_seconds_total{instance=~"$node",mode="system"}[5m])) by (instance) *100
```

##### User
Average sy ratio
```
avg(irate(node_cpu_seconds_total{instance=~"$node",mode="user"}[5m])) by (instance) *100
```

##### Iowait
Average sy ratio
```
avg(irate(node_cpu_seconds_total{instance=~"$node",mode="iowait"}[5m])) by (instance) *100
```

##### Total
Average CPU usage
```
(1 - avg(irate(node_cpu_seconds_total{instance=~"$node",mode="idle"}[5m])) by (instance))*100
```

##### Average used%
Not show, for alert
```
(1 - avg(irate(node_cpu_seconds_total{mode="idle"}[5m])) by (instance)) *100
```
###### Alert threshold:
Utilization rate over 60%
</details>











#### Memory Basic
- type: Memory
- description: Node memory usage

<details>
<summary>Legende details</summary>

##### Total
Total memory
```
node_memory_MemTotal_bytes{instance=~"$node"}
```

##### Used
Used memory
```
node_memory_MemTotal_bytes{instance=~"$node"} - node_memory_MemAvailable_bytes{instance=~"$node"}

```

##### Avaliable
Available memory size
```
node_memory_MemAvailable_bytes{instance=~"$node"}

```

##### Used%
Utilization of all memory
```
(1 - (node_memory_MemAvailable_bytes{instance=~"$node"} / (node_memory_MemTotal_bytes{instance=~"$node"})))* 100
```

##### {{instance}}-Used%
Not show, for alert
```
(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes))* 100
```
###### Alert threshold:
Utilization rate over 60%
</details>














#### Network bandwidth usage per second all
- type: Network
- description: Network bandwidth

<details>
<summary>Legende details</summary>

##### receive
Receive statistics per second
```
irate(node_network_receive_bytes_total{instance=~'$node',device=~"$device"}[5m])*8

```

##### transmit
Transmit statistics per second
```
irate(node_network_transmit_bytes_total{instance=~'$node',device=~"$device"}[5m])*8

```
</details>


#### System Load
- type: CPU
- description: System Load

<details>
<summary>Legende details</summary>

##### 1m
Load 1
```
node_load1{instance=~"$node"}
```

##### 5m
Load 5
```
node_load5{instance=~"$node"}
```

##### 15m
Load 15
```
node_load15{instance=~"$node"}
```

##### CPU cores
Number of cores for CPU
```
sum(count(node_cpu_seconds_total{instance=~"$node", mode='system'}) by (cpu,instance)) by(instance)
```

##### Load5 Avg
load5 Avg for CPU
```
avg(node_load5{instance=~"$node"}) / count(node_cpu_seconds_total{instance=~"$node", mode='system'})
```

##### Load5 Avg-{{instance}}
Not show, for alert
```
sum(node_load5) by (instance) / count(node_cpu_seconds_total{job=~"node_exporter", mode='system'}) by (instance)
```
Alert threshold:
Load5 Avg greater than 0.7
</details>


#### Disk R/W Data
- type: Disk
- description: Disk throughput

<details>
<summary>Legende details</summary>

##### Read bytes
Read bytes
```
node_load1{instance=~"$node"}
```

##### Written bytes
Written bytes
```
node_load5{instance=~"$node"}
```
</details>

#### Disk Space Used% Basic

- type: Disk
- description: IOPS

<details>
<summary>Legende details</summary>

##### mountpoint
Disk space utilization
```
(node_filesystem_size_bytes{instance=~'$node',fstype=~"ext.*|xfs",mountpoint !~".*pod.*"}-node_filesystem_free_bytes{instance=~'$node',fstype=~"ext.*|xfs",mountpoint !~".*pod.*"}) *100/(node_filesystem_avail_bytes {instance=~'$node',fstype=~"ext.*|xfs",mountpoint !~".*pod.*"}+(node_filesystem_size_bytes{instance=~'$node',fstype=~"ext.*|xfs",mountpoint !~".*pod.*"}-node_filesystem_free_bytes{instance=~'$node',fstype=~"ext.*|xfs",mountpoint !~".*pod.*"}))

```
</details>

#### Disk IOps Completed（IOPS）
- type: Disk
- description: IOPS

<details>
<summary>Legende details</summary>

##### Reads completed
Read IOPS
```
irate(node_disk_io_time_seconds_total{instance=~"$node"}[5m])
```

##### Writes completed
Write IOPS
```
irate(node_disk_io_time_seconds_total{instance=~"(.*):9100"}[5m])
```
</details>


#### Time Spent Doing I/Os
- type: Disk
- description: I/O Utilization

<details>
<summary>Legende details</summary>

##### IO time
I/O Utilization
```
irate(node_disk_io_time_seconds_total{instance=~"$node"}[5m])
```

##### {{instance}}-%util
Not show, for alert
```
irate(node_disk_io_time_seconds_total{instance=~"(.*):9100"}[5m])
```
Alert threshold:
Utilization rate over 80%
</details>


#### Disk R/W Time(Reference: less than 100ms)(beta)
- type: Disk
- description: Average response time

<details>
<summary>Legende details</summary>

##### Read time
Read time
```
irate(node_disk_read_time_seconds_total{instance=~"$node"}[5m]) / irate(node_disk_reads_completed_total{instance=~"$node"}[5m])
```

##### Write time
Write time
```
irate(node_disk_write_time_seconds_total{instance=~"$node"}[5m]) / irate(node_disk_writes_completed_total{instance=~"$node"}[5m])
```
</details>




#### Network Sockstat
- type: Network
- description: Socket State 

<details>
<summary>Legende details</summary>

##### CurrEstab
Number of ESTABLISHED state connections
```
node_netstat_Tcp_CurrEstab{instance=~'$node'}
```

##### TCP_tw status
Number of time_wait state connections
```
node_sockstat_TCP_tw{instance=~'$node'}
```

##### Sockets_used
Total number of all protocol sockets used
```
node_sockstat_sockets_used{instance=~'$node'}
```

##### UDP_inuse
Number of UDP sockets in use
```
node_sockstat_UDP_inuse{instance=~'$node'}
```

##### TCP_alloc
Number of TCP sockets(ESTABLISHED, sk_buff)
```
node_sockstat_TCP_alloc{instance=~'$node'}
```

##### Tcp_PassiveOpens
Number of passively opened tcp connections
```
irate(node_netstat_Tcp_PassiveOpens{instance=~'$node'}[5m])
```

##### Tcp_ActiveOpens
Number of active open tcp connections
```
irate(node_netstat_Tcp_ActiveOpens{instance=~'$node'}[5m])
```

##### Tcp_InSegs
Number of tcp messages received
```
irate(node_netstat_Tcp_InSegs{instance=~'$node'}[5m])
```

##### Tcp_OutSegs
Number of tcp messages transmit
```
irate(node_netstat_Tcp_OutSegs{instance=~'$node'}[5m])
```

##### Tcp_RetransSegs
Number of tcp messages retransmitted
```
irate(node_netstat_Tcp_RetransSegs{instance=~'$node'}[5m])
```

</details>


#### Open File Descriptor(left)/Context switches(right)
- type: Disk
- description: I/O Utilization

<details>
<summary>Legende details</summary>

##### used filefd
Number of open file fd
```
node_filefd_allocated{instance=~"$node"}
```

##### switches
Context switches
```
irate(node_context_switches_total{instance=~"$node"}[5m])
```
</details>



### Actuator Health
#### Muta Status
- type: Muta
- description: Muta service status
<details>
<summary>Legende details</summary>

##### active
Number of Muta services in up status
```
count(up{job="muta_exporter"} == 1) 
```
##### down
Number of Muta services in down status
```
count(up{job="muta_exporter"} == 0) 
```

##### /
Not show, for alert
```
up{job="muta_exporter"} == 0
```
###### Alert threshold:
The value of the Metric variable up is zero

</details>	


#### Node Status
- type: Node_exporter
- description: Node_exporter service status
<details>
<summary>Legende details</summary>

##### active
Number of Node_exporter services in up status
```
count(up{job="node_exporter"} == 1) 
```
##### down
Number of Node_exporter services in down status
```
count(up{job="node_exporter"} == 0) 
```

##### down
Not show, for alert
```
up{job="node_exporter"} == 0
```
###### Alert threshold:
The value of the Metric variable up is zero

</details>	


#### Promethues Status
- type: Promethues
- description: Promethues service status
<details>
<summary>Legende details</summary>

##### active
Number of Promethues services in up status
```
count(up{job="prometheus"} == 1) 
```
##### down
Number of Promethues services in down status
```
count(up{job="prometheus"} == 0) 
```

##### down
Not show, for alert
```
up{job="prometheus"} == 0
```
###### Alert threshold:
The value of the Metric variable up is zero

</details>	


#### Promtail Status
- type: Promtail
- description: Promtail service status
<details>
<summary>Legende details</summary>

##### active
Number of Promtail services in up status
```
count(count_over_time({job="muta"}[5m]))
```

##### /
Not show, for alert
```
count(count_over_time({job="muta"}[5m])) by (hostip)
```
###### Alert threshold:
The value of the Metric variable count is zero

</details>	


#### Jaeger Status
- type: Jaeger
- description: Jaeger service status
<details>
<summary>Legende details</summary>

##### jaeger-query-active
Number of Jaeger-query services in up status
```
count(up{instance=~"(.*):16687"} == 1)
```
##### jaeger-collector-active
Number of Jaeger-collector services in down status
```
count(up{instance=~"(.*):14269"} == 1)
```

##### jaeger-query-down
Number of Jaeger-query services in up status
```
count(up{instance=~"(.*):16687"} == 0)
```
##### jaeger-collector-down
Number of Jaeger-collector services in down status
```
count(up{instance=~"(.*):14269"} == 0)
```

##### /
Not show, for alert
```
up{instance=~"(.*):16687"} == 0
```
###### Alert threshold:
The value of the Metric variable up is zero


##### /
Not show, for alert
```
up{instance=~"(.*):14269"} == 0
```
###### Alert threshold:
The value of the Metric variable up is zero

</details>	


## muta-benchmark
#### TPS
- description: TPS for consensus
<details>
<summary>Legende details</summary>

##### TPS
TPS for consensus
```
avg(rate(muta_consensus_committed_tx_total[5m]))
```
</details>


#### consensus_p90
- description: Consensus time for P90
<details>
<summary>Legende details</summary>

##### time_usage(s)
Consensus time for P90
```
avg(histogram_quantile(0.90, sum(rate(muta_consensus_duration_seconds_bucket[5m])) by (le, instance)))
```
</details>

#### exec_p90
- description: Consensus exec time for P90
<details>
<summary>Legende details</summary>

##### /
Consensus exec time for P90
```
avg(histogram_quantile(0.90, sum(rate(muta_consensus_time_cost_seconds_bucket{type="exec"}[5m])) by (le, instance)))
```
</details>

#### put_cf_each_block_time_usage
- description: Average time per block for rocksdb running put_cf
<details>
<summary>Legende details</summary>

##### /
Average time per block for rocksdb running put_cf
```
avg (sum by (instance) (increase(muta_storage_put_cf_seconds[5m]))) / avg(increase(muta_consensus_height[5m]))
```
</details>

#### get_cf_each_block_time_usage

- description: Average time per block for rocksdb running get_cf
<details>
<summary>Legende details</summary>

##### /
Average time per block for rocksdb running get_cf
```
avg (sum by (instance) (increase(muta_storage_get_cf_seconds[5m]))) / avg(increase(muta_consensus_height[5m]))
```
</details>


#### processed_tx_request
- description: received transaction request count in last 5 minutes (the unit is count/second)
<details>
<summary>Legende details</summary>

##### Total
Total number of transaction requests
```
sum(rate(muta_api_request_result_total{type="send_transaction"}[5m]))
```

##### Success Total
Total number of successful transaction requests
```
sum(rate(muta_api_request_result_total{result="success",type="send_transaction"}[5m]))
```

##### instance
processed transaction request count in last 5 minutes (the unit is count/second)
```
rate(muta_api_request_result_total{result="success", type="send_transaction"}[5m])
```
</details>

#### current_height
- description: Chain current height
<details>
<summary>Legende details</summary>

##### {{instance}}
Node current height

```
sort_desc(muta_consensus_height)
```
</details>

#### synced_block
- description: Number of blocks synchronized by nodes
<details>
<summary>Legende details</summary>

##### {{instance}}
Number of blocks synchronized by nodes
```
muta_consensus_sync_block_total 
```
</details>


#### network_message_arrival_rate
- description: Estimate the network message arrival rate in the last five minutes
<details>
<summary>Legende details</summary>

##### /
Estimate the network message arrival rate in the last five minutes
```
(
  # broadcast_count * (instance_count - 1)
  sum(increase(muta_network_message_total{target="all", direction="sent"}[5m])) * (count(count by (instance) (muta_network_message_total)) - 1)
  # unicast_count
  + sum(increase(muta_network_message_total{target="single", direction="sent"}[5m]))
) 
/
# received_count
(sum(increase(muta_network_message_total{direction="received"}[5m])))
```
</details>


#### consensus_round_cost
- description: Number of rounds needed to reach consensus
<details>
<summary>Legende details</summary>

##### {{instance}}
Number of rounds needed to reach consensus
```
(muta_consensus_round > 0 )
```
</details>

#### mempool_cached_tx
- description: Number of transactions in the current mempool
<details>
<summary>Legende details</summary>

##### {{instance}}
Number of transactions in the current mempool
```
muta_mempool_tx_count
```
</details>

#### Saved peers
- description: Number of nodes saved peers
<details>
<summary>Legende details</summary>

##### {{instance}}
Number of nodes saved peers
```
muta_network_saved_peer_count
```
</details>

#### Consensus peers
- description: Number of consensus nodes
<details>
<summary>Legende details</summary>

##### {{instance}}
Number of consensus nodes
```
muta_network_tagged_consensus_peers
```
</details>

#### Connected Peers
- description: Number of nodes on the current connection
<details>
<summary>Legende details</summary>

##### {{instance}}
Number of nodes on the current connection
```
muta_network_connected_peers
```
</details>

#### Connected Consensus Peers (Minus itself)
- description: Number of consensus nodes on the current connection
<details>
<summary>Legende details</summary>

##### {{instance}}
Number of consensus nodes on the current connection
```
muta_network_connected_consensus_peers
```
</details>


#### Connecting Peers
- description: Number of active initiations to establish connections with other machines
<details>
<summary>Legende details</summary>

##### {{instance}}
Number of active initiations to establish connections with other machines
```
muta_network_outbound_connecting_peers
```
</details>

#### Unidentified Connections
- description: The number of connections in the handshake, requiring verification of the chain id
<details>
<summary>Legende details</summary>

##### {{instance}}
The number of connections in the handshake, requiring verification of the chain id
```
muta_network_unidentified_connections
```
</details>

#### Received messages in processing
- description: Number of messages being processed
<details>
<summary>Legende details</summary>

##### {{instance}}
Number of messages being processed
```
muta_network_received_message_in_processing_guage
```
</details>

#### Received messages in processing by ip
- description: Number of messages being processed (based on IP of received messages)
<details>
<summary>Legende details</summary>

##### {{instance}}
Number of messages being processed (based on IP of received messages)
```
muta_network_received_ip_message_in_processing_guage
```
</details>

#### Ping (ms)
- description: Response duration distribution of ping
<details>
<summary>Legende details</summary>

##### {{instance}}
Response duration distribution of ping
```
muta_network_ip_ping_in_ms
```
</details>

#### Ping by ip
- description: ping response time of the current node and other nodes
<details>
<summary>Legende details</summary>

##### {{instance}}
ping response time of the current node and other nodes
```
muta_network_ip_ping_in_ms
```
</details>


#### Disconnected count(To other peers)
- description: Disconnected count
<details>
<summary>Legende details</summary>

##### {{instance}}
Disconnected count
```
muta_network_ip_disconnected_count
```
</details>

#### Peer give up warnings
- description: Peer give up warnings
<details>
<summary>Legende details</summary>

##### Log labels
Peer give up warnings
```
{filename="/opt/muta.log"} |~ "WARN" |~ "give up"
```
</details>













