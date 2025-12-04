// config.js - ใช้ร่วมทั้งหน้า user และหน้า admin

const CHAIN_ID = 56;

const THBC_ADDRESS = "0xe8d4687b77B5611eF1828FDa7428034FA12a1Beb";
const STAKE_CONTRACT_ADDRESS = "0xc715253f8De35707Bd69bBE065FA561778cfA094";

const ERC20_ABI = [
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)"
];

const STAKE_ABI = [
  "function rateKjcPerThbc() view returns (uint256)",
  "function apyBps() view returns (uint256)",
  "function lockDuration() view returns (uint256)",
  "function swapAndStake(uint256 thbcAmount) external",
  "function claimAll() external",
  "function getStakeCount(address user) view returns (uint256)",
  "function getStake(address user, uint256 index) view returns (uint256 principal, uint256 reward, uint256 startTime, bool claimed)",

  // ฟังก์ชัน owner
  "function setRateKjcPerThbc(uint256 _rate) external",
  "function setAPY(uint256 _apyBps) external",
  "function setLockDuration(uint256 _lockDuration) external",
  "function withdrawToken(address token, address to, uint256 amount) external",
  "function owner() view returns (address)"
];

window.THBC_KJC_CONFIG = {
  chainId: CHAIN_ID,
  thbc: {
    address: THBC_ADDRESS,
    abi: ERC20_ABI
  },
  stake: {
    address: STAKE_CONTRACT_ADDRESS,
    abi: STAKE_ABI
  }
};
