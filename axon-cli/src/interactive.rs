use std::process;

use clap::{crate_version, Command};
use rustyline::{error::ReadlineError, Editor};

use crate::docker;

const HISTORY_FILE: &str = "history.txt";

#[derive(Default)]
pub struct Interactive {
    pub mount_path: String,
    pub data_path:  String,
    pub bench_path: String,
}

impl Interactive {
    pub fn build_interactive() -> Command<'static> {
        Command::new("interactive")
            .version(crate_version!())
            .subcommand(Command::new("start").about("Start four axon nodes"))
            .subcommand(Command::new("stop").about("Stop four axon container nodes"))
            .subcommand(Command::new("rm").about("Remove four axon containers"))
            .subcommand(Command::new("del").about("Delete chain data"))
            .subcommand(Command::new("bm").about("Start benchmark"))
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
                    let args = vec!["interactive", &line];
                    let app_m = parser.clone().try_get_matches_from(args);
                    match app_m {
                        Ok(matches) => match matches.subcommand() {
                            Some(("start", _)) => {
                                self.start_axons().await;
                            }
                            Some(("stop", _)) => {
                                let _output = process::Command::new("docker")
                                    .arg("stop")
                                    .arg("axon1")
                                    .arg("axon2")
                                    .arg("axon3")
                                    .arg("axon4")
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
                                // mydocker::Api::create_network("axon-benchmark-net");
                                docker::DockerApi::start_benchmark(&self.bench_path).await;
                            }
                            // Some(("list", _)) => {

                            // }
                            _ => {}
                        },
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

    async fn start_axons(&self) {
        let docker_api = docker::DockerApi {
            network_name: String::from("axon-net"),
            path:         self.mount_path.to_owned(),
        };
        docker_api.create_network().await;
        docker_api
            .start_container("axon1", "node_1.toml", 8000)
            .await;
        docker_api
            .start_container("axon2", "node_2.toml", 8001)
            .await;
        docker_api
            .start_container("axon3", "node_3.toml", 8002)
            .await;
        docker_api
            .start_container("axon4", "node_4.toml", 8003)
            .await;
    }
}
