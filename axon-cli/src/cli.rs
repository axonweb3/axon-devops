// use clap::{crate_version, Arg, ArgMatches, Command};

// pub struct Cli {
//     matches: ArgMatches,
// }

// impl Cli {
//     pub fn init() -> Self {
//         let matches = Command::new("axon_cli")
//             .version(crate_version!())
//             .arg(
//                 Arg::new("network_mode")
//                     .short('m')
//                     .long("mode")
//                     .help("Axon network mode, at most 4 nodes can be started automatically")
//                     .required(true)
//                     .takes_value(true),
//             )
//             .get_matches();

//         Cli { matches }
//     }

//     pub fn start(&self) {
//         let mode = self.matches.value_of("network_mode").unwrap();
//         println!("hahahhahahahahhh    {}", mode);
//     }
// }
