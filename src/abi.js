import {keccak, bytes_from_hex, hex_from_bytes, bytes_from_utf8, utf8_from_bytes} from '@adraffy/keccak';
import {compare_arrays} from './utils.js';
import {standardize_address} from './address.js';

export class Uint256 {	
	static wrap(x) { // tries to avoid a copy
		if (x instanceof Uint256) {
			return x;
		} else if (x instanceof Uint8Array) {
			return new this(left_truncate_bytes(x, 32, false));
		} else if (Number.isSafeInteger(x)) {
			return this.from_number(x);
		} else if (typeof x === 'string') {
			return this.from_str(x);	
		} else {
			throw new TypeError(`not Uint256-like: ${x}`);
		}
	}
	static zero() {
		return new this(new Uint8Array(32));
	}
	/*
	static from_ether(x) {
		return this.zero().set_float(x * 10**18, x);
	}
	*/
	/*
	static from_keccak(x) {
		return new this(keccak().update(x).bytes);
	}
	*/
	static from_number(i) {
		return this.zero().set_number(i);
	}
	static from_bytes(v) { // this copies
		return new this(left_truncate_bytes(v, 32));
	}	
	static from_str(s) { // this works like parseInt
		return s.startsWith('0x') ? this.from_hex(s) : this.from_dec(s);
	}
	static from_hex(s) {
		return this.from_bytes(bytes_from_hex(s));
	}
	static from_dec(s) {
		if (!/^[0-9]+$/.test(s)) throw new TypeError(`expected decimal digits: ${s}`);
		let n = s.length;
		if (n < 10) this.from_number(parseInt(s, 10));
		let v = new Uint8Array(Math.max(32, n));
		let w = 0;
		for (let i = 0; i < n; i++) {
			let carry = s.charCodeAt(i) - 0x30;
			for (let i = 0; i < w; i++) {
				carry += v[i] * 10;
				v[i] = carry;
				carry >>= 8;
			}
			while (carry > 0) {
				v[w++] = carry;
				carry >>= 8;
			}
		}
		for (let a = Math.min(w, 15); a >= 0; a--) {
			let b = 31 - a;
			let temp = v[a];
			v[a] = v[b];
			v[b] = temp;
		}
		return new this(v.slice(0, 32));
	}
	// this should not be used directly
	// warning: this does not copy!
	constructor(v) {
		if (!(v instanceof Uint8Array)) throw new TypeError('expected bytes');
		if (v.length != 32) throw new TypeError('expected 32 bytes');
		this.bytes = v;
	}
	clone() {
		return new this.constructor(this.bytes.slice());
	}
	compare(x) {
		return compare_arrays(this.bytes, this.constructor.wrap(x).bytes); // throws
	}
	set_number(i) {	 
		set_bytes_to_number(this.bytes, i); // throws
		return this; // chainable
	}
	add(x) {
		let other = this.constructor.wrap(x).bytes; // throws
		let {bytes} = this;
		let carry = 0;
		for (let i = 31; i >= 0; i--) {
			let sum = bytes[i] + other[i] + carry;
			bytes[i] = sum;
			carry = sum >> 8;
		}
		return this; // chainable
	}
	apply_bytewise_binary_op(fn, x) {
		let other = this.constructor.wrap(x).bytes; // throws
		this.bytes.forEach((x, i, v) => v[i] = fn(x, other[i]));
		return this; // chainable
	}
	bytewise_fill(x) {
		this.bytes.fill(x);
		return this; // chainable
	}
	or(x)  { return this.apply_bytewise_binary_op((a, b) => a | b, x); } // chainable
	and(x) { return this.apply_bytewise_binary_op((a, b) => a & b, x); } // chainable
	xor(x) { return this.apply_bytewise_binary_op((a, b) => a ^ b, x); } // chainable
	not() {
		this.bytes.forEach((x, i, v) => v[i] = ~x);
		return this;
	}
	set_bit(i, truthy = true) {
		let [index, mask] = index_mask_from_bit(i);
		if (truthy) {
			this.bytes[index] |= mask;
		} else {
			this.bytes[index] &= ~mask;
		}
		return this; // chainable
	}
	flip_bit(i) {
		let [index, mask] = index_mask_from_bit(i);
		this.bytes[index] ^= mask;
		return this; // chainable
	}
	test_bit(i) {
		let [index, mask] = index_mask_from_bit(i);
		return (this.bytes[index] & mask) > 0;
	}
	get number() {
		let {bytes} = this;
		if (bytes[0] == 255) { // safe because 256 - 8 > 53
			return -(1 + unsigned_from_bytes(bytes.map(x => ~x)));
		} else {
			return unsigned_from_bytes(bytes);
		}
	}
	get is_zero() { return this.bytes.every(x => x == 0); }
	get gwei() { return this.as_float(-9); }
	get ether() { return this.as_float(-18); }
	get unsigned() { return unsigned_from_bytes(this.bytes); }
	get hex() { return '0x' + hex_from_bytes(this.bytes); }
	get min_hex() { return '0x' + this.digit_str(16) } 
	get bin() { return '0b' + this.digit_str(2); }
	get dec() { return this.digit_str(10); }
	digit_str(base, lookup = '0123456789abcdefghjiklmnopqrstuvwxyz') {
		if (base > lookup.length) throw new RangeError(`radix larger than lookup: ${x}`);
		return this.digits(base).map(x => lookup[x]).join('');
	}
	digits(base) {
		if (base < 2) throw new RangeError(`base must be 2 or more: ${base}`);
		let digits = [0];
		for (let x of this.bytes) {
			for (let i = 0; i < digits.length; ++i) {
				let xx = (digits[i] << 8) | x
				digits[i] = xx % base;
				x = (xx / base) | 0;
			}
			while (x > 0) {
				digits.push(x % base);
				x = (x / base) | 0;
			}
		}
		return digits.reverse();
	}
	set_digits(base, v) {
		let u = [];
		for (let carry of v) {
			if (carry < 0 || carry >= base) throw new RangeError(`expected base ${base} digit: ${carry}`);
			for (let i = 0; i < u.length; i++) {
				carry += u[i] * base;
				u[i] = carry;
				carry >>= 8;
			}
			while (carry > 0) {
				u.push(carry);
				carry >>= 8;
			}
		}
		let extra = u.length - 32;
		if (extra > 0) {
			this.bytes.set(v.slice(extra)); // truncated
		} else {
			this.bytes.fill(0, -extra);
			this.bytes.set(v, 32 + extra);
		}
		return this;
	}
	set_float(x) {
		let buf = new ArrayBuffer(8);
		let view = new DataView(buf);
		view.setFloat64(0, x, false);

		console.log(buf);
	}
	as_float(exp, base = 10) {
		let v = this.digits(base);
		let acc = 0;
		for (let i = 0, e = v.length - 1; i <= e; i++) {
			acc += v[e - i] * base**(i + exp);
		}
		return acc;
	}
	toJSON() {
		return this.min_hex;
	}
	toString() {
		return `Uint256(${this.min_hex})`;
	}
}

