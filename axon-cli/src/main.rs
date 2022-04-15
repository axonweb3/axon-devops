mod cli;
mod interactive;

use cli::Cli;
use interactive::Interative;

fn main() {
    let matches = Cli::init().get_matches();
    let c_path = matches.value_of("docker-compose-path").unwrap();
    println!("compose path: {}", c_path);
    let d_path = matches.value_of("chain-data-path").unwrap();
    println!("chain data path: {}", d_path);

    Interative::start(c_path, d_path);
}
