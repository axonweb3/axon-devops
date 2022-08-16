use async_trait::async_trait;
use clap::{ArgMatches, Command};
use std::error::Error as StdErr;

#[async_trait]
pub trait SubCommand {
    fn get_command(&self) -> Command<'static>;
    async fn exec_command(&self, matches: &ArgMatches) -> Result<(), Box<dyn StdErr>>;
}