function index_mask_from_bit(i) { 
	let index = i < 0 ? ~i : 255 - i;
	if (index < 0 || index >= 256) throw new TypeError(`invalid bit index: ${i}`);
	return [index >> 3, 0x80 >> (index & 7)];
}

// (Uint8Array) -> Number
export function unsigned_from_bytes(v) {
	if (v.length > 7) {  // 53 bits => 7 bytes, so everything else must be 0
		let n = v.length - 7;
		for (let i = 0; i < n; i++) if (v[i] > 0) throw new RangeError('overflow');
		v = v.subarray(n);
	}
	let n = 0;
	for (let i of v) n = (n * 256) + i; // cannot use shifts since 32-bit
	if (!Number.isSafeInteger(n)) throw new RangeError('overflow');
	return n;
}

// (Uint8Array, number)
// cannot use bitwise due to 32-bit truncation
export function set_bytes_to_number(v, i) {
	if (!Number.isSafeInteger(i)) throw new RangeError(`expected integer: ${i}`);	
	if (i < 0) {
		i = -(i+1);
		for (let pos = v.length - 1; pos >= 0; pos--) {
			v[pos] = ~(i & 0xFF);
			i = Math.floor(i / 256); 
		}
	} else {
		for (let pos = v.length - 1; pos >= 0; pos--) {
			v[pos] = (i & 0xFF);
			i = Math.floor(i / 256); 
		}
	}
}

