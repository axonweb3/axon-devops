mod cli;
mod interactive;
mod mydocker;

use cli::Cli;
use interactive::Interactive;

fn main() {
    let matches = Cli::init().get_matches();
    let m_path = matches.value_of("mount-path").unwrap();
    println!("mount path: {}", m_path);
    let d_path = matches.value_of("chain-data-path").unwrap();
    println!("chain data path: {}", d_path);

    Interactive::start(m_path, d_path);
}
