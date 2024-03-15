import {keccak} from '@adraffy/keccak';
import {Uint256} from '../src/abi.js';

console.log([
	//'basenode()',
	//'GRACE_PERIOD()',
	//'ens()',
	//'owner()',
	//'isOwner()',
	//'available(uint256)', 
	//'nameExpires(uint256)',

	/*
	'GRACE_PERIOD()',
	'ens()',
	'baseNode()',
	'controllers(address)',
    'addController(address)',
    'removeController(address)',
    'setResolver(address)',
	'nameExpires(uint256)',
	'available(uint256)', 
    'register(uint256,address,uint256)',
    'renew(uint256,uint256)',
	'reclaim(uint256,address)',
	*/

	"rentPrice(string,uint256)",
	"available(string)",
	"makeCommitment(string,address,bytes32)",
	"commit(bytes32)",
	"register(string,address,uint256,bytes32)",
	"renew(string,uint256)",
/*
	'balanceOf(address)', 
	'ownerOf(uint256)', 
	'approve(address,uint256)', 
	'getApproved(uint256)', 
	'setApprovalForAll(address,bool)', 
	'isApprovedForAll(address,address)', 	
	'transferFrom(address,address,uint256)',
	'safeTransferFrom(address,address,uint256)',
	'safeTransferFrom(address,address,uint256,bytes)',
*/

	//'renew(uint256,uint256)',
	//'reclaim(uint256,address)',
	//'register(uint256,address,uint256)',
	//'registerOnly(uint256,address,uint256)',

].reduce((a, x) => a.xor(keccak().update(x).bytes), Uint256.zero()).hex.slice(0, 10));

    /*
     * 0x80ac58cd ===
     *     bytes4(keccak256('balanceOf(address)')) ^
     *     bytes4(keccak256('ownerOf(uint256)')) ^
     *     bytes4(keccak256('approve(address,uint256)')) ^
     *     bytes4(keccak256('getApproved(uint256)')) ^
     *     bytes4(keccak256('setApprovalForAll(address,bool)')) ^
     *     bytes4(keccak256('isApprovedForAll(address,address)')) ^
     *     bytes4(keccak256('transferFrom(address,address,uint256)')) ^
     *     bytes4(keccak256('safeTransferFrom(address,address,uint256)')) ^
     *     bytes4(keccak256('safeTransferFrom(address,address,uint256,bytes)'))
     */