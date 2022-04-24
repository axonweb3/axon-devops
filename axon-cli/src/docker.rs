use std::path::Path;

use docker_api::{
    api::NetworkCreateOpts, api::PublishPort, container::ContainerCreateOpts, Docker,
};

const DOCKER_URI: &str = "tcp://127.0.0.1:2375";

#[derive(Default)]
pub struct DockerApi {
    pub network_name: String,
    pub path:         String,
    // container_name: String,
    // file_name: String,
}

impl DockerApi {
    pub fn new_docker() -> Docker {
        Docker::new(DOCKER_URI).unwrap()
    }

    pub async fn create_network(&self) {
        let docker = DockerApi::new_docker();

        {
            match docker.networks().get(&self.network_name).inspect().await {
                Ok(_) => {
                    println!("network {} exist", self.network_name);
                    return;
                }
                Err(err) => {
                    println!("network {} not exist, {:?}", self.network_name, err);
                }
            };
            // let driver = "bridge"; // default driver
            match docker
                .networks()
                .create(&NetworkCreateOpts::builder(&self.network_name).build())
                .await
            {
                Ok(info) => println!("{:?}", info),
                Err(e) => eprintln!("Error: {}", e),
            }
        };
    }

    pub async fn start_container(&self, name: &str, file_name: &str, port: u32) {
        let docker = DockerApi::new_docker();
        // let runtime = DockerApi::run_time();

        let file_para = "-c=/app/devtools/config/".to_owned() + file_name;
        let genesis_config = "-g=/app/devtools/config/genesis_four_nodes.json";
        println!("{:?}", file_para);
        let cmd = vec!["./axon", &file_para, genesis_config];
        // let entrypoint = String::from("/app");
        let vols = vec![self.path.to_owned() + ":/app/devtools"];
        let opts = ContainerCreateOpts::builder("axon:v1")
            .name(name)
            // .auto_remove(true)
            .cmd(&cmd)
            .restart_policy("always", 0)
            .volumes(vols)
            .working_dir("/app")
            .network_mode("axon-net")
            .expose(PublishPort::tcp(8000), port)
            .build();
        println!("{:?}", opts);
        // runtime.block_on(async {
        match docker.containers().create(&opts).await {
            Ok(info) => {
                println!("{:?}", info);
                match info.start().await {
                    Ok(_) => println!("Start ok"),
                    Err(err) => eprintln!("Start err {}", err),
                }
            }
            Err(e) => eprintln!("Error: {}", e),
        };
    }

    pub async fn start_benchmark<P: AsRef<Path>>(benchmark_path: &P) {
        let docker = DockerApi::new_docker();

        let cmd = vec![
            // "ls",
            "node",
            "index.js",
            "--http_endpoint=http://172.17.0.1:8000",
        ];
        // let benchmark_path = "/home/wenyuan/git/axon-devops/benchmark/benchmark/";
        let benchmark_path = benchmark_path.as_ref().to_str().unwrap();
        let vols = vec![
            benchmark_path.to_owned() + "/config.json:/benchmark/config.json",
            benchmark_path.to_owned() + "/logs:/benchmark/logs",
        ];

        let opts = ContainerCreateOpts::builder("zhengjianhui/axon-benchmark")
            .name("bm")
            .cmd(&cmd)
            // .restart_policy("always", 0)
            .volumes(vols)
            // .working_dir("/app")
            .network_mode("axon-net")
            // .expose(PublishPort::tcp(8000), 8000)
            .build();
        println!("{:?}", opts);
        async {
            match docker.containers().create(&opts).await {
                Ok(info) => {
                    println!("{:?}", info);
                    match info.start().await {
                        Ok(_) => println!("Start Benchmark Successfully"),
                        Err(err) => eprintln!("Start err {}", err),
                    }
                }
                Err(e) => eprintln!("Error: {}", e),
            }
        }
        .await;
    }

    // pub fn list() {
    // runtime.block_on(
    //     async {
    //         println!("list 85");
    //         match docker.images().list(&Default::default()).await {
    //             Ok(images) => {
    //                 for image in images {
    //                     println!("{:?}", image.repo_tags);
    //                 }
    //             },
    //             Err(e) => println!("Something bad happened! {}", e),
    //         }
    //     }
    // );
    // }

    // use docker_api::ExecContainerOpts;
    // use futures::StreamExt;
    // let container = String::from("axon1");
    // runtime.block_on(
    //     async {
    //         // Create Opts with specified command
    //         let opts = ExecContainerOpts::builder()
    //             .cmd(&cmd)
    //             .attach_stdout(true)
    //             .attach_stderr(true)
    //             .privileged(true)
    //             .build();

    //         use docker_api::api::Exec;
    //         let exec = Exec::create(&docker, &container, &opts).await;
    //         let my_exec: Exec;
    //         match exec {
    //             Ok(exec) => {
    //                 println!("Exec::create OK");
    //                 my_exec = exec;
    //             },
    //             Err(err) => {
    //                 println!("error {:?}", err);
    //                 return;
    //             },
    //         }

    //         println!("{:#?}", my_exec.inspect().await);

    //         let mut stream = my_exec.start();

    //         stream.next().await;

    //         println!("{:#?}", my_exec.inspect().await);
    //     }
    // );

    // let options = ExecContainerOpts::builder()
    //     .cmd(&cmd)
    //     .attach_stdout(true)
    //     .attach_stderr(true)
    //     .build();
    // let id = String::from("axon1");

    // runtime.block_on(
    //     async {
    //     if let Some(exec_result) =
    // docker.containers().get(&id).exec(&options).next().await {
    //             match exec_result {
    //                 Ok(_chunk) => println!("OK"),
    //                 Err(e) => eprintln!("84 wen error: {}", e),
    //             }
    //         }
    //     }
    // );
}
