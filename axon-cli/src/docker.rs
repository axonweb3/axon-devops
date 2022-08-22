use std::fs::File;
use std::io::{BufRead, BufReader};
use std::path::Path;

use docker_api::{
    api::NetworkCreateOpts, api::PublishPort, api::PullOpts, container::ContainerCreateOpts,
    docker::Docker,
};
use futures::StreamExt;

const DOCKER_URI: &str = "tcp://127.0.0.1:2375";
const AXON_IMAGE_NAME: &str = "wenyuancas/axon";
const AXON_IMAGE_TAG: &str = "v1";
const BM_IMAGE_NAME: &str = "zhengjianhui/axon-benchmark";

#[derive(Default)]
pub struct DockerApi {
    path: String,
}

impl DockerApi {
    pub fn new(path: String) -> Self {
        DockerApi { path }
    }

    pub fn new_docker() -> Docker {
        Docker::new(DOCKER_URI).unwrap()
    }

    pub async fn create_network(network_name: &str) {
        let docker = DockerApi::new_docker();

        {
            match docker.networks().get(network_name).inspect().await {
                Ok(_) => {
                    println!("network {} exist", network_name);
                    return;
                }
                Err(err) => {
                    println!("network {} not exist, {:?}", network_name, err);
                }
            };
            // let driver = "bridge"; // default driver
            match docker
                .networks()
                .create(&NetworkCreateOpts::builder(network_name).build())
                .await
            {
                Ok(info) => println!("{:?}", info),
                Err(e) => eprintln!("Error: {}", e),
            }
        };
    }

    async fn pull_image(docker: &Docker, name: &str, tag: &str) {
        let images = docker.images();
        let opts = PullOpts::builder().image(name).tag(tag).build();
        let mut stream = images.pull(&opts);
        while let Some(pull_result) = stream.next().await {
            match pull_result {
                Ok(_output) => {}
                Err(e) => eprintln!("error {}", e),
            }
        }
    }

    pub async fn start_axon(&self, name: &str, file_para: &str, genesis_para: &str, port: u32) {
        let docker = DockerApi::new_docker();
        DockerApi::pull_image(&docker, AXON_IMAGE_NAME, AXON_IMAGE_TAG).await;

        let cmd = vec!["./axon", file_para, genesis_para];
        println!("cmd: {:?}", cmd);

        let data_mapping = self.path.to_owned() + "/devtools" + ":/app/devtools";
        let log_mapping = self.path.to_owned() + "/logs/" + name + ":/app/logs";
        let vols = vec![data_mapping, log_mapping];
        println!("mapping: {:?}", vols);
        // prometheus collecting port from 8900-8903
        let collect_port = 8900 + (port - 8000);
        let opts = ContainerCreateOpts::builder(AXON_IMAGE_NAME.to_owned() + ":" + AXON_IMAGE_TAG)
            .name(name)
            .cmd(&cmd)
            .restart_policy("always", 0)
            .volumes(vols)
            .working_dir("/app")
            .network_mode("axon-net")
            .expose(PublishPort::tcp(8000), port)
            .expose(PublishPort::tcp(8100), collect_port)
            .build();
        match docker.containers().create(&opts).await {
            Ok(info) => {
                // println!("{:?}", info);
                match info.start().await {
                    Ok(_) => println!("Start {} ok", name),
                    Err(err) => eprintln!("Start err {}", err),
                }
            }
            Err(e) => eprintln!("Error: {}", e),
        };
    }

