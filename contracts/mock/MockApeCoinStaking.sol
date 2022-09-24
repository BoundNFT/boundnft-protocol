// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.4;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

import "hardhat/console.sol";

contract MockApeCoinStaking is OwnableUpgradeable {
  string public constant POOL_APECOIN = "ApeCoin";
  string public constant POOL_BAYC = "BAYC";
  string public constant POOL_MAYC = "MAYC";
  string public constant POOL_BAKC = "BAKC";

  uint256 public constant MAX_BAYC_CAP = 10094 * 10**18;
  uint256 public constant MAX_MAYC_CAP = 2042 * 10**18;
  uint256 public constant MAX_BAKC_CAP = 856 * 10**18;

  address public coinToken;
  address public baycToken;
  address public maycToken;
  address public bakcToken;

  struct PoolData {
    bool valid;
    address nftAsset;
    string pairedPool;
    uint256 maxCapPerItem;
    uint256 poolAmount;
    uint256 timeStart;
    uint256 timeEnd;
    uint256 totalClaimedAmount;
    // user staked apecoin in this pool
    mapping(address => uint256) userTotalStakedAmounts;
  }
  mapping(string => PoolData) public poolDatas;

  struct TokenData {
    bool valid;
    uint256 stakedAmount;
    address pairedAsset;
    uint256 pairedTokenId;
  }
  mapping(address => mapping(uint256 => TokenData)) public tokenDatas;

  function initialize(
    address _coinToken,
    address _baycToken,
    address _maycToken,
    address _bakcToken
  ) external initializer {
    __Ownable_init();

    coinToken = _coinToken;
    baycToken = _baycToken;
    maycToken = _maycToken;
    bakcToken = _bakcToken;

    PoolData storage coinPool = poolDatas[POOL_APECOIN];
    coinPool.valid = true;
    coinPool.poolAmount = 30000000 * 10**18;
    coinPool.timeStart = block.timestamp;
    coinPool.timeEnd = block.timestamp + 365 days;

    PoolData storage bakcPool = poolDatas[POOL_BAKC];
    bakcPool.valid = true;
    bakcPool.nftAsset = _bakcToken;
    bakcPool.maxCapPerItem = MAX_BAKC_CAP;
    bakcPool.poolAmount = 3835000 * 10**18;
    bakcPool.timeStart = block.timestamp;
    bakcPool.timeEnd = block.timestamp + 365 days;

    PoolData storage baycPool = poolDatas[POOL_BAYC];
    baycPool.valid = true;
    baycPool.nftAsset = _baycToken;
    baycPool.maxCapPerItem = MAX_BAYC_CAP;
    baycPool.pairedPool = POOL_BAKC;
    baycPool.poolAmount = 47105000 * 10**18;
    baycPool.timeStart = block.timestamp;
    baycPool.timeEnd = block.timestamp + 365 days;

    PoolData storage maycPool = poolDatas[POOL_MAYC];
    maycPool.valid = true;
    maycPool.nftAsset = _maycToken;
    maycPool.maxCapPerItem = MAX_MAYC_CAP;
    maycPool.pairedPool = POOL_BAKC;
    maycPool.poolAmount = 19060000 * 10**18;
    maycPool.timeStart = block.timestamp;
    maycPool.timeEnd = block.timestamp + 365 days;
  }

  function commit(
    string calldata poolName,
    uint256[] calldata mainTokenIds,
    uint256[] calldata pairedTokenIds,
    uint256[] calldata coinAmounts
  ) public {
    PoolData storage mainPool = poolDatas[poolName];
    PoolData storage pairedPool = poolDatas[mainPool.pairedPool];

    // check params
    require(mainPool.valid, "invalid pool name");
    require(block.timestamp < mainPool.timeEnd, "pool has ended");

    require(coinAmounts.length == mainTokenIds.length, "inconsistent amount params");
    if (pairedTokenIds.length > 0) {
      require(pairedTokenIds.length == mainTokenIds.length, "inconsistent paired params");
    }

    for (uint256 i = 0; i < mainTokenIds.length; i++) {
      require(IERC721(mainPool.nftAsset).ownerOf(mainTokenIds[i]) == msg.sender, "caller not nft owner");
      require(tokenDatas[mainPool.nftAsset][mainTokenIds[i]].valid != true, "nft already commited");
    }

    if (pairedTokenIds.length > 0) {
      require(pairedPool.valid, "invalid pool name");
      for (uint256 i = 0; i < pairedTokenIds.length; i++) {
        require(IERC721(pairedPool.nftAsset).ownerOf(pairedTokenIds[i]) == msg.sender, "caller not nf owner");
        require(tokenDatas[pairedPool.nftAsset][pairedTokenIds[i]].valid != true, "paired nft already commited ");
      }
    }

    // record commits
    uint256 stakingAmount = 0;
    for (uint256 i = 0; i < mainTokenIds.length; i++) {
      uint256 mainItemCoinAmount = 0;
      uint256 pairedItemCoinAmount = 0;

      if (coinAmounts[i] <= mainPool.maxCapPerItem) {
        mainItemCoinAmount = coinAmounts[i];
      } else {
        mainItemCoinAmount = mainPool.maxCapPerItem;
      }
      tokenDatas[mainPool.nftAsset][mainTokenIds[i]].valid = true;
      tokenDatas[mainPool.nftAsset][mainTokenIds[i]].stakedAmount = mainItemCoinAmount;

      mainPool.userTotalStakedAmounts[msg.sender] += mainItemCoinAmount;
      stakingAmount += mainItemCoinAmount;

      console.log("commit-main", mainTokenIds[i], mainItemCoinAmount);

      if (pairedTokenIds.length > 0) {
        if (coinAmounts[i] > mainItemCoinAmount) {
          pairedItemCoinAmount = coinAmounts[i] - mainItemCoinAmount;
        }

        tokenDatas[pairedPool.nftAsset][pairedTokenIds[i]].valid = true;
        tokenDatas[pairedPool.nftAsset][pairedTokenIds[i]].stakedAmount = pairedItemCoinAmount;

        pairedPool.userTotalStakedAmounts[msg.sender] += pairedItemCoinAmount;
        stakingAmount += pairedItemCoinAmount;

        console.log("commit-pair", pairedTokenIds[i], pairedItemCoinAmount);

        tokenDatas[pairedPool.nftAsset][pairedTokenIds[i]].pairedAsset = mainPool.nftAsset;
        tokenDatas[pairedPool.nftAsset][pairedTokenIds[i]].pairedTokenId = mainTokenIds[i];
        tokenDatas[mainPool.nftAsset][mainTokenIds[i]].pairedTokenId = pairedTokenIds[i];
      }
    }

    // transfer tokens
    IERC20(coinToken).transferFrom(msg.sender, address(this), stakingAmount);
  }

  function uncommit(string calldata poolName, uint256[] calldata mainTokenIds) public {
    PoolData storage mainPool = poolDatas[poolName];

    for (uint256 i = 0; i < mainTokenIds.length; i++) {
      require(IERC721(mainPool.nftAsset).ownerOf(mainTokenIds[i]) == msg.sender, "caller not nft owner");
      require(tokenDatas[mainPool.nftAsset][mainTokenIds[i]].valid == true, "nft not commited");
    }

    uint256 stakedAmount = 0;
    uint256 rewardAmount = 0;

    for (uint256 i = 0; i < mainTokenIds.length; i++) {
      TokenData storage tokenData = tokenDatas[mainPool.nftAsset][mainTokenIds[i]];
      if (!tokenData.valid) {
        continue;
      }

      stakedAmount += tokenData.stakedAmount;

      if (tokenData.pairedAsset == bakcToken) {
        // uncommit BAKC, should keep the paired BAYC or MAYC staking
        TokenData storage pairedTokenData = tokenDatas[tokenData.pairedAsset][tokenData.pairedTokenId];

        pairedTokenData.pairedAsset = address(0);
        pairedTokenData.pairedTokenId = 0;

        rewardAmount = 10 * 10**18;
      } else if (tokenData.pairedAsset != address(0)) {
        // uncommit BAYC or MAYC, need uncommit the paired BAKC staking
        TokenData storage pairedTokenData = tokenDatas[tokenData.pairedAsset][tokenData.pairedTokenId];

        stakedAmount += pairedTokenData.stakedAmount;

        rewardAmount = 10 * 10**18;

        delete tokenDatas[tokenData.pairedAsset][tokenData.pairedTokenId];
      }

      delete tokenDatas[mainPool.nftAsset][mainTokenIds[i]];
    }

    if (rewardAmount > 0) {
      IERC20(coinToken).transfer(msg.sender, rewardAmount);
    }

    if (stakedAmount > 0) {
      IERC20(coinToken).transfer(msg.sender, stakedAmount);
    }
  }

  function deposit(string calldata poolName, uint256 coinAmount) public {
    PoolData storage mainPool = poolDatas[poolName];

    // check params
    require(mainPool.valid, "invalid pool name");
    require(block.timestamp < mainPool.timeEnd, "pool has ended");

    mainPool.userTotalStakedAmounts[msg.sender] += coinAmount;

    // transfer tokens
    IERC20(coinToken).transferFrom(msg.sender, address(this), coinAmount);
  }

  function withdraw(string calldata poolName, uint256 coinAmount) public {
    PoolData storage mainPool = poolDatas[poolName];

    require(coinAmount <= mainPool.userTotalStakedAmounts[msg.sender], "exceed staked amount");
    mainPool.userTotalStakedAmounts[msg.sender] -= coinAmount;

    IERC20(coinToken).transfer(msg.sender, coinAmount);
  }

  function claimRewards(string calldata poolName, uint256[] calldata tokenIds) public {
    PoolData storage claimPool = poolDatas[poolName];

    for (uint256 i = 0; i < tokenIds.length; i++) {
      require(IERC721(claimPool.nftAsset).ownerOf(tokenIds[i]) == msg.sender, "caller not nft owner");
      require(tokenDatas[claimPool.nftAsset][tokenIds[i]].valid == true, "nft not commited");
    }

    uint256 coinAmount = 100 * 10**18;

    IERC20(coinToken).transfer(msg.sender, coinAmount);
  }
}
