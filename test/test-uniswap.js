import {WS as provider} from './nodejs-provider.js';
import {Uint256, eth_call, ABIEncoder} from '../index.js';


//let u = Uint256.from_dec('1000000000000000000');
//console.log(u.ether);

//u.set_digits(256, [13, 224, 182, 179, 167, 100, 0, 0]);

//u.set_digits


async function get_eth_usd() {
	const UNISWAP_V2 = '0x7a250d5630b4cf539739df2c5dacb4c659f2488d';
	const WETH = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
	const USDC = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
	let [_, usd] = await eth_call(provider, UNISWAP_V2, ABIEncoder.method('getAmountsOut(uint256,address[])')
		.number(Uint256.from_dec('1000000000000000000'))
		.addr([WETH, USDC])).then(dec => dec.array(dec => dec.uint256()));
	return usd.as_float(-6);
}

while (true) {
	console.log(await get_eth_usd());
	await new Promise(f => setTimeout(f, 5000));
}