// return exactly n-bytes
// this always returns a copy
export function left_truncate_bytes(v, n, copy_when_same = true) {
	let {length} = v;
	if (length == n) return copy_when_same ? v.slice() : v;
	if (length > n) return v.slice(n - length); // truncate
	let copy = new Uint8Array(n);
	copy.set(v, n - length); // zero pad
	return copy;
}

const METHOD_CACHE = {};

export function hex_from_method(x) {
	return /^0x[0-9a-fA-F]{8}$/.test(x) ? x : hex_from_bytes(bytes4_from_method(x));
}
export function bytes4_from_method(x) {
	if (typeof x === 'string' && x.includes('(')) {
		let v = METHOD_CACHE[x];
		if (!v) {
			METHOD_CACHE[x] = v = keccak().update(x).bytes.subarray(0, 4);
		}
		return v.slice();
	}
	try {
		let v = x instanceof Uint8Array ? x : bytes_from_hex(x);
		if (v.length != 4) throw new Error('expected 4 bytes');
		return v;
	} catch (err) {
		throw new Error(`method ${x} should be a signature or 8-char hex`);
	}
}

export class ABIDecoder {
	static from_hex(x) { return new this(bytes_from_hex(x)); }
	constructor(buf, pos = 0) {
		this.buf = buf;
		this.pos = pos;
	}
	get remaining() { return this.buf.length - this.pos; }
	read_bytes(n) {  // THIS DOES NOT COPY
		let {pos, buf} = this;
		let end = pos + n;
		if (end > buf.length) throw new RangeError('buffer overflow');
		let v = buf.subarray(pos, end);
		this.pos = end;
		return v;
	}
	read_memory() { // THIS DOES NOT COPY
		let pos = this.number();
		let end = pos + 32;
		let {buf} = this;
		if (end > buf.length) throw new RangeError('buffer overflow');
		let len = unsigned_from_bytes(buf.subarray(pos, end));
		pos = end;
		end += len;
		if (end > buf.length) throw new RangeError('buffer overflow');
		return buf.subarray(pos, end);
	}
	peek_byte(offset = 0) {		
		let {pos, buf} = this;
		pos += offset;
		if (!(pos >= 0 && pos < buf.length)) throw new RangeError(`invalid offset: ${offset}`);
		return buf[pos];
	}
	read_byte() {
		let {pos, buf} = this;
		if (pos >= buf.length) throw new RangeError('buffer overflow');
		this.pos = pos + 1;
		return buf[pos];
	}
	read_addr_bytes() {
		if (this.read_bytes(12).some(x => x > 0)) throw new TypeError('invalid address: expected zero');
		return this.read_bytes(20);
	}
	// these all effectively copy 
	bytes(n) { return this.read_bytes(n).slice(); }
	boolean() { return !this.uint256().is_zero; }	
	number(n = 32) { return this.uint256(n).unsigned; }
	uint256(n = 32) { return Uint256.from_bytes(this.bytes(n)); } 
	string() { return utf8_from_bytes(this.read_memory()); }	
	memory() { return this.read_memory().slice(); }
	addr(checksum = true) {
		let addr = hex_from_bytes(this.read_addr_bytes());
		return checksum ? standardize_address(addr) : `0x${addr}`; 
	}
	array(callback) {
		let dec = new ABIDecoder(this.buf, this.number());
		let len = dec.number();
		let ret = [];
		for (let i = 0; i < len; i++) {
			ret.push(callback(dec, i));
		}
		return ret;
	}
}

