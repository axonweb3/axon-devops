mod cli;
pub use cli::Cli;

mod interactive;
pub use interactive::interactive;

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
