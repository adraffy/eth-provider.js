import {ABIEncoder, ABIDecoder} from './abi.js';

// convenience for making an eth_call
// return an ABIDecoder
// https://eth.wiki/json-rpc/API#eth_call
// https://www.jsonrpc.org/specification
// https://docs.soliditylang.org/en/latest/abi-spec.html
export async function eth_call(provider, tx, enc = null, tag = 'latest') {
	if (typeof provider !== 'object') throw new TypeError('expected provider');
	if (typeof tx === 'string') tx = {to: tx};
	if (enc instanceof ABIEncoder) tx.data = enc.build_hex();
	try {
		let hex = await provider.request({method: 'eth_call', params:[tx, tag]});
		return ABIDecoder.from_hex(hex);
	} catch (err) {
		if (err.code == -32000 && err.message === 'execution reverted') {
			err.reverted = true;
		}
		throw err;
	}
}

// return true if the address corresponds to a contract
export async function is_contract(provider, address) {
	try {
		let code = await provider.request({method: 'eth_getCode', params:[address, 'latest']});
		return code.length > 2; // 0x...
	} catch (err) {
		return false;
	}
}

// https://eips.ethereum.org/EIPS/eip-165
export async function supports_interface(provider, contract, method) {
	return eth_call(provider, contract, ABIEncoder.method('supportsInterface(bytes4)').method(method)).then(dec => {
		return dec.remaining > 0 && dec.boolean();
	}).catch(err => {
		if (err.code === -32000) return false; // TODO: implement proper fallback
		throw err;
	});
}