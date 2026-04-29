#![cfg(test)]
extern crate std;

use super::*;
use soroban_sdk::token::Client as TokenClient;
use soroban_sdk::token::StellarAssetClient as TokenAdminClient;
use soroban_sdk::{testutils::Address as _, Address, Env};

fn create_token_contract<'a>(e: &Env, admin: &Address) -> (TokenClient<'a>, TokenAdminClient<'a>) {
    let sac = e.register_stellar_asset_contract_v2(admin.clone());
    (
        TokenClient::new(e, &sac.address()),
        TokenAdminClient::new(e, &sac.address()),
    )
}

#[test]
fn test_stake_and_global_stats() {
    let env = Env::default();
    env.mock_all_auths();

    let token_admin = Address::generate(&env);
    let staker1 = Address::generate(&env);
    let staker2 = Address::generate(&env);

    let (token, token_admin_client) = create_token_contract(&env, &token_admin);
    let contract_id = env.register(Contract, (&token.address, &100_i128));
    let client = ContractClient::new(&env, &contract_id);

    // Mint tokens to stakers
    token_admin_client.mint(&staker1, &5000_i128);
    token_admin_client.mint(&staker2, &3000_i128);

    // Approve staking contract
    token.approve(&staker1, &contract_id, &5000_i128, &0_u32);
    token.approve(&staker2, &contract_id, &3000_i128, &0_u32);

    // Stake
    client.stake(&staker1, &2000_i128);
    assert_eq!(token.balance(&staker1), 3000_i128);
    assert_eq!(token.balance(&contract_id), 2000_i128);

    // Check staker info
    let info = client.get_staker_info(&staker1);
    assert_eq!(info.staked, 2000_i128);

    // Second staker stakes
    client.stake(&staker2, &1000_i128);

    // Get global stats
    let stats = client.get_global_stats();
    assert_eq!(stats.total_staked, 3000_i128);
    assert_eq!(stats.staker_count, 2_u32);
}

#[test]
fn test_unstake_partial() {
    let env = Env::default();
    env.mock_all_auths();

    let token_admin = Address::generate(&env);
    let staker = Address::generate(&env);

    let (token, token_admin_client) = create_token_contract(&env, &token_admin);
    let contract_id = env.register(Contract, (&token.address, &100_i128));
    let client = ContractClient::new(&env, &contract_id);

    token_admin_client.mint(&staker, &10000_i128);
    token.approve(&staker, &contract_id, &10000_i128, &0_u32);

    client.stake(&staker, &5000_i128);

    // Unstake partial
    client.unstake(&staker, &2000_i128);
    assert_eq!(token.balance(&staker), 10000_i128 - 3000_i128);

    let info = client.get_staker_info(&staker);
    assert_eq!(info.staked, 3000_i128);
}

#[test]
fn test_full_unstake() {
    let env = Env::default();
    env.mock_all_auths();

    let token_admin = Address::generate(&env);
    let staker = Address::generate(&env);

    let (token, token_admin_client) = create_token_contract(&env, &token_admin);
    let contract_id = env.register(Contract, (&token.address, &100_i128));
    let client = ContractClient::new(&env, &contract_id);

    token_admin_client.mint(&staker, &10000_i128);
    token.approve(&staker, &contract_id, &10000_i128, &0_u32);

    client.stake(&staker, &3000_i128);
    assert_eq!(client.get_global_stats().staker_count, 1_u32);

    client.unstake(&staker, &3000_i128);
    assert_eq!(client.get_global_stats().staker_count, 0_u32);
}

#[test]
fn test_compound_stake() {
    let env = Env::default();
    env.mock_all_auths();

    let token_admin = Address::generate(&env);
    let staker = Address::generate(&env);

    let (token, token_admin_client) = create_token_contract(&env, &token_admin);
    let contract_id = env.register(Contract, (&token.address, &100_i128));
    let client = ContractClient::new(&env, &contract_id);

    token_admin_client.mint(&staker, &10000_i128);
    token.approve(&staker, &contract_id, &10000_i128, &0_u32);

    client.stake(&staker, &3000_i128);
    client.compound_stake(&staker, &1000_i128);

    let info = client.get_staker_info(&staker);
    assert_eq!(info.staked, 4000_i128);
}

#[test]
fn test_get_staker_info_not_found() {
    let env = Env::default();
    env.mock_all_auths();

    let token_admin = Address::generate(&env);
    let random = Address::generate(&env);

    let (token, _token_admin_client) = create_token_contract(&env, &token_admin);
    let contract_id = env.register(Contract, (&token.address, &100_i128));
    let client = ContractClient::new(&env, &contract_id);

    assert!(client.try_get_staker_info(&random).is_err());
}

#[test]
fn test_stake_insufficient_balance() {
    let env = Env::default();
    env.mock_all_auths();

    let token_admin = Address::generate(&env);
    let staker = Address::generate(&env);

    let (token, token_admin_client) = create_token_contract(&env, &token_admin);
    let contract_id = env.register(Contract, (&token.address, &100_i128));
    let client = ContractClient::new(&env, &contract_id);

    token_admin_client.mint(&staker, &1000_i128);
    token.approve(&staker, &contract_id, &1000_i128, &0_u32);

    assert!(client.try_stake(&staker, &5000_i128).is_err());
}

#[test]
fn test_unstake_more_than_staked() {
    let env = Env::default();
    env.mock_all_auths();

    let token_admin = Address::generate(&env);
    let staker = Address::generate(&env);

    let (token, token_admin_client) = create_token_contract(&env, &token_admin);
    let contract_id = env.register(Contract, (&token.address, &100_i128));
    let client = ContractClient::new(&env, &contract_id);

    token_admin_client.mint(&staker, &5000_i128);
    token.approve(&staker, &contract_id, &5000_i128, &0_u32);
    client.stake(&staker, &2000_i128);

    assert!(client.try_unstake(&staker, &5000_i128).is_err());
}

#[test]
fn test_zero_stake() {
    let env = Env::default();
    env.mock_all_auths();

    let token_admin = Address::generate(&env);
    let staker = Address::generate(&env);

    let (token, token_admin_client) = create_token_contract(&env, &token_admin);
    let contract_id = env.register(Contract, (&token.address, &100_i128));
    let client = ContractClient::new(&env, &contract_id);

    token_admin_client.mint(&staker, &5000_i128);
    token.approve(&staker, &contract_id, &5000_i128, &0_u32);

    assert!(client.try_stake(&staker, &0_i128).is_err());
}

#[test]
fn test_global_stats_empty() {
    let env = Env::default();
    env.mock_all_auths();

    let token_admin = Address::generate(&env);

    let (token, _token_admin_client) = create_token_contract(&env, &token_admin);
    let contract_id = env.register(Contract, (&token.address, &100_i128));
    let client = ContractClient::new(&env, &contract_id);

    let stats = client.get_global_stats();
    assert_eq!(stats.total_staked, 0_i128);
    assert_eq!(stats.staker_count, 0_u32);
}
