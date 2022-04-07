use clap::{crate_version, Arg, ArgMatches, Command};
use rustyline::error::ReadlineError;
use rustyline::Editor;
pub struct Cli {
    pub matches: ArgMatches,
}

impl Cli {
    pub fn init() -> Self {
        let matches = Command::new("axon_cli")
            .version(crate_version!())
            .arg(
                Arg::new("network_mode")
                    .short('m')
                    .long("mode")
                    .help("Axon network mode, at most 4 nodes can be started automatically")
                    .required(true)
                    .takes_value(true),
            )
            .get_matches();

        Cli { matches }
    }

    pub fn start(&self) {
        let mode = self.matches.value_of("network_mode").unwrap();
        println!("hahahhahahahahhh    {}", mode);
    }
}

fn interactive() {
    // `()` can be used when no completer is required
    let mut rl = Editor::<()>::new();
    if rl.load_history("history.txt").is_err() {
        println!("No previous history.");
    }
    loop {
        let readline = rl.readline(">> ");
        match readline {
            Ok(line) => {
                rl.add_history_entry(line.as_str());
                println!("Line: {}", line);
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

fn main() {
    let matches = Cli::init().matches;
    if matches.is_present("network_mode") {
        let mode = matches.value_of("network_mode").unwrap();
        println!("hahahhahahahahhh {}", mode);
    }

    let _result = match matches.subcommand() {
        // ("run",_) => println!("run"),
        _ => {
            interactive();
        }
    };
}
