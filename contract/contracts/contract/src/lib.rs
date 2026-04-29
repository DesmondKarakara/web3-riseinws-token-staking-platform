#![no_std]
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, panic_with_error, Address, Env,
};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    NotFound = 1,
    InvalidAmount = 2,
    InsufficientBalance = 3,
    InsufficientStaked = 4,
    TransferFailed = 5,
}

#[contracttype]
#[derive(Clone)]
pub struct StakerInfo {
    pub staked: i128,
    pub pending_rewards: i128,
    pub last_reward_per_token: i128,
}

#[contracttype]
#[derive(Clone)]
pub struct GlobalStats {
    pub total_staked: i128,
    pub staker_count: u32,
    pub reward_rate: i128,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Token,
    RewardRate,
    LastUpdate,
    RewardPerTokenStored,
    StakerInfo(Address),
    TotalStaked,
    StakerCount,
}

#[contract]
pub struct Contract;

#[contractimpl]
impl Contract {
    pub fn __constructor(env: Env, token: Address, reward_rate: i128) {
        Self::init(env, token, reward_rate);
    }

    pub fn init(env: Env, token: Address, reward_rate: i128) {
        env.storage().instance().set(&DataKey::Token, &token);
        env.storage()
            .instance()
            .set(&DataKey::RewardRate, &reward_rate);
        env.storage()
            .instance()
            .set(&DataKey::LastUpdate, &env.ledger().timestamp());
        env.storage()
            .instance()
            .set(&DataKey::RewardPerTokenStored, &0_i128);
        env.storage().instance().set(&DataKey::TotalStaked, &0_i128);
        env.storage().persistent().set(&DataKey::StakerCount, &0_u32);
    }

    fn get_token(env: &Env) -> Address {
        env.storage().instance().get(&DataKey::Token).unwrap()
    }