    pub async fn start_benchmark<P: AsRef<Path>>(benchmark_path: &P) {
        let docker = DockerApi::new_docker();
        DockerApi::pull_image(&docker, BM_IMAGE_NAME, "latest").await;

        let cmd = vec!["node", "index.js", "--http_endpoint=http://172.17.0.1:8000"];
        // let benchmark_path = "/home/wenyuan/git/axon-devops/benchmark/benchmark/";
        let benchmark_path = benchmark_path.as_ref().to_str().unwrap();
        let vols = vec![
            benchmark_path.to_owned() + "/config.json:/benchmark/config.json",
            benchmark_path.to_owned() + "/logs:/benchmark/logs",
        ];

        let opts = ContainerCreateOpts::builder(BM_IMAGE_NAME)
            .name("bm")
            .cmd(&cmd)
            .volumes(vols)
            .network_mode("axon-net")
            .build();
        async {
            match docker.containers().create(&opts).await {
                Ok(info) => {
                    // println!("{:?}", info);
                    match info.start().await {
                        Ok(_) => println!("Start Benchmark Successfully"),
                        Err(err) => eprintln!("Start err {}", err),
                    }
                }
                Err(e) => {
                    eprintln!("Error: {}", e);
                    match docker.containers().get("bm").start().await {
                        Ok(_) => println!("Exec Benchmark Successfully"),
                        Err(err) => eprintln!("Exec err {}", err),
                    }
                }
            }
        }
        .await;
    }

    pub fn get_var(var_path: &str, key: &str) -> std::io::Result<Option<String>> {
        let file = File::open(var_path)?;
        let lines = BufReader::new(file).lines();
        let mut var_val: Option<String> = None;
        for line in lines.flatten() {
            // println!("{}", line);
            let words: Vec<&str> = line.split(':').collect();
            if words[0] == key {
                var_val = Some(words[1].trim().to_string());
                break;
            }
        }
        Ok(var_val)
    }

    pub async fn start_monitor(path: &str) {
        let monitor_var_path = path.to_owned() + "/deploy/roles/monitor/vars/main.yaml";
        println!("monitor var path {}", monitor_var_path);
        let var_key = "monitor_dir";
        if let Ok(monitor_dir_opt) = DockerApi::get_var(monitor_var_path.as_str(), var_key) {
            if let Some(monitor_dir) = monitor_dir_opt {
                // println!("monitor dir:{}", monitor_dir);
                DockerApi::start_grafana(&monitor_dir).await;
                DockerApi::start_grafana_renderer().await;
                DockerApi::start_prometheus(&monitor_dir).await;
                DockerApi::start_elasticsearch(&monitor_dir).await;
                DockerApi::start_jaeger_collector().await;
                DockerApi::start_jaeger_query().await;
                DockerApi::start_elastalert(&monitor_dir).await;
            } else {
                println!("Key {} not exist!", var_key);
            }
        } else {
            println!("File {} open err!", monitor_var_path);
        }
    }

    pub async fn start_agent(path: &str) {
        let agent_var_path = path.to_owned() + "/deploy/roles/agent/vars/main.yaml";
        println!("agent var path {}", agent_var_path);
        let var_key = "monitor_agent_dir";
        if let Ok(agent_dir_opt) = DockerApi::get_var(agent_var_path.as_str(), var_key) {
            if let Some(agent_dir) = agent_dir_opt {
                // println!("agent_dir:{}", agent_dir);
                let log_path = DockerApi::get_var(agent_var_path.as_str(), "log_path")
                    .unwrap()
                    .unwrap();
                let mut monitor_address =
                    DockerApi::get_var(agent_var_path.as_str(), "monitor_address")
                        .unwrap()
                        .unwrap();
                monitor_address += ":8201";
                DockerApi::start_node_exporter().await;
                DockerApi::start_jaeger_agent(&monitor_address).await;
                DockerApi::start_promtail(&agent_dir, &log_path).await;
                DockerApi::start_filebeat(&agent_dir, &log_path).await;
            } else {
                println!("Key {} not exist!", var_key);
            }
        } else {
            println!("File {} open err!", agent_var_path);
        }
    }

    pub async fn stop_monitor() {
        let monitor_names = vec![
            "axon-grafana",
            "axon-grafana-image-renderer",
            "prometheus",
            "elasticsearch",
            "jaeger-collector",
            "jaeger-query",
            "elk-elastalert",
        ];
        DockerApi::stop_containers(monitor_names).await;
    }

