mod cli;
pub use cli::Cli;

mod interactive;
pub use interactive::Interative;

fn main() {
    let matches = Cli::init().matches;
    let c_path = matches.value_of("docker-compose-path").unwrap();
    println!("compose path: {}", c_path);
    let d_path = matches.value_of("chain-data-path").unwrap();
    println!("chain data path: {}", d_path);

    let _result = match matches.subcommand() {
        // ("run",_) => println!("run"),
        _ => {
            Interative::start(c_path, d_path);
        }
    };
}
