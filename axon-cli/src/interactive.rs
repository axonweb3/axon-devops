use std::process;

use clap::{crate_version, Arg, Command};
use rustyline::{error::ReadlineError, Editor};

use crate::{crosschain_tx::CrossChain, docker::DockerApi};

const HISTORY_FILE: &str = "history.txt";

#[derive(Default)]
pub struct Interactive {
    mount_path: String,
    data_path:  String,
    bench_path: String,
}

impl Interactive {
    pub fn new(mount_path: String, data_path: String, bench_path: String) -> Self {
        Interactive {
            mount_path,
            data_path,
            bench_path,
        }
    }

    pub fn build_interactive() -> Command<'static> {
        Command::new("interactive")
            .version(crate_version!())
            .subcommand(
                Command::new("start")
                    .arg(
                        Arg::new("num")
                            .short('n')
                            .long("number")
                            .help("number of axon nodes")
                            .required(false)
                            .default_value("1")
                            .takes_value(true),
                    )
                    .about("Start axon node"),
            )
            .subcommand(Command::new("stop").about("Stop four axon container nodes"))
            .subcommand(Command::new("rm").about("Remove four axon containers"))
            .subcommand(Command::new("del").about("Delete chain data"))
            .subcommand(Command::new("bm").about("Start benchmark"))
            .subcommand(CrossChain::get_cs_command())
            .subcommand(
                Command::new("apm")
                    .about("Application Performance Management")
                    .subcommand(
                        Command::new("start")
                            .arg(
                                Arg::new("path")
                                    .short('p')
                                    .long("path")
                                    .help("path of apm directory")
                                    .required(true)
                                    .takes_value(true),
                            )
                            .about("Start apm"),
                    )
                    .subcommand(Command::new("stop").about("Stop apm"))
                    .subcommand(
                        Command::new("clean")
                            .arg(
                                Arg::new("path")
                                    .short('p')
                                    .long("path")
                                    .help("path of apm directory")
                                    .required(true)
                                    .takes_value(true),
                            )
                            .about("Clean apm"),
                    ),
            )
            .subcommand(Command::new("list").about("List docker images"))
    }

    pub async fn start(&self) {
        let mut rl = Editor::<()>::new();
        if rl.load_history(HISTORY_FILE).is_err() {
            println!("No previous history.");
        }

        let parser = crate::Interactive::build_interactive();
        loop {
            let readline = rl.readline(">> ");
            match readline {
                Ok(line) => {
                    rl.add_history_entry(line.as_str());
                    let mut args: Vec<&str> = line.split(' ').collect();
                    args.insert(0, "interactive");
                    let app_m = parser.clone().try_get_matches_from(args);
                    match app_m {
                        Ok(matches) => {
                            match matches.subcommand() {
                                Some(("start", matches)) => {
                                    let num =
                                        matches.value_of("num").unwrap().parse::<u32>().unwrap();
                                    self.start_axons(num).await;
                                }
                                Some(("stop", _)) => {
                                    let _output = process::Command::new("docker")
                                        .arg("stop")
                                        .arg("axon1")
                                        .arg("axon2")
                                        .arg("axon3")
                                        .arg("axon4")
                                        .arg("bm")
                                        .output()
                                        .expect("stop containers exception!!!");
                                }
                                Some(("rm", _)) => {
                                    let _output = process::Command::new("docker")
                                        .arg("rm")
                                        .arg("axon1")
                                        .arg("axon2")
                                        .arg("axon3")
                                        .arg("axon4")
                                        .arg("bm")
                                        .output()
                                        .expect("rm containers exception!!!");
                                }
                                Some(("del", _)) => {
                                    let _output = process::Command::new("rm")
                                        .arg("-rf")
                                        .arg(&self.data_path)
                                        .output()
                                        .expect("delete chain data exception!!!");
                                }
                                Some(("bm", _)) => {
                                    DockerApi::start_benchmark(&self.bench_path).await;
                                }
                                Some(("apm", apm_matches)) => match apm_matches.subcommand() {
                                    Some(("start", matches)) => {
                                        let path = matches.value_of("path").unwrap_or("");
                                        // println!("apm path: {}", path);

                                        let _output = process::Command::new(
                                            path.to_owned() + "/apm_start.sh",
                                        )
                                        .output()
                                        .expect("Start apm exception!!!");

                                        println!("Start monitors!!");
                                        DockerApi::start_monitor(path).await;
                                        println!("Sleeping 30 seconds!!");
                                        let thirty_secs = std::time::Duration::from_secs(30);
                                        std::thread::sleep(thirty_secs);
                                        println!("\nStart agents!!");
                                        DockerApi::start_agent(path).await;
                                    }
                                    Some(("stop", _)) => {
                                        DockerApi::stop_monitor().await;
                                        DockerApi::stop_agent().await;
                                    }
                                    Some(("clean", matches)) => {
                                        let path = matches.value_of("path").unwrap_or("");
                                        println!("apm path: {}", path);
                                        DockerApi::clean(path).await;
                                    }
                                    _ => {}
                                },
                                Some(("cs", cs_matches)) => {
                                    let result = CrossChain::exec_cs_tx(cs_matches);
                                    println!("{:?}", result);
                                }
                                // Some(("list", _)) => {
                                // }
                                _ => {}
                            }
                        }
                        Err(err) => {
                            println!("{}", err);
                        }
                    }
                }
                Err(ReadlineError::Interrupted) => {
                    println!("CTRL-C");
                    break;
                }
                Err(ReadlineError::Eof) => {
                    println!("CTRL-D");
                    break;
                }
                Err(err) => {
                    println!("Error: {:?}", err);
                    break;
                }
            }
        }
        rl.save_history(HISTORY_FILE).unwrap();
    }

    async fn start_axons(&self, num: u32) {
        let docker_api = DockerApi::new(self.mount_path.to_owned());
        DockerApi::create_network("axon-net").await;
        if num == 1 {
            let file_para = "-c=/app/devtools/config/config.toml";
            let genesis_para = "-g=/app/devtools/config/genesis_single_node.json";
            docker_api
                .start_axon("axon1", file_para, genesis_para, 8000)
                .await;
        } else if num == 4 {
            let file_para = "-c=/app/devtools/config/";
            let genesis_para = "-g=/app/devtools/config/genesis_four_nodes.json";
            docker_api
                .start_axon(
                    "axon1",
                    &(file_para.to_owned() + "node_1.toml"),
                    genesis_para,
                    8000,
                )
                .await;
            docker_api
                .start_axon(
                    "axon2",
                    &(file_para.to_owned() + "node_2.toml"),
                    genesis_para,
                    8001,
                )
                .await;
            docker_api
                .start_axon(
                    "axon3",
                    &(file_para.to_owned() + "node_3.toml"),
                    genesis_para,
                    8002,
                )
                .await;
            docker_api
                .start_axon(
                    "axon4",
                    &(file_para.to_owned() + "node_4.toml"),
                    genesis_para,
                    8003,
                )
                .await;
        } else {
            println!("Not supported node num: {}", num);
        }
    }
}