    pub async fn stop_agent() {
        let agent_names = vec![
            "axon-node-exporter",
            "jaeger-agent",
            "axon-promtail",
            "axon-filebeat",
        ];
        DockerApi::stop_containers(agent_names).await;
    }

    async fn stop_containers(names: Vec<&str>) {
        let docker = DockerApi::new_docker();
        for name in names {
            let result = docker.containers().get(name).stop(None).await;
            match result {
                Ok(_) => println!("Stop {} Ok", name),
                Err(err) => println!("Stop {} Err {}", name, err),
            }
        }
    }

    pub async fn clean(path: &str) {
        let monitor_var_path = path.to_owned() + "/deploy/roles/monitor/vars/main.yaml";
        DockerApi::rm_data(monitor_var_path.as_str(), "monitor_dir");

        let agent_var_path = path.to_owned() + "/deploy/roles/agent/vars/main.yaml";
        DockerApi::rm_data(agent_var_path.as_str(), "monitor_agent_dir");
    }

    fn rm_data(var_path: &str, key: &str) {
        let data_path = DockerApi::get_var(var_path, key).unwrap().unwrap() + "/data";
        println!("data path:{}", data_path);
        let output = std::process::Command::new("rm")
            .args(["-rf", data_path.as_str()])
            .output();

        match output {
            Ok(_) => println!("Rm {} Successfully", data_path),
            Err(err) => println!("Err {:?}", err),
        }
    }

    async fn start_grafana(dir: &str) {
        let name = "axon-grafana";
        let vols = vec![
            dir.to_owned() + "/config/grafana/grafana.ini:/etc/grafana/grafana.ini",
            dir.to_owned() + "/config/grafana/dashboards:/var/lib/grafana/dashboards",
            dir.to_owned() + "/config/grafana/provisioning:/etc/grafana/provisioning",
            dir.to_owned() + "/data/grafana/log:/var/log/grafana",
        ];
        let env = vec![
            "GF_EXPLORE_ENABLED=true",
            "GF_RENDERING_SERVER_URL=http://renderer:8081/render",
            "GF_RENDERING_CALLBACK_URL=http://grafana:3000/",
            "GF_LOG_FILTERS=rendering:debug",
        ];

        let opts = ContainerCreateOpts::builder("grafana/grafana:master")
            .name(name)
            .restart_policy("on-failure", 0)
            .expose(PublishPort::tcp(3000), 8600)
            .volumes(vols)
            .env(env)
            .network_mode("axon-monitor")
            .build();
        // println!("opts {:?}", opts);
        println!("Start: {}", name);
        DockerApi::start_container(opts).await;
    }

    async fn start_grafana_renderer() {
        let name = "axon-grafana-image-renderer";
        let opts = ContainerCreateOpts::builder("grafana/grafana-image-renderer:2.0.0")
            .name(name)
            .expose(PublishPort::tcp(8081), 0)
            .network_mode("axon-monitor")
            .build();
        // println!("opts {:?}", opts);
        println!("Start: {}", name);
        DockerApi::start_container(opts).await;
    }

    async fn start_prometheus(dir: &str) {
        let name = "prometheus";
        let vols = vec![
            dir.to_owned() + "/config/promethues/prometheus.yml:/etc/prometheus/prometheus.yml",
            dir.to_owned() + "/data/prometheus:/prometheus",
        ];
        let cmd = vec![
            "--config.file=/etc/prometheus/prometheus.yml",
            "--storage.tsdb.path=/prometheus",
            "--web.console.libraries=/usr/share/prometheus/console_libraries",
            "--web.console.templates=/usr/share/prometheus/consoles",
            "--web.enable-lifecycle",
        ];

        let opts = ContainerCreateOpts::builder("prom/prometheus:v2.32.1")
            .name(name)
            .restart_policy("on-failure", 0)
            .volumes(vols)
            .expose(PublishPort::tcp(9090), 9090)
            .cmd(cmd)
            .network_mode("axon-monitor")
            .build();
        // println!("opts {:?}", opts);
        println!("Start: {}", name);
        DockerApi::start_container(opts).await;
    }

