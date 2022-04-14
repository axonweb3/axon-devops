use clap::crate_version;
use rustyline::error::ReadlineError;
use rustyline::Editor;
use std::process::Command;

pub struct Interative {}

impl Interative {
    pub fn build_interactive() -> clap::Command<'static> {
        clap::Command::new("interactive")
            .version(crate_version!())
            .subcommand(clap::Command::new("start").about("Start four axon nodes"))
            .subcommand(clap::Command::new("stop").about("Stop four axon container nodes"))
            .subcommand(clap::Command::new("rm").about("Remove four axon containers"))
            .subcommand(clap::Command::new("delete").about("Delete chain data"))
    }

    pub fn start(c_path: &str, d_path: &str) {
        let mut rl = Editor::<()>::new();
        if rl.load_history("history.txt").is_err() {
            println!("No previous history.");
        }

        let parser = crate::Interative::build_interactive();
        loop {
            let readline = rl.readline(">> ");
            match readline {
                Ok(line) => {
                    rl.add_history_entry(line.as_str());
                    // println!("Command: {}", line);
                    let args = vec!["interactive", &line];
                    let app_m = parser.clone().try_get_matches_from(args);
                    match app_m {
                        Ok(matches) => match matches.subcommand() {
                            Some(("start", _)) => {
                                println!("start");
                                let compose_para_1 = String::from("--file=");
                                let compose_para = compose_para_1 + c_path;
                                print!("docker compose file: {}", compose_para);
                                let _output = Command::new("docker-compose")
                                    .arg(compose_para)
                                    .arg("up")
                                    .arg("-d")
                                    .output()
                                    .expect("start local docker nodes exception!!!");
                            }
                            Some(("stop", _)) => {
                                let _output = Command::new("docker")
                                    .arg("stop")
                                    .arg("axon1")
                                    .arg("axon2")
                                    .arg("axon3")
                                    .arg("axon4")
                                    .output()
                                    .expect("stop containers exception!!!");
                            }
                            Some(("rm", _)) => {
                                let _output = Command::new("docker")
                                    .arg("rm")
                                    .arg("axon1")
                                    .arg("axon2")
                                    .arg("axon3")
                                    .arg("axon4")
                                    .output()
                                    .expect("rm containers exception!!!");
                            }
                            Some(("delete", _)) => {
                                println!("chain data path: {}", d_path);
                                let _output = Command::new("rm")
                                    .arg("-rf")
                                    .arg(d_path)
                                    .output()
                                    .expect("delete chain data exception!!!");
                            }
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
        rl.save_history("history.txt").unwrap();
    }
}
