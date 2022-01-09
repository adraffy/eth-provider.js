import {retry_request} from './retry.js';
import {BaseProvider} from './BaseProvider.js';
export class FetchProvider extends BaseProvider {
	constructor({url, fetch: fetch_api, source, request_timeout = 30000, idle_timeout = 60000}) {
		if (typeof url !== 'string') throw new TypeError('expected url');
		if (!fetch_api) {
			let fetch = globalThis.fetch;
			if (!fetch) throw new TypeError(`unable to find fetch()`);
			fetch_api = fetch.bind(globalThis);
		}
		super();
		this.url = url;	
		this._fetch_api = fetch_api;
		this._id = 0;
		this._chain_id = undefined;
		this._request_timeout = request_timeout|0;
		this._idle_timeout = idle_timeout|0;
		this._idle_timer = undefined;
		this._source = source;
	}
	get source() { return this._source ?? this.url; }
	async request(obj) {
		if (typeof obj !== 'object') throw new TypeError('expected object');
		let request_fn = this._request_once.bind(this);
		if (!this._idle_timer) {			
			try {
				this._chain_id = await retry_request(request_fn, {method: 'eth_chainId'});
			} catch (err) {
				this.emit('connect-error', err);
				throw err;
			}
			this.emit('connect', {chainId: this._chain_id});
			this._restart_idle();
		}
		switch (obj.method) {
			case 'eth_chainId': return this._chain_id; // fast
			case 'eth_subscribe': 
			case 'eth_unsubscribe': throw new Error(`${obj.method} not supported by FetchProvider`);
		}
		try {
			let ret = await retry_request(request_fn, obj);
			this._restart_idle();
			return ret;
		} catch (err) {
			this._terminate(err);
			throw err;
		}
	}
	_restart_idle() {
		clearTimeout(this._idle_timer);			
		this._idle_timer = this._idle_timeout > 0 ? setTimeout(() => {
			this._terminate(new Error('Idle timeout'));
		}, this._idle_timeout) : true;		
	}
	disconnect() {
		if (!this._idle_timer) return;
		this._terminate(new Error('Forced disconnect'));
	}
	_terminate(err) {
		this.emit('disconnect', err);
		clearTimeout(this._idle_timer);
		this._idle_timer = undefined;
		this._chain_id = undefined;
	}
	_fetch(obj, ...a) {
		return this._fetch_api(this.url, {
			method: 'POST',
			body: JSON.stringify({...obj, jsonrpc: '2.0', id: ++this._id}),
			cache: 'no-store',
			...a
		});
	}
	async _request_once(obj) {
		let res;
		if (this._request_timeout > 0) {
			let aborter = new AbortController();
			let timer = setTimeout(() => aborter.abort(), this._request_timeout);
			try {
				res = await this._fetch(obj, {signal: aborter.signal});
			} finally {
				clearTimeout(timer);
			}
		} else {
			res = await this._fetch(obj);
		}
		if (res.status !== 200) {
			throw new Error(`Fetch failed: ${res.status}`);
		}
		let json;
		try {
			json = await res.json();
		} catch (cause) {
			throw new Error('Invalid provider response: expected json', {cause});
		}
		let {error} = json;
		if (!error) return json.result;
		let err = new Error(error.message ?? 'unknown error');
		err.code = error.code;
		throw err;
	}
}