use clap::{Arg, ArgMatches, Command};

use crate::{docker::DockerApi, sub_command::SubCommand};
use async_trait::async_trait;
use std::{env, error::Error as StdErr, process};
use tokio::sync::Mutex;

#[derive(Debug, Default)]
pub struct AxonNode {
    mount_dir: Mutex<String>,
}

fn string_to_static_str(s: String) -> &'static str {
    Box::leak(s.into_boxed_str())
}

#[async_trait]
impl SubCommand for AxonNode {
    fn get_command(&self) -> Command<'static> {
        let home_dir = env::var("HOME").unwrap();
        println!("home dir:{}.", home_dir);
        let axon_dir = home_dir + "/.axon";
        println!("axon dir:{}.", axon_dir);
        let axon_data_dir = axon_dir.clone() + "/devtools/chain";
        println!("axon data dir:{}.", axon_data_dir);

        Command::new("axon")
            .about("AXON NODE")
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
                    .arg(
                        Arg::new("mount-dir")
                            .short('d')
                            .long("mount-dir")
                            .help("the local working dir for axon processes running in docker")
                            .required(false)
                            .default_value(string_to_static_str(axon_dir))
                            .takes_value(true),
                    )
                    .about("Start axon node"),
            )
            .subcommand(Command::new("stop").about("Stop four axon container nodes"))
            .subcommand(Command::new("rm").about("Remove four axon containers"))
            .subcommand(
                Command::new("del")
                    .arg(
                        Arg::new("data-dir")
                            .short('d')
                            .long("data-dir")
                            .help("the local data dir for axon processes running in docker")
                            .required(false)
                            .default_value(string_to_static_str(axon_data_dir))
                            .takes_value(true),
                    )
                    .about("Delete chain data"),
            )
            .subcommand(
                Command::new("bm")
                    .arg(
                        Arg::new("data-dir")
                            .short('d')
                            .long("data-dir")
                            .help("the local benchmark dir")
                            .required(true)
                            .takes_value(true),
                    )
                    .about("Start benchmark"),
            )
    }

    async fn exec_command(&self, matches: &ArgMatches) -> Result<(), Box<dyn StdErr>> {
        match matches.subcommand() {
            Some(("start", matches)) => {
                let mount_dir = matches
                    .value_of("mount-dir")
                    .unwrap()
                    .parse::<String>()
                    .unwrap();
                self.mount_dir.lock().await.clear();
                self.mount_dir.lock().await.push_str(mount_dir.as_str());
                // self.mount_dir.lock().borrow_mut().push_str(&mount_dir);
                println!("mount-dir {}", self.mount_dir.lock().await);
                let num = matches.value_of("num").unwrap().parse::<u32>().unwrap();
                self.start_axons(num).await;
                Ok(())
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
                Ok(())
            }
            Some(("rm", _)) => {
                let _output = process::Command::new("docker")
                    .arg("rm")
                    .arg("axon1")
                    .arg("axon2")
                    .arg("axon3")
                    .arg("axon4")
                    .output()
                    .expect("rm containers exception!!!");
                Ok(())
            }
            Some(("del", matches)) => {
                let mut data_dir = matches
                    .value_of("data-dir")
                    .unwrap()
                    .parse::<String>()
                    .unwrap();
                if !self.mount_dir.lock().await.is_empty() {
                    data_dir = self.mount_dir.lock().await.clone() + "/devtools/chain";
                }
                println!("data dir {}", data_dir);
                let _output = process::Command::new("rm")
                    .arg("-rf")
                    .arg(data_dir)
                    .output()
                    .expect("delete chain data exception!!!");

                Ok(())
            }
            Some(("bm", matches)) => {
                let data_dir = matches
                    .value_of("data-dir")
                    .unwrap()
                    .parse::<String>()
                    .unwrap();
                println!("bench dir {}", data_dir);
                DockerApi::start_benchmark(&data_dir).await;
                Ok(())
            }
            _ => Ok(()),
        }
    }
}

impl AxonNode {
    // pub fn new(dir: String) -> Self {
    //     AxonNode { mount_dir: dir }
    // }

    async fn start_axons(&self, num: u32) {
        let docker_api = DockerApi::new(self.mount_dir.lock().await.clone());
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
