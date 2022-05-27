#!/bin/sh 

axon_node_list=`sed -n '/^\[axon_node/,/^\[prometheus_server/p' hosts | grep -v "^\["`

set_exporter() {
    node_exporters=""
    axon_exporters=""
    promtail_agents=""
    for i in ${axon_node_list};
      do
        node_exporter=\"${i}:8101\"
        promtail_agent=\"${i}:8102\"
        axon_exporter=\"${i}:8900\",\"${i}:8901\",\"${i}:8902\",\"${i}:8903\"

        node_exporters=${node_exporters},${node_exporter}
        promtail_agents=${promtail_agents},${promtail_agent}
        axon_exporters=${axon_exporters},${axon_exporter}

    done
     

    node_exporters=`echo ${node_exporters} | sed 's/^.//1'`
    axon_exporters=`echo ${axon_exporters} | sed 's/^.//1'`
    promtail_agents=`echo ${promtail_agents} | sed 's/^.//1'`

    echo "${node_exporters}"
    echo "${axon_exporters}"
    echo "${promtail_agents}"

    
    # cp -rp ./roles/prometheus/templates/prometheus.yml.j2 ./roles/prometheus/templates/prometheus.yml_new.j2
    sed -i "s/node_exporter_ip:9100/${node_exporters}/g" "$1/config/promethues/prometheus.yml"
    sed -i "s/axon_exporter_ip:8100/${axon_exporters}/g" "$1/config/promethues/prometheus.yml"
    sed -i "s/promtail_agent_ip:9080/${promtail_agents}/g" "$1/config/promethues/prometheus.yml"
}

set_exporter $1
