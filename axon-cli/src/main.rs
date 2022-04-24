mod cli;
mod docker;
mod interactive;

use cli::Cli;
use interactive::Interactive;

#[tokio::main]
async fn main() {
    let matches = Cli::init().get_matches();
    let m_path = matches.value_of("mount-path").unwrap();
    println!("mount path: {}", m_path);
    let d_path = matches.value_of("chain-data-path").unwrap();
    println!("chain data path: {}", d_path);
    let b_path = matches.value_of("benchmark-data-path").unwrap();
    println!("benchmark data path: {}", b_path);

    let inter = Interactive {
        mount_path: m_path.to_string(),
        data_path:  d_path.to_string(),
        bench_path: b_path.to_string(),
    };
    inter.start().await;
}
