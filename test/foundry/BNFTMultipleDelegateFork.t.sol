// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.4;

import "forge-std/Test.sol";

import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "../../contracts/interfaces/IBNFTRegistry.sol";
import "../../contracts/interfaces/IBNFT.sol";

import "../../contracts/libraries/BNFTProxyAdmin.sol";
import "../../contracts/libraries/BNFTUpgradeableProxy.sol";
import "../../contracts/protocol/BNFTRegistry.sol";
import "../../contracts/protocol/BNFT.sol";

contract BNFTMultipleDelegateForkTest is Test {
  using SafeERC20 for IERC20;

  bytes32 internal nextUser = keccak256(abi.encodePacked("user address"));

  // the address of the contract on the mainnet fork
  address constant multisigOwnerAddress = 0xe6b80f77a8B8FcD124aB748C720B7EAEA83dDb4C;
  address constant timelockController7DAddress = 0x4e4C314E2391A58775be6a15d7A05419ba7D2B6e;
  address constant timelockController24HAddress = 0x652DB942BE3Ab09A8Fd6F14776a52ed2A73bF214;
  address constant bnftRegistryAddress = 0x79d922DD382E42A156bC0A354861cDBC4F09110d;
  address constant proxyAdminAddress = 0xe635D0fb1608aA54C3ca99c497E887d2e1E3E690;
  // NFT reserve related addresses
  address constant maycTokenAddress = 0x60E4d786628Fea6478F785A6d7e704777c86a7c6;
  address constant clonexTokenAddress = 0x49cF6f5d44E70224e2E23fDcdd2C053F30aDA28B;
  // contracts
  BNFTProxyAdmin public proxyAdminPool;
  BNFTRegistry public bnftRegistry;

  // how to run this testcase
  // url: https://eth-mainnet.g.alchemy.com/v2/xxx
  // forge test --match-contract BNFTMultipleDelegateForkTest --fork-url https://RPC --fork-block-number 17933075

  function setUp() public {
    proxyAdminPool = BNFTProxyAdmin(proxyAdminAddress);
    bnftRegistry = BNFTRegistry(bnftRegistryAddress);
  }

  function testFork_UpgradeAllBoundNFTs() public {
    // upgrade all bound NFTs
    BNFT impl = new BNFT();

    vm.prank(timelockController7DAddress);
    bnftRegistry.setBNFTGenericImpl(address(impl));

    vm.prank(timelockController7DAddress);
    bnftRegistry.batchUpgradeAllBNFT();

    // check results
    (address bnftProxyAddr, ) = bnftRegistry.getBNFTAddresses(clonexTokenAddress);
    BNFT bnftCloneX = BNFT(bnftProxyAddr);

    uint256 clonexTokenId = 2099;
    address[] memory oldDelegates = bnftCloneX.getDelegateCashForToken(clonexTokenId);
    assertEq(oldDelegates.length, 0, "oldDelegates not empty");

    // config new delegates
    uint256[] memory clonexTokenIdList = new uint256[](1);
    clonexTokenIdList[0] = clonexTokenId;

    address testDelegateUser1 = getNextUserAddress();
    vm.prank(bnftCloneX.ownerOf(clonexTokenId));
    bnftCloneX.setDelegateCashForToken(testDelegateUser1, clonexTokenIdList, true);

    address[] memory curDelegates1 = bnftCloneX.getDelegateCashForToken(clonexTokenId);
    assertEq(curDelegates1.length, 1, "curDelegates1 not match");
    assertEq(curDelegates1[0], testDelegateUser1, "curDelegates1 index 0 not match");

    address testDelegateUser2 = getNextUserAddress();
    vm.prank(bnftCloneX.ownerOf(clonexTokenId));
    bnftCloneX.setDelegateCashForToken(testDelegateUser2, clonexTokenIdList, true);

    address[] memory curDelegates2 = bnftCloneX.getDelegateCashForToken(clonexTokenId);
    assertEq(curDelegates2.length, 2, "curDelegates2 not match");
    assertEq(curDelegates2[1], testDelegateUser2, "curDelegates2 index 1 not match");

    // remove all delegates
    vm.prank(bnftCloneX.ownerOf(clonexTokenId));
    bnftCloneX.setDelegateCashForToken(testDelegateUser1, clonexTokenIdList, false);

    vm.prank(bnftCloneX.ownerOf(clonexTokenId));
    bnftCloneX.setDelegateCashForToken(testDelegateUser2, clonexTokenIdList, false);

    address[] memory curDelegates3 = bnftCloneX.getDelegateCashForToken(clonexTokenId);
    assertEq(curDelegates3.length, 0, "curDelegates3 not match");

    // burn NFT
    vm.prank(bnftCloneX.ownerOf(clonexTokenId));
    bnftCloneX.setDelegateCashForToken(testDelegateUser1, clonexTokenIdList, true);

    address[] memory curDelegates4 = bnftCloneX.getDelegateCashForToken(clonexTokenId);
    assertEq(curDelegates4.length, 1, "curDelegates4 not match");

    vm.prank(bnftCloneX.minterOf(clonexTokenId));
    bnftCloneX.burn(clonexTokenId);

    address[] memory curDelegates5 = bnftCloneX.getDelegateCashForToken(clonexTokenId);
    assertEq(curDelegates5.length, 0, "curDelegates5 not match");
  }

  function getNextUserAddress() public returns (address payable) {
    // bytes32 to address conversion
    address payable user = payable(address(uint160(uint256(nextUser))));
    nextUser = keccak256(abi.encodePacked(nextUser));
    return user;
  }
}
