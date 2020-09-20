
# Muta alert table
## muta-node
<table>
<thead>
  <tr>
    <th>Panel </th>
    <th>Expression</th>
    <th>Level</th>
    <th>Thresholds</th>
    <th>Description</th>
  </tr>
</thead>
<tbody>
  <tr>
    <td rowspan="2">$job：Overall total 5m load &amp; average CPU used%</td>
    <td>avg(1 - avg(irate(<br>node_cpu_seconds_total{job=~"node_exporter",mode="idle"}[5m])<br>) <br>by (instance)) * 100</td>
    <td>p0</td>
    <td>&gt;= 90%</td>
    <td>CPU Utilization</td>
  </tr>
  <tr>
    <td>sum(node_load5{job=~"node_exporter"}) <br>/ count(node_cpu_seconds_total{job=~"node_exporter", mode='system'})</td>
    <td>p0</td>
    <td>&gt;= 0.90</td>
    <td>CPU load5 </td>
  </tr>
  <tr>
    <td>$job：Overall total memory &amp; average memory used%</td>
    <td>(sum(node_memory_MemTotal_bytes{job=~"node_exporter"} <br>-node_memory_MemAvailable_bytes{job=~"node_exporter"})<br>/ sum(node_memory_MemTotal_bytes{job=~"node_exporter"}))*100</td>
    <td>p0</td>
    <td>&gt;= 90%</td>
    <td>Memory utilization </td>
  </tr>
  <tr>
    <td>$job：Overall total disk &amp; average disk used%</td>
    <td>(sum(avg(node_filesystem_size_bytes{job=~"node_exporter",fstype=~"xfs|ext.*"})<br>by(device,instance))<br> - sum(avg(node_filesystem_free_bytes{job=~"node_exporter",fstype=~"xfs|ext.*"})<br>by(device,instance))) *100<br>/(sum(avg(node_filesystem_avail_bytes{job=~"node_exporter",fstype=~"xfs|ext.*"})<br>by(device,instance))<br>+(sum(avg(node_filesystem_size_bytes{job=~"node_exporter",fstype=~"xfs|ext.*"})<br>by(device,instance))<br> -sum(avg(node_filesystem_free_bytes{job=~"node_exporter",fstype=~"xfs|ext.*"})<br>by(device,instance))))</td>
    <td>p0</td>
    <td>&gt;= 90%</td>
    <td>Over 90% utilization of disk</td>
  </tr>
  <tr>
    <td>CPU% Basic</td>
    <td>(1 - avg(irate(node_cpu_seconds_total{mode="idle"}[5m])) by (instance)) *100</td>
    <td>p0</td>
    <td>&gt;= 90%</td>
    <td>Node CPU utilization </td>
  </tr>
  <tr>
    <td>Memory Basic</td>
    <td>(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes))* 100</td>
    <td>p0</td>
    <td>&gt;= 90%</td>
    <td>Node memory utilization</td>
  </tr>
  <tr>
    <td>System Load</td>
    <td>sum(node_load5) by (instance) / count(node_cpu_seconds_total{job=~"node_exporter", mode='system'}) by (instance)</td>
    <td>p0</td>
    <td>&gt;= 0.90</td>
    <td>Node CPU load5 </td>
  </tr>
  <tr>
    <td>Disk Space Used% Basic</td>
    <td>(node_filesystem_size_bytes{fstype=~"ext.*|xfs",mountpoint !~".*pod.*"}<br>-node_filesystem_free_bytes{fstype=~"ext.*|xfs",mountpoint !~".*pod.*"})*100<br>/(node_filesystem_avail_bytes {fstype=~"ext.*|xfs",mountpoint !~".*pod.*"}<br>+(node_filesystem_size_bytes{fstype=~"ext.*|xfs",mountpoint !~".*pod.*"}<br>-node_filesystem_free_bytes{fstype=~"ext.*|xfs",mountpoint !~".*pod.*"}))</td>
    <td>p0</td>
    <td>&gt;= 90%</td>
    <td>Node disk utilization </td>
  </tr>
  <tr>
    <td>Time Spent Doing I/Os</td>
    <td>irate(node_disk_io_time_seconds_total{instance=~"(.*):9100"}[5m])</td>
    <td>p0</td>
    <td>90%</td>
    <td>Node I/Os utilization </td>
  </tr>
  <tr>
    <td>Muta Status</td>
    <td>up{job="muta_exporter"} == 0</td>
    <td>p0</td>
    <td> == 1</td>
    <td>MUTA service status is down</td>
  </tr>
  <tr>
    <td>Node Status</td>
    <td>up{job="node_exporter"} == 0</td>
    <td>p0</td>
    <td> == 1</td>
    <td>node_exporter service status is down</td>
  </tr>
  <tr>
    <td>Promethues Status</td>
    <td>up{job="prometheus"} == 0</td>
    <td>p0</td>
    <td> == 1</td>
    <td>Promethues service status is down</td>
  </tr>
  <tr>
    <td rowspan="2">Jaeger Status</td>
    <td>up{instance=~"(.*):16687"} == 0</td>
    <td>p0</td>
    <td> == 1</td>
    <td>jaeger-query service status is down</td>
  </tr>
  <tr>
    <td>up{instance=~"(.*):14269"} == 0</td>
    <td>p0</td>
    <td> == 1</td>
    <td>jaeger-collector service status is down</td>
  </tr>
  <tr>
    <td>Jaeger Agent Status</td>
    <td>up{job="jaeger_agent"} == 0</td>
    <td>p0</td>
    <td> == 1</td>
    <td>jaeger-agent  service is down</td>
  </tr>
  <tr>
    <td>Loki Status</td>
    <td>up{job="loki"} == 0</td>
    <td>p0</td>
    <td> == 1</td>
    <td>loki service is down</td>
  </tr>
  <tr>
    <td>Promtail Status</td>
    <td>count(count_over_time({job="muta"}[5m])) by (hostip)</td>
    <td>p0</td>
    <td> == 1</td>
    <td>Promtail service status is down</td>
  </tr>
