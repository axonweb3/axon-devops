use clap::{crate_version, Arg, ArgMatches, Command};

pub struct Cli {
    matches: ArgMatches,
}

impl Cli {
    pub fn init() -> Self {
        let matches = Command::new("axon_cli")
            .version(crate_version!())
            .arg(
                Arg::new("mount-path")
                    .short('m')
                    .long("mount")
                    .help("absolute mount path of docker container")
                    .required(true)
                    .takes_value(true),
            )
            .arg(
                Arg::new("chain-data-path")
                    .short('d')
                    .long("data")
                    .help("absolute path of chain data")
                    .required(true)
                    .takes_value(true),
            )
            .get_matches();

        Cli { matches }
    }

    pub fn get_matches(self) -> ArgMatches {
        self.matches
    }
}
