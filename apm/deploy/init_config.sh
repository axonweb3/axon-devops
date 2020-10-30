#!/bin/sh 

muta_node_list=`sed -n '/^\[muta_rsync_node/,/^\[prometheus_server/p' hosts | grep -v "^\["`

set_exporter() {
    jaeger_agents=
    node_exporters=
    muta_exporters=
    promtail_agents=
    for i in ${muta_node_list};
      do
        node_exporter=\"${i}:9100\"
        muta_exporter=\"${i}:8000\"
        jaeger_agent=\"${i}:14271\"
        promtail_agent=\"${i}:9080\"

        jaeger_agents=${jaeger_agents},${jaeger_agent}
        node_exporters=${node_exporters},${node_exporter}
        muta_exporters=${muta_exporters},${muta_exporter}
        promtail_agents=${promtail_agents},${promtail_agent}

    done

    jaeger_agents=`echo ${jaeger_agents} | sed 's/^.//1'`
    node_exporters=`echo ${node_exporters} | sed 's/^.//1'`
    muta_exporters=`echo ${muta_exporters} | sed 's/^.//1'`
    promtail_agents=`echo ${promtail_agents} | sed 's/^.//1'`
    
    # cp -rp ./roles/prometheus/templates/prometheus.yml.j2 ./roles/prometheus/templates/prometheus.yml_new.j2
    sed -i '' "s/jaeger_agent_ip:14271/${jaeger_agents}/g" roles/monitor/templates/prometheus.yml.j2
    sed -i '' "s/node_exporter_ip:9100/${node_exporters}/g" roles/monitor/templates/prometheus.yml.j2
    sed -i '' "s/muta_exporter_ip:8000/${muta_exporters}/g" roles/monitor/templates/prometheus.yml.j2
    sed -i '' "s/promtail_agent_ip:9080/${promtail_agents}/g" roles/monitor/templates/prometheus.yml.j2
}

set_exporter