    async fn start_elasticsearch(dir: &str) {
        let name = "elasticsearch";
        let vols = vec![dir.to_owned() + "/data/es:/usr/share/elasticsearch/data"];
        let env = vec![
            "cluster.name=jaeger-cluster",
            "discovery.type=single-node",
            "http.host=0.0.0.0",
            "transport.host=127.0.0.1",
            "ES_JAVA_OPTS=-Xms8192m -Xmx8192m",
            "xpack.security.enabled=false",
        ];

        let opts =
            ContainerCreateOpts::builder("docker.elastic.co/elasticsearch/elasticsearch:7.6.2")
                .name(name)
                .expose(PublishPort::tcp(9200), 9200)
                .expose(PublishPort::tcp(9300), 9300)
                .restart_policy("on-failure", 0)
                .env(env)
                .volumes(vols)
                .network_mode("axon-monitor")
                .build();
        // println!("opts {:?}", opts);
        println!("Start: {}", name);
        DockerApi::start_container(opts).await;
    }

    async fn start_jaeger_collector() {
        let name = "jaeger-collector";
        let env = vec!["SPAN_STORAGE_TYPE=elasticsearch"];
        let cmd = vec![
            "--es.server-urls=http://elasticsearch:9200",
            "--es.num-shards=1",
            "--es.num-replicas=0",
            "--log-level=error",
        ];

        let opts = ContainerCreateOpts::builder("jaegertracing/jaeger-collector:1.32")
            .name(name)
            .expose(PublishPort::tcp(14269), 14269)
            .expose(PublishPort::tcp(14268), 14268)
            .expose(PublishPort::tcp(14250), 8201)
            .expose(PublishPort::tcp(9411), 9411)
            .restart_policy("on-failure", 0)
            .env(env)
            .cmd(cmd)
            .network_mode("axon-monitor")
            .build();
        // println!("opts {:?}", opts);
        println!("Start: {}", name);
        DockerApi::start_container(opts).await;
    }

    async fn start_jaeger_query() {
        let name = "jaeger-query";
        let env = vec!["SPAN_STORAGE_TYPE=elasticsearch", "no_proxy=localhost"];
        let cmd = vec![
            "--es.server-urls=http://elasticsearch:9200",
            "--span-storage.type=elasticsearch",
            "--log-level=debug",
            "--query.max-clock-skew-adjustment=0",
        ];

        let opts = ContainerCreateOpts::builder("jaegertracing/jaeger-query:1.32")
            .name(name)
            .env(env)
            .expose(PublishPort::tcp(16686), 8202)
            .expose(PublishPort::tcp(16687), 8203)
            .restart_policy("on-failure", 0)
            .cmd(cmd)
            .network_mode("axon-monitor")
            .build();
        // println!("opts {:?}", opts);
        println!("Start: {}", name);
        DockerApi::start_container(opts).await;
    }

    async fn start_elastalert(dir: &str) {
        let name = "elk-elastalert";
        let vols = vec![
            dir.to_owned() + "/config/elastalert2/elastalert.yaml:/opt/elastalert/config.yaml",
            dir.to_owned()
                + "/config/elastalert2/config.json:/opt/elastalert-server/config/config.json",
            dir.to_owned() + "/config/elastalert2/rules:/opt/elastalert/rules",
            dir.to_owned() + "/config/elastalert2/rule_templates:/opt/elastalert/rule_templates",
        ];

        let opts = ContainerCreateOpts::builder("praecoapp/elastalert-server:20210704")
            .name(name)
            .expose(PublishPort::tcp(3330), 3330)
            .expose(PublishPort::tcp(3333), 3333)
            .user("1000:1000")
            .volumes(vols)
            .network_mode("axon-monitor")
            .build();
        // println!("opts {:?}", opts);
        println!("Start: {}", name);
        DockerApi::start_container(opts).await;
    }

