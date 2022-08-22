use std::collections::HashMap;

use clap::{crate_version, Command};
use rustyline::{error::ReadlineError, Editor};

use crate::{apm::Apm, axon_node::AxonNode, crosschain_tx::CrossChain, sub_command::SubCommand};

const HISTORY_FILE: &str = "history.txt";
const AXON_CMD: &str = "axon";
const APM_CMD: &str = "apm";
const CS_CMD: &str = "cs";

#[derive(Default)]
pub struct Interactive {
    sub_cmds: HashMap<String, Box<dyn SubCommand>>,
}

impl Interactive {
    pub fn new() -> Self {
        let mut sub_cmds = HashMap::default();
        sub_cmds.insert(
            AXON_CMD.to_string(),
            Box::new(AxonNode::default()) as Box<dyn SubCommand>,
        );

        sub_cmds.insert(
            APM_CMD.to_string(),
            Box::new(Apm::default()) as Box<dyn SubCommand>,
        );

        sub_cmds.insert(
            CS_CMD.to_string(),
            Box::new(CrossChain::default()) as Box<dyn SubCommand>,
        );

        Interactive { sub_cmds }
    }

    pub fn build_interactive(&self) -> Command<'static> {
        let subcmds: Vec<Command> = self
            .sub_cmds
            .values()
            .into_iter()
            .map(|cmd| cmd.get_command())
            .collect();

        Command::new("interactive")
            .version(crate_version!())
            .subcommands(subcmds)
    }

    pub async fn start(&self) {
        let mut rl = Editor::<()>::new();
        if rl.load_history(HISTORY_FILE).is_err() {
            println!("No previous history.");
        }

        let parser = self.build_interactive();
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
                            if let Some((name, matches)) = matches.subcommand() {
                                // println!("cmd name: {}", name);
                                let sub_cmd = &self.sub_cmds[&name.to_string()];
                                sub_cmd.exec_command(matches).await.unwrap();
                            } else {
                                println!("cli parse error");
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
}
