use docker_api::{api::PublishPort, Docker};
use tokio::runtime::Runtime;

#[derive(Default)]
pub struct Api;

impl Api {
    pub fn new_docker() -> Docker {
        Docker::new("tcp://127.0.0.1:2375").unwrap()
    }

    pub fn run_time() -> Runtime {
        tokio::runtime::Runtime::new().unwrap()
    }

    pub fn create_network(name: &str) {
        let docker = Api::new_docker();
        let runtime = Api::run_time();

        use docker_api::api::NetworkCreateOpts;
        runtime.block_on(async {
            let network = name;
            match docker.networks().get(network).inspect().await {
                Ok(_) => {
                    println!("network {} exist", network);
                    return;
                }
                Err(err) => {
                    println!("network {} not exist, {:?}", network, err);
                }
            };
            // let driver = "bridge"; // default driver
            match docker
                .networks()
                .create(&NetworkCreateOpts::builder(network).build())
                .await
            {
                Ok(info) => println!("{:#?}", info),
                Err(e) => eprintln!("Error: {}", e),
            }
        });
    }

    pub fn start_container(name: &str, file_name: &str, port: u32, m_path: &str) {
        let docker = Api::new_docker();
        let runtime = Api::run_time();

        let file_para = "-c=/app/devtools/config/".to_owned() + file_name;
        println!("{:?}", file_para);
        let cmd = vec![
            "./axon",
            &file_para,
            "-g=/app/devtools/config/genesis_four_nodes.json",
        ];
        // let entrypoint = String::from("/app");
        let vols = vec![m_path.to_owned() + ":/app/devtools"];
        let opts = docker_api::container::ContainerCreateOpts::builder("axon:v1")
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
        runtime.block_on(async {
            match docker.containers().create(&opts).await {
                Ok(info) => {
                    println!("{:?}", info);
                    match info.start().await {
                        Ok(_) => println!("Start ok"),
                        Err(err) => eprintln!("Start err {}", err),
                    }
                }
                Err(e) => eprintln!("Error: {}", e),
            }
        });
    }

    pub fn start_benchmark() {
        let docker = Api::new_docker();
        let runtime = Api::run_time();

        let opts = docker_api::container::ContainerCreateOpts::builder("benchmark")
            .name("benchmark")
            .build();
        runtime.block_on(async {
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
        });
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
