# eth-tools.js
Compact set of ES6 tools for Ethereum dapps that work in the browser.

* `dist/eth-tools.js` contains everything.
* `dist/eth-abi.js` contains everything except ENS support.

```Javascript
import * as tools from '@adraffy/eth-tools';
// browser:
//  all tools: 'https://unpkg.com/@adraffy/eth-tools@latest/dist/eth-tools.min.js'
//    w/o ENS: 'https://unpkg.com/@adraffy/eth-tools@latest/dist/eth-abi.min.js'
```

## [@adraffy/keccak.js](https://github.com/adraffy/keccak.js/)
```Javascript
import {keccak, sha3} from '@adraffy/eth-tools';

console.log(keccak().update('abc').hex);      // keccak-256 hash, hex-string, no prefix
console.log(sha3(384).update([1,2,3]).bytes); // sha-384, Uint8Array

// and a few utilities:
import {bytes_from_hex, bytes_from_str, hex_from_bytes, str_from_bytes} from '@adraffy/keccak';

console.log(bytes_from_hex('0x01'));    // UintArray(1)[1]  (0x-prefix is optional)
console.log(bytes_from_str('abc'));     // UintArray(3)[97, 98, 99]
console.log(hex_from_bytes([1,2,3,4])); // "01020304" (no 0x-prefix)
console.log(str_from_bytes([97]));      // "A", throws if invalid utf8
```

## ABIEncoder
```Javascript
import {ABIEncoder} from '@adraffy/eth-tools';

let enc = ABIEncoder.method('func(string,bytes32'); // or hashed signature
enc.string('hello');
enc.memory(Uint8Array.of(1,2,3));
enc.number(1234);
enc.big(1152921504606846976n);
enc.addr('0x4976fb03C32e5B8cfe2b6cCB31c09Ba78EBaBa41');

console.log(enc.build());     // Uint8Array
console.log(enc.build_hex()); // hex-string (0x-prefixed)
```
## ABIDecoder
```Javascript
import {ABIDecoder} from '@adraffy/eth-tools';

let dec = ABIDecoder.from_hex(enc.build_hex());
dec.read(4); // skip signature
console.log(dec.string()); // read memory, return utf string
console.log(dec.memory()); // read memory, return Uint8Array
console.log(dec.number()); // read u256 as number, throws if too big
console.log(dec.big());    // read u256 as BigInt
console.log(dec.addr());   // read 40-char hex-string (0x-prefixed w/checksum)
```

## [@adraffy/ens-normalize.js](https://github.com/adraffy/ens-normalize.js/)
```Javascript
import {ens_normalize} from '@adraffy/eth-tools';

let normalized = ens_normalize('🚴‍♂️.eth'); // throws if error
```

### ens.js
```Javascript
import {ens_node_from_name, ens_address_from_name, ens_name_from_address} from '@adraffy/eth-tools';

let provider = window.ethereum; // or some other async provider (see below)

// get hash of a name (called a node)
console.log(ens_node_from_name('nick.eth')); // returns 64-char hex, no 0x-prefix, does not normalize!

// resolve an unnormalized name
console.log(await ens_address_from_name(provider, 'nIcK.eth')); // throws if error
// returns {name, name0, node, resolver, address}

// reverse an address to a name
console.log(await ens_name_from_address(provider, '0xb8c2C29ee19D8307cb7255e1Cd9CbDE883A267d5')); // throws if error, 0x-prefix is optional
// returns {address, node, resolver, name}

import {ens_avatar, ens_text_record, ens_addr_record} from '@adraffy/eth-tools';

// get avatar by unnormalized name or address or previous lookup
// also looks up contract, checks ownership, etc. 
let avatar = await ens_avatar(provider, 'niCk.eTh'); // throws if error
console.log(avatar); 
// returns {type, name, address, avatar, contract, token, meta_uri, is_owner}
// type can be: ['null, 'url', 'erc1155', 'erc721', 'unknown']

// get text records 
console.log(await ens_text_record(provider, avatar, ['email', 'com.twitter']));
// returns {..., text: {email: "a@b.com", ...}}

// get addr records (you can use coin names)
console.log(await ens_addr_record(provider, avatar, ['BTC', 'XLM']));
// returns {..., addr: {"BTC: Uint8Array(), ... }}

import {ens_contenthash_record, ens_pubkey_record} from '@adraffy/eth-tools';

// get content hash
console.log(await ens_contenthash_record(provider, avatar));
// returns {..., contenthash: Uint8Array(), contenthash_url: 'ipfs://...'}

// get pubkey
console.log(await ens_pubkey_record(provider, avatar));
// returns {..., pubkey: {x: Uint8Array(32), y: Uint8Array(32)}}
```

### utils.js
```Javascript
import {checksum_address, namehash} from '@adraffy/eth-tools';

console.log(checksum_address('b8c2c29ee19d8307cb7255e1cd9cbde883a267d5')); 
// returns "0xb8c2C29ee19D8307cb7255e1Cd9CbDE883A267d5"
```

### FetchProvider
```Javascript
import {FetchProvider} from '@adraffy/eth-tools';

// browser:
new FetchProvider('https://cloudflare-eth.com'); 

// nodejs:
import fetch from 'node-fetch';
new FetchProvider('https://cloudflare-eth.com', fetch);