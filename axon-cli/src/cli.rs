use clap::{crate_version, Arg, ArgMatches, Command};

pub struct Cli {
    pub matches: ArgMatches,
}

impl Cli {
    pub fn init() -> Self {
        let matches = Command::new("axon_cli")
            .version(crate_version!())
            .arg(
                Arg::new("docker-compose-path")
                    .short('c')
                    .long("compose")
                    .help("absolute path of docker-compose.yml")
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
}