export class ABIEncoder {
	static method(method) {		
		// method signature doesn't contribute to offset
		return new ABIEncoder(4).add_bytes(bytes4_from_method(method)); 
	}
	constructor(offset = 0, capacity = 256) { //, packed = false) {
		if (!Number.isSafeInteger(capacity) || capacity < 1) throw new TypeError('expected positive initial capacity');
		this.buf = new Uint8Array(capacity);
		this.pos = 0;
		this.offset = offset;
		this.tails = [];
	}
	reset() {
		this.buf.fill(0);
		this.tails.length = 0;
		this.pos = 0;
		return this; // chainable
	}
	dump() {
		let s = this.build_hex();
		console.log('Method:', s.slice(0, 10));
		s = s.slice(10);
		while (s.length > 0) {
			console.log(s.slice(0, 64));
			s = s.slice(64);
		}
	}
	build_hex() { return '0x' + hex_from_bytes(this.build()); }
	build() {
		let {pos, tails, offset} = this;
		let len = tails.reduce((a, [_, v]) => a + v.length, 0);
		if (len > 0) {
			this.alloc(len);
			let {buf} = this;
			for (let [off, v] of tails) {
				set_bytes_to_number(buf.subarray(off, off + 32), pos - offset); // global offset
				buf.set(v, pos);
				pos += v.length;
			}
		}
		return this.buf.subarray(0, pos);
	}
	// return an UInt8Array view-slice into the buffer
	alloc(n) {
		if (!Number.isSafeInteger(n) || n < 1) throw new TypeError('expected positive size');
		let {buf, pos} = this;
		let end = pos + n;
		if (end > buf.length) {
			let bigger = new Uint8Array(Math.max(buf.length + n, buf.length << 1));
			bigger.set(buf);
			this.buf = buf = bigger;
		}
		this.pos = end;
		return buf.subarray(pos, end);
	}
	bytes_hex(s) { return this.bytes(bytes_from_hex(s)); }
	bytes(v) { 
		this.alloc((v.length + 31) & ~31).set(v);		
		return this; // chainable
	}
	number(i) {
		this.alloc(32).set(Uint256.wrap(i).bytes);
		return this; // chainable
		/*
		if (i instanceof Uint256) {
			let buf = this.alloc(n);
			if (n < 32) {
				buf.set(i.bytes.subarray(32 - n));
			} else {
				buf.set(i.bytes, n - 32);
			}
		} else {
			set_bytes_to_number(this.alloc(n), i);
		}
		return this; // chainable
		*/
	}
	method(x) { return this.bytes(bytes4_from_method(x)); } // chainable
	string(s) { return this.memory(bytes_from_utf8(s)); } // chainable
	memory(v) {
		let {pos} = this; // remember offset
		this.alloc(32); // reserve spot
		let tail = new Uint8Array((v.length + 63) & ~31); // len + bytes + 0* [padded]
		set_bytes_to_number(tail.subarray(0, 32), v.length);
		tail.set(v, 32);
		this.tails.push([pos, tail]);
		return this; // chainable
	}
	array(v, callback) {
		let enc = new this.constructor();
		enc.number(v.length);
		for (let x of v) callback(enc, x);
		this.tails.push([this.pos, enc.build()]);
		this.alloc(32);
		return this;
	}
	addr(x) {
		if (Array.isArray(x)) {
			return this.array(x, (enc, s) => enc._addr(s));
		}
		this._addr(x);
		return this; // chainable
	}
	_addr(s) {
		let v = bytes_from_hex(s); // throws
		if (v.length != 20) throw new TypeError('expected address');
		this.alloc(32).set(v, 12);
	}
	// these are dangerous
	add_hex(s) { return this.add_bytes(bytes_from_hex(s)); } // throws
	add_bytes(v) {
		if (!(v instanceof Uint8Array)) {
			if (v instanceof ArrayBuffer) { 
				v = new Uint8Array(v);
			} else if (Array.isArray(v)) { 
				v = Uint8Array.from(v);
			} else {
				throw new TypeError('expected bytes');
			}
		}
		this.alloc(v.length).set(v);
		return this; // chainable
	}
}