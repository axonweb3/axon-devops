mod apm;
mod axon_node;
mod crosschain_tx;
mod docker;
mod interactive;
mod sub_command;

use interactive::Interactive;

#[tokio::main]
async fn main() {
    let inter = Interactive::new();
    inter.start().await;
}