    async fn start_node_exporter() {
        let name = "axon-node-exporter";
        let cmd = vec![
            "--path.rootfs=/host",
            "--collector.tcpstat",
            "--web.listen-address=:8101",
        ];
        let vols = vec!["/:/host:ro,rslave"];

        let opts = ContainerCreateOpts::builder("quay.io/prometheus/node-exporter:v0.18.1")
            .name(name)
            .cmd(cmd)
            .restart_policy("on-failure", 0)
            .network_mode("host")
            .volumes(vols)
            .build();
        // println!("opts {:?}", opts);
        println!("Start: {}", name);
        DockerApi::start_container(opts).await;
    }

    async fn start_jaeger_agent(addr: &str) {
        let name = "jaeger-agent";
        // let cmd = vec!["--reporter.grpc.host-port=${JACGER_COLLECTOR_ADDRESS}"];
        let cmd = vec!["--reporter.grpc.host-port=".to_owned() + addr];

        let opts = ContainerCreateOpts::builder("jaegertracing/jaeger-agent:1.32")
            .name(name)
            .restart_policy("on-failure", 0)
            .expose(PublishPort::tcp(14271), 14271)
            .expose(PublishPort::udp(5775), 5775)
            .expose(PublishPort::udp(6831), 6831)
            .expose(PublishPort::udp(6832), 6832)
            .expose(PublishPort::tcp(5778), 5778)
            .cmd(cmd)
            .build();
        // println!("opts {:?}", opts);
        println!("Start: {}", name);
        DockerApi::start_container(opts).await;
    }

    async fn start_promtail(dir: &str, log_path: &str) {
        let name = "axon-promtail";
        let vols = vec![
            dir.to_owned() + "/data/promtail/positions:/tmp/promtail/",
            dir.to_owned()
                + "/config/promtail/promtail-config.yaml:/etc/promtail/promtail-config.yaml",
            // "${AXON_LOG_PATH}:/var/logs",
            log_path.to_owned() + ":/var/logs",
        ];
        let cmd = vec!["-config.file=/etc/promtail/promtail-config.yaml"];

        let opts = ContainerCreateOpts::builder("grafana/promtail:master-9ad98df")
            .name(name)
            .restart_policy("on-failure", 0)
            .expose(PublishPort::tcp(9080), 8102)
            .volumes(vols)
            .cmd(cmd)
            .build();
        // println!("opts {:?}", opts);
        println!("Start: {}", name);
        DockerApi::start_container(opts).await;
    }

    async fn start_filebeat(dir: &str, log_path: &str) {
        let name = "axon-filebeat";
        let vols = vec![
            "/var/run/docker.sock:/host_docker/docker.sock".to_string(),
            "/var/lib/docker:/host_docker/var/lib/docker".to_string(),
            dir.to_owned() + "/config/filebeat/filebeat.yml:/usr/share/filebeat/filebeat.yml:ro",
            // "${AXON_LOG_PATH}:/usr/share/filebeat/logs",
            log_path.to_owned() + ":/usr/share/filebeat/logs",
        ];
        let cmd = vec!["--strict.perms=false"];

        let opts = ContainerCreateOpts::builder("docker.elastic.co/beats/filebeat:7.2.0")
            .name(name)
            .user("root")
            .volumes(vols)
            .cmd(cmd)
            .attach_stdin(true)
            .build();
        // println!("opts {:?}", opts);
        println!("Start: {}", name);
        DockerApi::start_container(opts).await;
    }

    async fn start_container(opts: ContainerCreateOpts) {
        let docker = DockerApi::new_docker();
        match docker.containers().create(&opts).await {
            Ok(container) => {
                // println!("{:?}", container);
                match container.start().await {
                    Ok(_) => println!("Start ok"),
                    Err(err) => eprintln!("Start err {}", err),
                }
            }
            Err(e) => eprintln!("Error: {}", e),
        };
    }
}
