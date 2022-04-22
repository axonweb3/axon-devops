use std::path::Path;
use std::process;

use clap::crate_version;
use rustyline::{error::ReadlineError, Editor};

use crate::mydocker;
#[derive(Default)]
pub struct Interactive;

const HISTORY_FILE: &str = "history.txt";

impl Interactive {
    pub fn build_interactive() -> clap::Command<'static> {
        clap::Command::new("interactive")
            .version(crate_version!())
            .subcommand(clap::Command::new("start").about("Start four axon nodes"))
            .subcommand(clap::Command::new("stop").about("Stop four axon container nodes"))
            .subcommand(clap::Command::new("rm").about("Remove four axon containers"))
            .subcommand(clap::Command::new("del").about("Delete chain data"))
            .subcommand(clap::Command::new("benchmark").about("Start benchmark"))
            .subcommand(clap::Command::new("list").about("List docker images"))
    }

    pub fn start<P: AsRef<Path>>(m_path: P, d_path: P) {
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
                                Interactive::start_axons(&m_path);
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
                                    .arg(d_path.as_ref().to_str().unwrap())
                                    .output()
                                    .expect("delete chain data exception!!!");
                            }
                            Some(("benchmark", _)) => {
                                mydocker::Api::start_benchmark();
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

    fn start_axons<P: AsRef<Path>>(m_path: &P) {
        mydocker::Api::create_network("axon-net");
        mydocker::Api::start_container(
            "axon1",
            "node_1.toml",
            8000,
            m_path.as_ref().to_str().unwrap(),
        );
        mydocker::Api::start_container(
            "axon2",
            "node_2.toml",
            8001,
            m_path.as_ref().to_str().unwrap(),
        );
        mydocker::Api::start_container(
            "axon3",
            "node_3.toml",
            8002,
            m_path.as_ref().to_str().unwrap(),
        );
        mydocker::Api::start_container(
            "axon4",
            "node_4.toml",
            8003,
            m_path.as_ref().to_str().unwrap(),
        );
    }
}