    fn get_reward_rate(env: &Env) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::RewardRate)
            .unwrap_or(0)
    }

    fn get_total_staked(env: &Env) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::TotalStaked)
            .unwrap_or(0)
    }

    fn get_staker_count(env: &Env) -> u32 {
        env.storage()
            .persistent()
            .get(&DataKey::StakerCount)
            .unwrap_or(0)
    }

    fn get_reward_per_token(env: &Env) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::RewardPerTokenStored)
            .unwrap_or(0)
    }

    fn update_global(env: &Env) {
        let total_staked = Self::get_total_staked(env);
        let last_update = env
            .storage()
            .instance()
            .get::<_, u64>(&DataKey::LastUpdate)
            .unwrap_or(0);
        let reward_rate = Self::get_reward_rate(env);
        let current_time = env.ledger().timestamp();

        if total_staked > 0 {
            let time_passed = current_time.saturating_sub(last_update);
            let increase = reward_rate * time_passed as i128;
            let new_rpt = Self::get_reward_per_token(env) + increase;
            env.storage()
                .instance()
                .set(&DataKey::RewardPerTokenStored, &new_rpt);
        }
        env.storage()
            .instance()
            .set(&DataKey::LastUpdate, &current_time);
    }

    fn update_staker_rewards(env: &Env, staker: &Address) -> i128 {
        let mut info: StakerInfo = env
            .storage()
            .persistent()
            .get(&DataKey::StakerInfo(staker.clone()))
            .unwrap_or(StakerInfo {
                staked: 0,
                pending_rewards: 0,
                last_reward_per_token: 0,
            });

        let rpt = Self::get_reward_per_token(env);
        let pending = info.staked * (rpt - info.last_reward_per_token);
        info.pending_rewards += pending;
        info.last_reward_per_token = rpt;
        env.storage()
            .persistent()
            .set(&DataKey::StakerInfo(staker.clone()), &info);
        info.pending_rewards
    }

    pub fn stake(env: Env, staker: Address, amount: i128) {
        staker.require_auth();
        if amount <= 0 {
            panic_with_error!(&env, Error::InvalidAmount);
        }

        let token = Self::get_token(&env);
        use soroban_sdk::token;
        let token_client = token::Client::new(&env, &token);
        if token_client.allowance(&staker, &env.current_contract_address()) < amount {
            panic_with_error!(&env, Error::InsufficientBalance);
        }
        if token_client.balance(&staker) < amount {
            panic_with_error!(&env, Error::InsufficientBalance);
        }

        Self::update_global(&env);
        let is_new_staker = env
            .storage()
            .persistent()
            .get::<DataKey, StakerInfo>(&DataKey::StakerInfo(staker.clone()))
            .is_none();
        Self::update_staker_rewards(&env, &staker);
        token_client.transfer(&staker, &env.current_contract_address(), &amount);

        let mut info: StakerInfo;
        if is_new_staker {
            let c = Self::get_staker_count(&env);
            env.storage()
                .persistent()
                .set(&DataKey::StakerCount, &(c + 1));
            info = StakerInfo {
                staked: 0,
                pending_rewards: 0,
                last_reward_per_token: Self::get_reward_per_token(&env),
            };
        } else {
            info = env
                .storage()
                .persistent()
                .get(&DataKey::StakerInfo(staker.clone()))
                .unwrap();
        }

        info.staked += amount;
        env.storage()
            .persistent()
            .set(&DataKey::StakerInfo(staker.clone()), &info);

        let total = Self::get_total_staked(&env);
        env.storage()
            .instance()
            .set(&DataKey::TotalStaked, &(total + amount));
    }

    pub fn unstake(env: Env, staker: Address, amount: i128) {
        staker.require_auth();
        if amount <= 0 {
            panic_with_error!(&env, Error::InvalidAmount);
        }

        Self::update_global(&env);
        Self::update_staker_rewards(&env, &staker);

        let mut info: StakerInfo = env
            .storage()
            .persistent()
            .get(&DataKey::StakerInfo(staker.clone()))
            .unwrap_or_else(|| panic_with_error!(&env, Error::NotFound));
        if info.staked < amount {
            panic_with_error!(&env, Error::InsufficientStaked);
        }

        let total = Self::get_total_staked(&env);
        let token = Self::get_token(&env);
        let claim = info.pending_rewards + amount;
        info.staked -= amount;
        info.pending_rewards = 0;

        env.storage()
            .instance()
            .set(&DataKey::TotalStaked, &(total - amount));

        if info.staked == 0 {
            let c = Self::get_staker_count(&env);
            env.storage()
                .persistent()
                .set(&DataKey::StakerCount, &(c.saturating_sub(1)));
            env.storage()
                .persistent()
                .remove(&DataKey::StakerInfo(staker.clone()));
        } else {
            env.storage()
                .persistent()
                .set(&DataKey::StakerInfo(staker.clone()), &info);
        }

        use soroban_sdk::token;
        token::Client::new(&env, &token).transfer(&env.current_contract_address(), &staker, &claim);
    }

    pub fn claim_rewards(env: Env, staker: Address) {
        staker.require_auth();

        let pending = Self::update_staker_rewards(&env, &staker);
        if pending <= 0 {
            panic_with_error!(&env, Error::InvalidAmount);
        }

        let mut info: StakerInfo = env
            .storage()
            .persistent()
            .get(&DataKey::StakerInfo(staker.clone()))
            .unwrap_or_else(|| panic_with_error!(&env, Error::NotFound));
        info.pending_rewards = 0;
        env.storage()
            .persistent()
            .set(&DataKey::StakerInfo(staker.clone()), &info);

        let token = Self::get_token(&env);
        use soroban_sdk::token;
        token::Client::new(&env, &token).transfer(
            &env.current_contract_address(),
            &staker,
            &pending,
        );
    }

    pub fn compound_stake(env: Env, staker: Address, extra_amount: i128) {
        staker.require_auth();
        if extra_amount < 0 {
            panic_with_error!(&env, Error::InvalidAmount);
        }

        Self::update_global(&env);
        let pending = Self::update_staker_rewards(&env, &staker);
        let total_compound = pending + extra_amount;

        let mut info: StakerInfo = env
            .storage()
            .persistent()
            .get(&DataKey::StakerInfo(staker.clone()))
            .unwrap_or(StakerInfo {
                staked: 0,
                pending_rewards: 0,
                last_reward_per_token: Self::get_reward_per_token(&env),
            });

        let total_staked = Self::get_total_staked(&env);

        if total_compound > 0 {
            if extra_amount > 0 {
                let token = Self::get_token(&env);
                use soroban_sdk::token;
                let tc = token::Client::new(&env, &token);
                if tc.allowance(&staker, &env.current_contract_address()) < extra_amount {
                    panic_with_error!(&env, Error::InsufficientBalance);
                }
                if tc.balance(&staker) < extra_amount {
                    panic_with_error!(&env, Error::InsufficientBalance);
                }
                tc.transfer(&staker, &env.current_contract_address(), &extra_amount);
            }
            info.staked += total_compound;
            env.storage()
                .instance()
                .set(&DataKey::TotalStaked, &(total_staked + total_compound));
        }

        info.pending_rewards = 0;
        info.last_reward_per_token = Self::get_reward_per_token(&env);
        env.storage()
            .persistent()
            .set(&DataKey::StakerInfo(staker.clone()), &info);
    }

    pub fn get_staker_info(env: Env, staker: Address) -> StakerInfo {
        Self::update_global(&env);
        env.storage()
            .persistent()
            .get(&DataKey::StakerInfo(staker.clone()))
            .unwrap_or_else(|| panic_with_error!(&env, Error::NotFound))
    }

    pub fn get_global_stats(env: Env) -> GlobalStats {
        Self::update_global(&env);
        GlobalStats {
            total_staked: Self::get_total_staked(&env),
            staker_count: Self::get_staker_count(&env),
            reward_rate: Self::get_reward_rate(&env),
        }
    }
}

mod test;