</tbody>
</table>

## muta-benchmark
<table>
<thead>
  <tr>
    <th>Panel </th>
    <th>Expression</th>
    <th>Level</th>
    <th>Thresholds</th>
    <th>Description</th>
  </tr>
</thead>
<tbody>
  <tr>
    <td>TPS</td>
    <td>avg(rate(muta_consensus_committed_tx_total[5m]))</td>
    <td>p2</td>
    <td>0</td>
    <td>TPS </td>
  </tr>
  <tr>
    <td>exec_p90</td>
    <td>avg(histogram_quantile(0.90, sum(rate(muta_consensus_time_cost_seconds_bucket{type="exec"}[5m])) by (le, instance)))</td>
    <td>p2</td>
    <td> &gt;= 2.4</td>
    <td>exec_90 </td>
  </tr>
  <tr>
    <td>consensus_round_cost</td>
    <td>(muta_consensus_round &gt; 0 )</td>
    <td>p1</td>
    <td> &gt; = 5</td>
    <td>Rounds of Consensus</td>
  </tr>
  <tr>
    <td>consensus_p90</td>
    <td>avg(histogram_quantile(0.90, sum(rate(muta_consensus_duration_seconds_bucket[5m])) by (le, instance))) / avg(histogram_quantile(0.90, sum(rate(muta_consensus_time_cost_seconds_bucket{type="exec"}[5m])) by (le, instance))) </td>
    <td>p1</td>
    <td>1.1</td>
    <td>exec time is greater than consensus time</td>
  </tr>
  <tr>
    <td rowspan="2">Liveness</td>
    <td>increase(muta_consensus_height{job="muta_exporter"}[1m])</td>
    <td rowspan="2">p0</td>
    <td>0</td>
    <td rowspan="2">Loss of Liveness，no increase in height</td>
  </tr>
  <tr>
    <td>up{job="muta_exporter"} == 1</td>
    <td>1</td>
  </tr>
  <tr>
    <td>synced_block</td>
    <td>changes(muta_consensus_sync_block_total[10m]) / changes(muta_consensus_height [10m]) </td>
    <td>p1</td>
    <td>1/1000? 10 min</td>
    <td>Proportion of sync blocks</td>
  </tr>
  <tr>
    <td>Connected Consensus Peers</td>
    <td>(sum(muta_network_tagged_consensus_peers<br>) by (instance) - 1)<br>- sum(muta_network_connected_consensus_peers) by (instance)</td>
    <td>p0</td>
    <td>1</td>
    <td>Consensus Network Disconnect</td>
  </tr>
</tbody>
</table>