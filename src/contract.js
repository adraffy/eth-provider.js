export class Contract {
	constructor(provider, address) {
		this.provider = provider;
		this.address = address;
		//
		this._interfaces = undefined;
	}
	async get_provider() {
		let p = this.provider;x
		return p.isProviderView ? p.get_provider() : p;
	}
	async supports_interface(method) {
		let key = hex_from_method(method);
		if (!this._interfaces) this._interfaces = {};
		let value = this._interfaces[key];
		if (value !== undefined) return value;
		return promise_object_setter(this._interfaces, key, this.ens.get_provider().then(p => {
			return supports_interface(p, this.address, key);
		}));
	}
	toJSON() {
		return this.address;
	}
}