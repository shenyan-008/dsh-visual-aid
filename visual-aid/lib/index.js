import { Service } from "@deepseek-ai/cordis";
import { AttachmentError, AttachmentId } from "@deepseek-ai/dsh-attachment";
import { BlockAssembler, createAssistantMessage, createUserMessage, deepFreeze } from "@deepseek-ai/dsh-llm";
import { SessionId } from "@deepseek-ai/dsh-session";
import { installSettingsSection, settingsNamespace } from "@deepseek-ai/dsh-settings";
import { defineTool } from "@deepseek-ai/dsh-tools";
import { deadline } from "@deepseek-ai/dsh-timeout";
import { basename, extname, join } from "node:path";
import { homedir, tmpdir } from "node:os";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
//#region ../../../vendor/cosmokit/src/misc.ts
/** Return true when a value is `null` or `undefined`. */
function isNullable(value) {
	return value === null || value === void 0;
}
/** Return true for non-array object values. */
function isPlainObject(data) {
	return data && typeof data === "object" && !Array.isArray(data);
}
/** Filter object entries and return a new object. */
function filterKeys(object, filter) {
	return Object.fromEntries(Object.entries(object).filter(([key, value]) => filter(key, value)));
}
/** Map object values while preserving the original key set. */
function mapValues(object, transform) {
	return Object.fromEntries(Object.entries(object).map(([key, value]) => [key, transform(value, key)]));
}
/** Pick selected keys from an object, optionally including `undefined` values. */
function pick(source, keys, forced) {
	if (!keys) return { ...source };
	const result = {};
	for (const key of keys) if (forced || source[key] !== void 0) result[key] = source[key];
	return result;
}
//#endregion
//#region ../../../vendor/cosmokit/src/types.ts
/** Test values using `instanceof` with a `toStringTag` fallback. */
function is(type, value) {
	if (arguments.length === 1) return (value) => is(type, value);
	return type in globalThis && value instanceof globalThis[type] || Object.prototype.toString.call(value).slice(8, -1) === type;
}
function isArrayBufferLike(value) {
	return is("ArrayBuffer", value) || is("SharedArrayBuffer", value);
}
function isArrayBufferSource(value) {
	return isArrayBufferLike(value) || ArrayBuffer.isView(value);
}
let Binary;
(function(_Binary) {
	_Binary.is = isArrayBufferLike;
	_Binary.isSource = isArrayBufferSource;
	function fromSource(source) {
		if (ArrayBuffer.isView(source)) return source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength);
		else return source;
	}
	_Binary.fromSource = fromSource;
	function toBase64(source) {
		source = fromSource(source);
		if (typeof Buffer !== "undefined") return Buffer.from(source).toString("base64");
		let binary = "";
		const bytes = new Uint8Array(source);
		for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
		return btoa(binary);
	}
	_Binary.toBase64 = toBase64;
	function fromBase64(source) {
		if (typeof Buffer !== "undefined") return fromSource(Buffer.from(source, "base64"));
		return Uint8Array.from(atob(source), (c) => c.charCodeAt(0));
	}
	_Binary.fromBase64 = fromBase64;
	function toHex(source) {
		source = fromSource(source);
		if (typeof Buffer !== "undefined") return Buffer.from(source).toString("hex");
		return Array.from(new Uint8Array(source), (byte) => byte.toString(16).padStart(2, "0")).join("");
	}
	_Binary.toHex = toHex;
	function fromHex(source) {
		if (typeof Buffer !== "undefined") return fromSource(Buffer.from(source, "hex"));
		const hex = source.length % 2 === 0 ? source : source.slice(0, source.length - 1);
		const buffer = [];
		for (let i = 0; i < hex.length; i += 2) buffer.push(parseInt(`${hex[i]}${hex[i + 1]}`, 16));
		return Uint8Array.from(buffer).buffer;
	}
	_Binary.fromHex = fromHex;
})(Binary || (Binary = {}));
Binary.fromBase64;
Binary.toBase64;
Binary.fromHex;
Binary.toHex;
/** Deep-clone common JavaScript values while preserving prototypes and cycles. */
function clone(source, refs = /* @__PURE__ */ new Map()) {
	if (!source || typeof source !== "object") return source;
	if (is("Date", source)) return new Date(source.valueOf());
	if (is("RegExp", source)) return new RegExp(source.source, source.flags);
	if (isArrayBufferLike(source)) return source.slice(0);
	if (ArrayBuffer.isView(source)) return source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength);
	const cached = refs.get(source);
	if (cached) return cached;
	if (Array.isArray(source)) {
		const result = [];
		refs.set(source, result);
		source.forEach((value, index) => {
			result[index] = Reflect.apply(clone, null, [value, refs]);
		});
		return result;
	}
	const result = Object.create(Object.getPrototypeOf(source));
	refs.set(source, result);
	for (const key of Reflect.ownKeys(source)) {
		const descriptor = { ...Reflect.getOwnPropertyDescriptor(source, key) };
		if ("value" in descriptor) descriptor.value = Reflect.apply(clone, null, [descriptor.value, refs]);
		Reflect.defineProperty(result, key, descriptor);
	}
	return result;
}
/** Deeply compare arrays, dates, regexps, buffers, and plain object fields. */
function deepEqual(a, b, strict) {
	if (a === b) return true;
	if (!strict && isNullable(a) && isNullable(b)) return true;
	if (typeof a !== typeof b) return false;
	if (typeof a !== "object") return false;
	if (!a || !b) return false;
	function check(test, then) {
		return test(a) ? test(b) ? then(a, b) : false : test(b) ? false : void 0;
	}
	return check(Array.isArray, (a, b) => a.length === b.length && a.every((item, index) => deepEqual(item, b[index]))) ?? check(is("Date"), (a, b) => a.valueOf() === b.valueOf()) ?? check(is("RegExp"), (a, b) => a.source === b.source && a.flags === b.flags) ?? check(isArrayBufferLike, (a, b) => {
		if (a.byteLength !== b.byteLength) return false;
		const viewA = new Uint8Array(a);
		const viewB = new Uint8Array(b);
		for (let i = 0; i < viewA.length; i++) if (viewA[i] !== viewB[i]) return false;
		return true;
	}) ?? Object.keys({
		...a,
		...b
	}).every((key) => deepEqual(a[key], b[key], strict));
}
//#endregion
//#region ../../../vendor/cosmokit/src/time.ts
let Time;
(function(_Time) {
	_Time.millisecond = 1;
	const second = _Time.second = 1e3;
	const minute = _Time.minute = second * 60;
	const hour = _Time.hour = minute * 60;
	const day = _Time.day = hour * 24;
	const week = _Time.week = day * 7;
	let timezoneOffset = (/* @__PURE__ */ new Date()).getTimezoneOffset();
	function setTimezoneOffset(offset) {
		timezoneOffset = offset;
	}
	_Time.setTimezoneOffset = setTimezoneOffset;
	function getTimezoneOffset() {
		return timezoneOffset;
	}
	_Time.getTimezoneOffset = getTimezoneOffset;
	function getDateNumber(date = /* @__PURE__ */ new Date(), offset) {
		if (typeof date === "number") date = new Date(date);
		if (offset === void 0) offset = timezoneOffset;
		return Math.floor((date.valueOf() / minute - offset) / 1440);
	}
	_Time.getDateNumber = getDateNumber;
	function fromDateNumber(value, offset) {
		const date = new Date(value * day);
		if (offset === void 0) offset = timezoneOffset;
		return new Date(+date + offset * minute);
	}
	_Time.fromDateNumber = fromDateNumber;
	const numeric = /\d+(?:\.\d+)?/.source;
	const timeRegExp = new RegExp(`^${[
		"w(?:eek(?:s)?)?",
		"d(?:ay(?:s)?)?",
		"h(?:our(?:s)?)?",
		"m(?:in(?:ute)?(?:s)?)?",
		"s(?:ec(?:ond)?(?:s)?)?"
	].map((unit) => `(${numeric}${unit})?`).join("")}$`);
	function parseTime(source) {
		const capture = timeRegExp.exec(source);
		if (!capture) return 0;
		return (parseFloat(capture[1]) * week || 0) + (parseFloat(capture[2]) * day || 0) + (parseFloat(capture[3]) * hour || 0) + (parseFloat(capture[4]) * minute || 0) + (parseFloat(capture[5]) * second || 0);
	}
	_Time.parseTime = parseTime;
	function parseDate(date) {
		const parsed = parseTime(date);
		if (parsed) date = Date.now() + parsed;
		else if (/^\d{1,2}(:\d{1,2}){1,2}$/.test(date)) date = `${(/* @__PURE__ */ new Date()).toLocaleDateString()}-${date}`;
		else if (/^\d{1,2}-\d{1,2}-\d{1,2}(:\d{1,2}){1,2}$/.test(date)) date = `${(/* @__PURE__ */ new Date()).getFullYear()}-${date}`;
		return date ? new Date(date) : /* @__PURE__ */ new Date();
	}
	_Time.parseDate = parseDate;
	function format(ms) {
		const abs = Math.abs(ms);
		if (abs >= day - hour / 2) return Math.round(ms / day) + "d";
		else if (abs >= hour - minute / 2) return Math.round(ms / hour) + "h";
		else if (abs >= minute - second / 2) return Math.round(ms / minute) + "m";
		else if (abs >= second) return Math.round(ms / second) + "s";
		return ms + "ms";
	}
	_Time.format = format;
	function toDigits(source, length = 2) {
		return source.toString().padStart(length, "0");
	}
	_Time.toDigits = toDigits;
	function template(template, time = /* @__PURE__ */ new Date()) {
		return template.replace("yyyy", time.getFullYear().toString()).replace("yy", time.getFullYear().toString().slice(2)).replace("MM", toDigits(time.getMonth() + 1)).replace("dd", toDigits(time.getDate())).replace("hh", toDigits(time.getHours())).replace("mm", toDigits(time.getMinutes())).replace("ss", toDigits(time.getSeconds())).replace("SSS", toDigits(time.getMilliseconds(), 3));
	}
	_Time.template = template;
})(Time || (Time = {}));
//#endregion
//#region ../../../vendor/schemastery/src/index.ts
const kSchema = Symbol.for("schemastery");
const kValidationError = Symbol.for("ValidationError");
globalThis.__schemastery_index__ ??= 0;
globalThis.__schemastery_refs__ = void 0;
var ValidationError = class extends TypeError {
	options;
	name = "ValidationError";
	constructor(message, options) {
		let prefix = "$";
		for (const segment of options.path || []) if (typeof segment === "string") prefix += "." + segment;
		else if (typeof segment === "number") prefix += "[" + segment + "]";
		else if (typeof segment === "symbol") prefix += `[Symbol(${segment.toString()})]`;
		if (prefix.startsWith(".")) prefix = prefix.slice(1);
		super((prefix === "$" ? "" : `${prefix} `) + message);
		this.options = options;
	}
	static is(error) {
		return !!error?.[kValidationError];
	}
};
Object.defineProperty(ValidationError.prototype, kValidationError, { value: true });
const Schema = function(options) {
	const schema = function(data, options = {}) {
		return Schema.resolve(data, schema, options)[0];
	};
	if (options.refs) {
		const refs = mapValues(options.refs, (options) => new Schema(options));
		const getRef = (uid) => refs[uid];
		for (const key in refs) {
			const options = refs[key];
			options.sKey = getRef(options.sKey);
			options.inner = getRef(options.inner);
			options.list = options.list && options.list.map(getRef);
			options.dict = options.dict && mapValues(options.dict, getRef);
		}
		return refs[options.uid];
	}
	Object.assign(schema, options);
	if (typeof schema.callback === "string") try {
		schema.callback = new Function("return " + schema.callback)();
	} catch {}
	Object.defineProperty(schema, "uid", { value: globalThis.__schemastery_index__++ });
	Object.setPrototypeOf(schema, Schema.prototype);
	schema.meta ||= {};
	schema.toString = schema.toString.bind(schema);
	return schema;
};
Schema.prototype = Object.create(Function.prototype);
Schema.prototype[kSchema] = true;
Object.defineProperty(Schema.prototype, "~standard", { get() {
	return {
		version: 1,
		vendor: "schemastery",
		validate: (value) => {
			try {
				return { value: Schema.resolve(value, this, {})[0] };
			} catch (error) {
				if (ValidationError.is(error)) return { issues: [{
					message: error.message,
					path: error.options.path
				}] };
				throw error;
			}
		}
	};
} });
Schema.ValidationError = ValidationError;
Schema.prototype.toJSON = function toJSON() {
	if (globalThis.__schemastery_refs__) {
		globalThis.__schemastery_refs__[this.uid] ??= JSON.parse(JSON.stringify({ ...this }));
		return this.uid;
	}
	globalThis.__schemastery_refs__ = { [this.uid]: { ...this } };
	globalThis.__schemastery_refs__[this.uid] = JSON.parse(JSON.stringify({ ...this }));
	const result = {
		uid: this.uid,
		refs: globalThis.__schemastery_refs__
	};
	globalThis.__schemastery_refs__ = void 0;
	return result;
};
Schema.prototype.set = function set(key, value) {
	this.dict[key] = value;
	return this;
};
Schema.prototype.push = function push(value) {
	this.list.push(value);
	return this;
};
function mergeDesc(original, messages) {
	const result = typeof original === "string" ? { "": original } : { ...original };
	for (const locale in messages) {
		const value = messages[locale];
		if (value?.$description || value?.$desc) result[locale] = value.$description || value.$desc;
		else if (typeof value === "string") result[locale] = value;
	}
	return result;
}
function getInner(value) {
	return value?.$value ?? value?.$inner;
}
function extractKeys(data) {
	return filterKeys(data ?? {}, (key) => !key.startsWith("$"));
}
Schema.prototype.i18n = function i18n(messages) {
	const schema = Schema(this);
	const desc = mergeDesc(schema.meta.description, messages);
	if (Object.keys(desc).length) schema.meta.description = desc;
	if (schema.dict) schema.dict = mapValues(schema.dict, (inner, key) => {
		return inner.i18n(mapValues(messages, (data) => getInner(data)?.[key] ?? data?.[key]));
	});
	if (schema.list) schema.list = schema.list.map((inner, index) => {
		return inner.i18n(mapValues(messages, (data = {}) => {
			if (Array.isArray(getInner(data))) return getInner(data)[index];
			if (Array.isArray(data)) return data[index];
			return extractKeys(data);
		}));
	});
	if (schema.inner) schema.inner = schema.inner.i18n(mapValues(messages, (data) => {
		if (getInner(data)) return getInner(data);
		return extractKeys(data);
	}));
	if (schema.sKey) schema.sKey = schema.sKey.i18n(mapValues(messages, (data) => data?.$key));
	return schema;
};
Schema.prototype.extra = function extra(key, value) {
	const schema = Schema(this);
	schema.meta = {
		...schema.meta,
		[key]: value
	};
	return schema;
};
for (const key of [
	"required",
	"disabled",
	"collapse",
	"hidden",
	"loose"
]) Object.assign(Schema.prototype, { [key](value = true) {
	const schema = Schema(this);
	schema.meta = {
		...schema.meta,
		[key]: value
	};
	return schema;
} });
Schema.prototype.deprecated = function deprecated() {
	const schema = Schema(this);
	schema.meta.badges ||= [];
	schema.meta.badges.push({
		text: "deprecated",
		type: "danger"
	});
	return schema;
};
Schema.prototype.experimental = function experimental() {
	const schema = Schema(this);
	schema.meta.badges ||= [];
	schema.meta.badges.push({
		text: "experimental",
		type: "warning"
	});
	return schema;
};
Schema.prototype.pattern = function pattern(regexp) {
	const schema = Schema(this);
	const pattern = pick(regexp, ["source", "flags"]);
	schema.meta = {
		...schema.meta,
		pattern
	};
	return schema;
};
Schema.prototype.simplify = function simplify(value) {
	if (deepEqual(value, this.meta.default, this.type === "dict")) return null;
	if (isNullable(value)) return value;
	if (this.type === "object" || this.type === "dict") {
		const result = {};
		for (const key in value) {
			const item = (this.type === "object" ? this.dict[key] : this.inner)?.simplify(value[key]);
			if (this.type === "dict" || !isNullable(item)) result[key] = item;
		}
		if (deepEqual(result, this.meta.default, this.type === "dict")) return null;
		return result;
	} else if (this.type === "array" || this.type === "tuple") {
		const result = [];
		value.forEach((value, index) => {
			const schema = this.type === "array" ? this.inner : this.list[index];
			const item = schema ? schema.simplify(value) : value;
			result.push(item);
		});
		return result;
	} else if (this.type === "intersect") {
		const result = {};
		for (const item of this.list) Object.assign(result, item.simplify(value));
		return result;
	} else if (this.type === "union") for (const schema of this.list) try {
		Schema.resolve(value, schema, {});
		return schema.simplify(value);
	} catch {}
	return value;
};
Schema.prototype.toString = function toString(inline) {
	return formatters[this.type]?.(this, inline) ?? `Schema<${this.type}>`;
};
Schema.prototype.role = function role(role, extra) {
	const schema = Schema(this);
	schema.meta = {
		...schema.meta,
		role,
		extra
	};
	return schema;
};
for (const key of [
	"default",
	"link",
	"comment",
	"description",
	"max",
	"min",
	"step"
]) Object.assign(Schema.prototype, { [key](value) {
	const schema = Schema(this);
	schema.meta = {
		...schema.meta,
		[key]: value
	};
	return schema;
} });
const resolvers = {};
Schema.extend = function extend(type, resolve) {
	resolvers[type] = resolve;
};
Schema.resolve = function resolve(data, schema, options = {}, strict = false) {
	if (!schema) return [data];
	if (options.ignore?.(data, schema)) return [data];
	if (isNullable(data) && schema.type !== "lazy") {
		if (schema.meta.required) throw new ValidationError(`missing required value`, options);
		let current = schema;
		let fallback = schema.meta.default;
		while (current?.type === "intersect" && isNullable(fallback)) {
			current = current.list[0];
			fallback = current?.meta.default;
		}
		if (isNullable(fallback)) return [data];
		data = clone(fallback);
	}
	const callback = resolvers[schema.type];
	if (!callback) throw new ValidationError(`unsupported type "${schema.type}"`, options);
	try {
		return callback(data, schema, options, strict);
	} catch (error) {
		if (!schema.meta.loose) throw error;
		return [schema.meta.default];
	}
};
Schema.from = function from(source) {
	if (isNullable(source)) return Schema.any();
	else if ([
		"string",
		"number",
		"boolean"
	].includes(typeof source)) return Schema.const(source).required();
	else if (source[kSchema]) return source;
	else if (typeof source === "function") switch (source) {
		case String: return Schema.string().required();
		case Number: return Schema.number().required();
		case Boolean: return Schema.boolean().required();
		case Function: return Schema.function().required();
		default: return Schema.is(source).required();
	}
	else throw new TypeError(`cannot infer schema from ${source}`);
};
Schema.lazy = function lazy(builder) {
	const toJSON = () => {
		if (!schema.inner[kSchema]) {
			schema.inner = schema.builder();
			schema.inner.meta = {
				...schema.meta,
				...schema.inner.meta
			};
		}
		return schema.inner.toJSON();
	};
	const schema = new Schema({
		type: "lazy",
		builder,
		inner: { toJSON }
	});
	return schema;
};
Schema.natural = function natural() {
	return Schema.number().step(1).min(0);
};
Schema.percent = function percent() {
	return Schema.number().step(.01).min(0).max(1).role("slider");
};
Schema.date = function date() {
	return Schema.union([Schema.is(Date), Schema.transform(Schema.string().role("datetime"), (value, options) => {
		const date = new Date(value);
		if (isNaN(+date)) throw new ValidationError(`invalid date "${value}"`, options);
		return date;
	}, true)]);
};
Schema.regExp = function regExp(flag = "") {
	return Schema.union([Schema.is(RegExp), Schema.transform(Schema.string().role("regexp", { flag }), (value, options) => {
		try {
			return new RegExp(value, flag);
		} catch (e) {
			throw new ValidationError(e.message, options);
		}
	}, true)]);
};
Schema.arrayBuffer = function arrayBuffer(encoding) {
	return Schema.union([
		Schema.is(ArrayBuffer),
		Schema.is(SharedArrayBuffer),
		Schema.transform(Schema.any(), (value, options) => {
			if (Binary.isSource(value)) return Binary.fromSource(value);
			throw new ValidationError(`expected ArrayBufferSource but got ${value}`, options);
		}, true),
		...encoding ? [Schema.transform(Schema.string(), (value, options) => {
			try {
				return encoding === "base64" ? Binary.fromBase64(value) : Binary.fromHex(value);
			} catch (e) {
				throw new ValidationError(e.message, options);
			}
		}, true)] : []
	]);
};
Schema.extend("lazy", (data, schema, options, strict) => {
	if (!schema.inner[kSchema]) {
		schema.inner = schema.builder();
		schema.inner.meta = {
			...schema.meta,
			...schema.inner.meta
		};
	}
	return Schema.resolve(data, schema.inner, options, strict);
});
Schema.extend("any", (data) => {
	return [data];
});
Schema.extend("never", (data, _, options) => {
	throw new ValidationError(`expected nullable but got ${data}`, options);
});
Schema.extend("const", (data, { value }, options) => {
	if (deepEqual(data, value)) return [value];
	throw new ValidationError(`expected ${value} but got ${data}`, options);
});
function checkWithinRange(data, meta, description, options, skipMin = false) {
	const { max = Infinity, min = -Infinity } = meta;
	if (data > max) throw new ValidationError(`expected ${description} <= ${max} but got ${data}`, options);
	if (data < min && !skipMin) throw new ValidationError(`expected ${description} >= ${min} but got ${data}`, options);
}
Schema.extend("string", (data, { meta }, options) => {
	if (typeof data !== "string") throw new ValidationError(`expected string but got ${data}`, options);
	if (meta.pattern) {
		const regexp = new RegExp(meta.pattern.source, meta.pattern.flags);
		if (!regexp.test(data)) throw new ValidationError(`expect string to match regexp ${regexp}`, options);
	}
	checkWithinRange(data.length, meta, "string length", options);
	return [data];
});
function decimalShift(data, digits) {
	const str = data.toString();
	if (str.includes("e")) return data * Math.pow(10, digits);
	const index = str.indexOf(".");
	if (index === -1) return data * Math.pow(10, digits);
	const frac = str.slice(index + 1);
	const integer = str.slice(0, index);
	if (frac.length <= digits) return +(integer + frac.padEnd(digits, "0"));
	return +(integer + frac.slice(0, digits) + "." + frac.slice(digits));
}
function isMultipleOf(data, min, step) {
	step = Math.abs(step);
	if (!/^\d+\.\d+$/.test(step.toString())) return (data - min) % step === 0;
	const index = step.toString().indexOf(".");
	const digits = step.toString().slice(index + 1).length;
	return Math.abs(decimalShift(data, digits) - decimalShift(min, digits)) % decimalShift(step, digits) === 0;
}
Schema.extend("number", (data, { meta }, options) => {
	if (typeof data !== "number") throw new ValidationError(`expected number but got ${data}`, options);
	checkWithinRange(data, meta, "number", options);
	const { step } = meta;
	if (step && !isMultipleOf(data, meta.min ?? 0, step)) throw new ValidationError(`expected number multiple of ${step} but got ${data}`, options);
	return [data];
});
Schema.extend("boolean", (data, _, options) => {
	if (typeof data === "boolean") return [data];
	throw new ValidationError(`expected boolean but got ${data}`, options);
});
Schema.extend("bitset", (data, { bits, meta }, options) => {
	let value = 0, keys = [];
	if (typeof data === "number") {
		value = data;
		for (const key in bits) if (data & bits[key]) keys.push(key);
	} else if (Array.isArray(data)) {
		keys = data;
		for (const key of keys) {
			if (typeof key !== "string") throw new ValidationError(`expected string but got ${key}`, options);
			if (key in bits) value |= bits[key];
		}
	} else throw new ValidationError(`expected number or array but got ${data}`, options);
	if (value === meta.default) return [value];
	return [value, keys];
});
Schema.extend("function", (data, _, options) => {
	if (typeof data === "function") return [data];
	throw new ValidationError(`expected function but got ${data}`, options);
});
Schema.extend("is", (data, { constructor }, options) => {
	if (typeof constructor === "function") {
		if (data instanceof constructor) return [data];
		throw new ValidationError(`expected ${constructor.name} but got ${data}`, options);
	} else {
		if (isNullable(data)) throw new ValidationError(`expected ${constructor} but got ${data}`, options);
		let prototype = Object.getPrototypeOf(data);
		while (prototype) {
			if (prototype.constructor?.name === constructor) return [data];
			prototype = Object.getPrototypeOf(prototype);
		}
		throw new ValidationError(`expected ${constructor} but got ${data}`, options);
	}
});
function property(data, key, schema, options) {
	try {
		const [value, adapted] = Schema.resolve(data[key], schema, {
			...options,
			path: [...options.path || [], key]
		});
		if (adapted !== void 0) data[key] = adapted;
		return value;
	} catch (e) {
		if (!options?.autofix) throw e;
		delete data[key];
		return schema.meta.default;
	}
}
Schema.extend("array", (data, { inner, meta }, options) => {
	if (!Array.isArray(data)) throw new ValidationError(`expected array but got ${data}`, options);
	checkWithinRange(data.length, meta, "array length", options, !isNullable(inner.meta.default));
	return [data.map((_, index) => property(data, index, inner, options))];
});
Schema.extend("dict", (data, { inner, sKey }, options, strict) => {
	if (!isPlainObject(data)) throw new ValidationError(`expected object but got ${data}`, options);
	const result = {};
	for (const key in data) {
		let rKey;
		try {
			rKey = Schema.resolve(key, sKey, options)[0];
		} catch (error) {
			if (strict) continue;
			throw error;
		}
		result[rKey] = property(data, key, inner, options);
		data[rKey] = data[key];
		if (key !== rKey) delete data[key];
	}
	return [result];
});
Schema.extend("tuple", (data, { list }, options, strict) => {
	if (!Array.isArray(data)) throw new ValidationError(`expected array but got ${data}`, options);
	const result = list.map((inner, index) => property(data, index, inner, options));
	if (strict) return [result];
	result.push(...data.slice(list.length));
	return [result];
});
function merge(result, data) {
	for (const key in data) {
		if (key in result) continue;
		result[key] = data[key];
	}
}
Schema.extend("object", (data, { dict }, options, strict) => {
	if (!isPlainObject(data)) throw new ValidationError(`expected object but got ${data}`, options);
	const result = {};
	for (const key in dict) {
		const value = property(data, key, dict[key], options);
		if (!isNullable(value) || key in data) result[key] = value;
	}
	if (!strict) merge(result, data);
	return [result];
});
Schema.extend("union", (data, { list, toString }, options, strict) => {
	const messages = [];
	for (const inner of list) try {
		return Schema.resolve(data, inner, options, strict);
	} catch (error) {
		messages.push(error);
	}
	throw new ValidationError(`expected ${toString()} but got ${JSON.stringify(data)}`, options);
});
Schema.extend("intersect", (data, { list, toString }, options, strict) => {
	if (!list.length) return [data];
	let result;
	for (const inner of list) {
		const value = Schema.resolve(data, inner, options, true)[0];
		if (isNullable(value)) continue;
		if (isNullable(result)) result = value;
		else if (typeof result !== typeof value) throw new ValidationError(`expected ${toString()} but got ${JSON.stringify(data)}`, options);
		else if (typeof value === "object") merge(result ??= {}, value);
		else if (result !== value) throw new ValidationError(`expected ${toString()} but got ${JSON.stringify(data)}`, options);
	}
	if (!strict && isPlainObject(data)) merge(result, data);
	return [result];
});
Schema.extend("transform", (data, { inner, callback, preserve }, options) => {
	const [result, adapted = data] = Schema.resolve(data, inner, options, true);
	if (preserve) return [callback(result)];
	else return [callback(result), callback(adapted)];
});
const formatters = {};
function defineMethod(name, keys, format) {
	formatters[name] = format;
	Object.assign(Schema, { [name](...args) {
		const schema = new Schema({ type: name });
		keys.forEach((key, index) => {
			switch (key) {
				case "sKey":
					schema.sKey = args[index] ?? Schema.string();
					break;
				case "inner":
					schema.inner = Schema.from(args[index]);
					break;
				case "list":
					schema.list = args[index].map(Schema.from);
					break;
				case "dict":
					schema.dict = mapValues(args[index], Schema.from);
					break;
				case "bits":
					schema.bits = {};
					for (const key in args[index]) {
						if (typeof args[index][key] !== "number") continue;
						schema.bits[key] = args[index][key];
					}
					break;
				case "callback": {
					const callback = schema.callback = args[index];
					callback["toJSON"] ||= () => callback.toString();
					break;
				}
				case "constructor": {
					const constructor = schema.constructor = args[index];
					if (typeof constructor === "function") constructor["toJSON"] ||= () => constructor["name"];
					break;
				}
				default: schema[key] = args[index];
			}
		});
		if (name === "object" || name === "dict") schema.meta.default = {};
		else if (name === "array" || name === "tuple") schema.meta.default = [];
		else if (name === "bitset") schema.meta.default = 0;
		return schema;
	} });
}
defineMethod("is", ["constructor"], ({ constructor }) => {
	if (typeof constructor === "function") return constructor.name;
	else return constructor;
});
defineMethod("any", [], () => "any");
defineMethod("never", [], () => "never");
defineMethod("const", ["value"], ({ value }) => typeof value === "string" ? JSON.stringify(value) : value);
defineMethod("string", [], () => "string");
defineMethod("number", [], () => "number");
defineMethod("boolean", [], () => "boolean");
defineMethod("bitset", ["bits"], () => "bitset");
defineMethod("function", [], () => "function");
defineMethod("array", ["inner"], ({ inner }) => `${inner.toString(true)}[]`);
defineMethod("dict", ["inner", "sKey"], ({ inner, sKey }) => `{ [key: ${sKey.toString()}]: ${inner.toString()} }`);
defineMethod("tuple", ["list"], ({ list }) => `[${list.map((inner) => inner.toString()).join(", ")}]`);
defineMethod("object", ["dict"], ({ dict }) => {
	if (Object.keys(dict).length === 0) return "{}";
	return `{ ${Object.entries(dict).map(([key, inner]) => {
		return `${key}${inner.meta.required ? "" : "?"}: ${inner.toString()}`;
	}).join(", ")} }`;
});
defineMethod("union", ["list"], ({ list }, inline) => {
	const result = list.map(({ toString: format }) => format()).join(" | ");
	return inline ? `(${result})` : result;
});
defineMethod("intersect", ["list"], ({ list }) => {
	return `${list.map((inner) => inner.toString(true)).join(" & ")}`;
});
defineMethod("transform", [
	"inner",
	"callback",
	"preserve"
], ({ inner }, isInner) => inner.toString(isInner));
//#endregion
//#region lib/types/config.js
const VisualAidConfigSchema = Schema.object({
	storageDir: Schema.string(),
	enabled: Schema.boolean().default(false),
	provider: Schema.string(),
	model: Schema.string(),
	maxTokens: Schema.number().step(1).min(1),
	timeoutMs: Schema.number().step(1).min(1),
	channelWindowRatio: Schema.number().min(.1).max(.95).default(.85),
	describeImages: Schema.boolean().default(true),
	describeMaxTokens: Schema.number().step(1).min(1).default(512),
	masqueradeMultimodal: Schema.boolean().default(false),
	reasoningEffort: Schema.string()
});
const DEFAULT_TIMEOUT_MS = 12e4;
//#endregion
//#region lib/types/channel.js
function surfaceContent(event) {
	switch (event.type) {
		case "user/message": return event.data.content;
		case "assistant/message": return event.data.message.content;
		case "tool/result": return event.data.message.content;
		default: return;
	}
}
function visitImages(blocks, visit) {
	for (const block of blocks) if (block.type === "image") visit(block.attachment);
	else if (block.type === "tool-result") visitImages(block.content, visit);
}
function collectImageRecords(session) {
	const byAttachment = /* @__PURE__ */ new Map();
	const present = /* @__PURE__ */ new Set();
	let next = 1;
	for (const event of session.events) if (event.type === "visual-aid/counter" && typeof event.data.next === "number") next = Math.max(next, event.data.next);
	for (const event of session.events) {
		const content = surfaceContent(event);
		if (content === void 0) continue;
		visitImages(content, (attachment) => {
			present.add(String(attachment.attachmentId));
		});
	}
	for (const event of session.events) {
		if (event.type !== "visual-aid/image") continue;
		const record = event.data;
		if (!present.has(record.attachmentId)) continue;
		byAttachment.set(record.attachmentId, { ...record });
		next = Math.max(next, record.imageNo + 1);
	}
	for (const event of session.events) {
		const content = surfaceContent(event);
		if (content === void 0) continue;
		visitImages(content, (attachment) => {
			const id = String(attachment.attachmentId);
			if (byAttachment.has(id)) return;
			byAttachment.set(id, {
				imageNo: next++,
				attachmentId: id,
				mediaType: attachment.mediaType,
				bytes: attachment.bytes,
				width: attachment.width,
				height: attachment.height,
				...attachment.name === void 0 ? {} : { name: attachment.name },
				status: "pending"
			});
		});
	}
	return [...byAttachment.values()].sort((a, b) => a.imageNo - b.imageNo);
}
function foldImageStates(session, records) {
	const byNo = new Map(records.map((record) => [record.imageNo, record]));
	for (const event of session.events) {
		if (event.type !== "visual-aid/image") continue;
		const existing = byNo.get(event.data.imageNo);
		if (existing === void 0 || existing.attachmentId !== event.data.attachmentId) continue;
		byNo.set(event.data.imageNo, {
			...existing,
			...event.data
		});
	}
	return [...byNo.values()].sort((a, b) => a.imageNo - b.imageNo);
}
function placeholderText(record) {
	const label = record.name ?? "image";
	const detail = record.status === "described" && record.summary !== void 0 ? record.summary : "no description yet";
	return `[Image #${record.imageNo}: ${label}, ${record.width}\u00d7${record.height} \u2014 ${detail}. Use this description as the source of truth; only query with view_image(#${record.imageNo}, question) if a needed detail is missing]`;
}
function substituteImages(messages, images) {
	const byAttachment = new Map([...images.values()].map((record) => [record.attachmentId, record]));
	const substitute = (blocks) => blocks.map((block) => {
		if (block.type === "image") {
			const record = byAttachment.get(String(block.attachment.attachmentId));
			return {
				type: "text",
				text: record === void 0 ? "[Image unavailable]" : placeholderText(record)
			};
		}
		if (block.type === "tool-result") return {
			...block,
			content: substitute(block.content)
		};
		return block;
	});
	return messages.map((message) => {
		if (!message.content.some((block) => block.type === "image" || block.type === "tool-result" && block.content.some((inner) => inner.type === "image"))) return message;
		return deepFreeze({
			...message,
			content: substitute(message.content)
		});
	});
}
function imageBlockFor(record) {
	return {
		type: "image",
		attachment: {
			attachmentId: AttachmentId(record.attachmentId),
			mediaType: record.mediaType,
			bytes: record.bytes,
			width: record.width,
			height: record.height,
			...record.name === void 0 ? {} : { name: record.name }
		}
	};
}
function estimateTextTokens(text) {
	return Math.ceil(text.length / 4) + 4;
}
function estimateImageTokens(record) {
	return Math.max(16, Math.ceil(record.width * record.height / 750));
}
const VISUAL_SYSTEM = "You are the visual channel. Answer only the latest question about the images. You may build on earlier answers but do not repeat them. Follow the language of the question.";
const DESCRIBE_SYSTEM = "Describe the attached image in concise English. Transcribe visible text exactly.";
const DESCRIBE_PROMPT = "Describe this image in concise English. State what it shows and transcribe all visible text exactly. Output ONLY the final description after the line \"FINAL_DESCRIPTION:\". Do not include any thinking, planning, or reasoning before that line.";
function buildVisualRequest(records, qas, question, route, contextWindow, ratio) {
	const sorted = [...records].sort((a, b) => a.imageNo - b.imageNo);
	if (sorted.length === 0) throw new Error("visual-aid: view_image needs at least one image in this session");
	let droppedImages = 0;
	const toMessage = (text, role) => role === "user" ? createUserMessage({
		content: [{
			type: "text",
			text
		}],
		source: {
			kind: "plugin",
			plugin: "dsh-visual-aid"
		}
	}) : createAssistantMessage({
		content: [{
			type: "text",
			text
		}],
		source: {
			provider: route.provider,
			model: route.model
		}
	});
	const imageTokens = () => sorted.reduce((sum, record) => sum + estimateImageTokens(record), 0);
	const total = (history) => estimateTextTokens(VISUAL_SYSTEM) + 4 + imageTokens() + history.reduce((sum, qa) => sum + estimateTextTokens(qa.question) + estimateTextTokens(qa.answer), 0);
	let dropped = 0;
	let history = qas;
	const limit = Math.max(1, Math.floor(contextWindow * ratio));
	while (history.length > 0 && total(history) > limit) {
		history = history.slice(1);
		dropped++;
	}
	while (sorted.length > 1 && total(history) > limit) {
		sorted.shift();
		droppedImages++;
	}
	if (total(history) > limit) throw new Error(`visual-aid: even one image exceeds ${Math.round(ratio * 100)}% of the visual model context window; use a smaller image`);
	return {
		messages: deepFreeze([
			createUserMessage({
				content: sorted.map(imageBlockFor),
				source: {
					kind: "plugin",
					plugin: "dsh-visual-aid"
				}
			}),
			...history.flatMap((qa) => [toMessage(qa.question, "user"), toMessage(qa.answer, "assistant")]),
			toMessage(question, "user")
		]),
		droppedQas: dropped,
		droppedImages
	};
}
//#endregion
//#region lib/types/index.js
var __addDisposableResource = function(env, value, async) {
	if (value !== null && value !== void 0) {
		if (typeof value !== "object" && typeof value !== "function") throw new TypeError("Object expected.");
		var dispose, inner;
		if (async) {
			if (!Symbol.asyncDispose) throw new TypeError("Symbol.asyncDispose is not defined.");
			dispose = value[Symbol.asyncDispose];
		}
		if (dispose === void 0) {
			if (!Symbol.dispose) throw new TypeError("Symbol.dispose is not defined.");
			dispose = value[Symbol.dispose];
			if (async) inner = dispose;
		}
		if (typeof dispose !== "function") throw new TypeError("Object not disposable.");
		if (inner) dispose = function() {
			try {
				inner.call(this);
			} catch (e) {
				return Promise.reject(e);
			}
		};
		env.stack.push({
			value,
			dispose,
			async
		});
	} else if (async) env.stack.push({ async: true });
	return value;
};
var __disposeResources = (function(SuppressedError) {
	return function(env) {
		function fail(e) {
			env.error = env.hasError ? new SuppressedError(e, env.error, "An error was suppressed during disposal.") : e;
			env.hasError = true;
		}
		var r, s = 0;
		function next() {
			while (r = env.stack.pop()) try {
				if (!r.async && s === 1) return s = 0, env.stack.push(r), Promise.resolve().then(next);
				if (r.dispose) {
					var result = r.dispose.call(r.value);
					if (r.async) return s |= 2, Promise.resolve(result).then(next, function(e) {
						fail(e);
						return next();
					});
				} else s |= 1;
			} catch (e) {
				fail(e);
			}
			if (s === 1) return env.hasError ? Promise.reject(env.error) : Promise.resolve();
			if (env.hasError) throw env.error;
		}
		return next();
	};
})(typeof SuppressedError === "function" ? SuppressedError : function(error, suppressed, message) {
	var e = new Error(message);
	return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
});
const DEFAULT_MAX_RETRIES = 2;
const NAME = "@sy008/dsh-visual-aid";
const NS = settingsNamespace("visual-aid");
const IMAGE_EXTENSIONS = {
	".png": "image/png",
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".webp": "image/webp",
	".gif": "image/gif"
};
function emptyVisualAidStats() {
	return {
		visualSteps: 0,
		visualAnswered: 0,
		visualInput: 0,
		visualOutput: 0,
		visualCacheRead: 0,
		visualCacheWrite: 0,
		visualElapsedMs: 0,
		visualToolMs: 0,
		describeSteps: 0,
		describeInput: 0,
		describeOutput: 0,
		describeElapsedMs: 0,
		querySteps: 0,
		queryInput: 0,
		queryOutput: 0,
		queryElapsedMs: 0
	};
}
function extractCleanDescription(raw) {
	const markers = [
		"FINAL_DESCRIPTION:",
		"Final Output:",
		"**Final Output:**",
		"Final Answer:",
		"**Final Answer:**",
		"Final output:"
	];
	let best = raw;
	for (const marker of markers) {
		const index = raw.lastIndexOf(marker);
		if (index !== -1) {
			const candidate = raw.slice(index + marker.length).trim();
			if (candidate.length > 0) best = candidate;
		}
	}
	if (best !== raw) return best;
	const starters = [
		"This image is",
		"The image is",
		"Based on the image",
		"Here is the",
		"Here is a",
		"Sure, here",
		"The table",
		"The screenshot"
	];
	let bestStart = -1;
	for (const starter of starters) {
		const index = raw.lastIndexOf(starter);
		if (index > bestStart) bestStart = index;
	}
	if (bestStart > 0) {
		const candidate = raw.slice(bestStart).trim();
		if (candidate.length > 0) return candidate;
	}
	return raw;
}
var VisualAidService = class extends Service {
	static Config = VisualAidConfigSchema;
	static inject = [
		"llm",
		"sessions",
		"tools",
		"systemPrompt"
	];
	current = {
		enabled: false,
		provider: "",
		model: "",
		maxTokens: void 0,
		timeoutMs: DEFAULT_TIMEOUT_MS,
		channelWindowRatio: .85,
		describeImages: true,
		describeMaxTokens: 512,
		masqueradeMultimodal: false,
		reasoningEffort: void 0
	};
	targetCache;
	toolDisposers = [];
	agentToolCleanups = /* @__PURE__ */ new Map();
	sessionData = /* @__PURE__ */ new Map();
	storageDir;
	inFlight = /* @__PURE__ */ new Map();
	projected = /* @__PURE__ */ new WeakSet();
	constructor(ctx, config) {
		super(ctx, "visualAid");
		if (config.storageDir !== void 0) {
			this.storageDir = config.storageDir;
			mkdirSync(this.storageDir, { recursive: true });
		} else {
			const defaultDir = join(homedir(), ".dsh", "visual-aid");
			try {
				mkdirSync(defaultDir, { recursive: true });
				writeFileSync(join(defaultDir, ".write-test"), "");
				rmSync(join(defaultDir, ".write-test"), { force: true });
				this.storageDir = defaultDir;
			} catch {
				this.storageDir = join(tmpdir(), "dsh-visual-aid");
				mkdirSync(this.storageDir, { recursive: true });
			}
		}
		let source;
		installSettingsSection(ctx, NS, VisualAidConfigSchema, config, {
			setSource: (read) => {
				source = read;
				this.applyConfig(read());
			},
			onChange: () => {
				this.applyConfig(source?.() ?? config);
				this.invalidateTarget();
				this.refreshTool();
				this.refreshAllAgentTools();
			}
		});
		this.applyConfig(config);
		this.patchResolveModelInfo();
		ctx.on("llm/stream", (options, next) => this.project(options, next), { global: true });
		ctx.on("session/event", (_session, event) => {
			if (event.type === "visual-aid/toggle") {
				const agent = this.ctx.get("agents")?.get(_session.id);
				if (agent !== void 0) this.refreshAgentTools(agent);
			}
			if (event.type === "user/message" || event.type === "tool/result") {
				if ((event.type === "user/message" ? event.data.content : event.data.message.content).some((block) => block.type === "image" || block.type === "tool-result" && block.content.some((inner) => inner.type === "image"))) this.settleDescriptions(_session, void 0, void 0);
			}
		});
		ctx.on("session/created", (session) => {
			this.inheritSessionData(session);
		}, { global: true });
		ctx.on("llm/adapters-updated", () => {
			this.invalidateTarget();
		});
		ctx.inject([
			"webServer",
			"agents",
			"attachments"
		], (uploadCtx) => {
			const route = uploadCtx.webServer.register({
				kind: "exact",
				path: "/api/visual-aid/upload",
				handler: async (req, res) => {
					try {
						const chunks = [];
						for await (const chunk of req) chunks.push(Buffer.from(chunk));
						const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
						const sessionId = body.sessionId;
						const images = body.images ?? (body.data === void 0 || body.mediaType === void 0 ? [] : [{
							mediaType: body.mediaType,
							data: body.data,
							...body.name === void 0 ? {} : { name: body.name }
						}]);
						if (sessionId === void 0 || images.length === 0) {
							res.writeHead(400, { "content-type": "application/json" }).end(JSON.stringify({ error: "sessionId and at least one image are required" }));
							return;
						}
						const agent = uploadCtx.agents.get(SessionId(sessionId));
						if (agent === void 0) {
							res.writeHead(404, { "content-type": "application/json" }).end(JSON.stringify({ error: "session not found" }));
							return;
						}
						const content = [];
						for (const image of images) {
							const bytes = Buffer.from(image.data, "base64");
							const ref = await uploadCtx.attachments.saveImage({
								data: bytes,
								mediaType: image.mediaType,
								...image.name === void 0 ? {} : { name: image.name }
							});
							content.push({
								type: "image",
								attachment: {
									attachmentId: ref.attachmentId,
									mediaType: ref.mediaType,
									bytes: ref.bytes,
									width: ref.width,
									height: ref.height,
									...ref.name === void 0 ? {} : { name: ref.name }
								}
							});
						}
						const text = typeof body.text === "string" ? body.text : "";
						if (text.length > 0) content.push({
							type: "text",
							text
						});
						const message = createUserMessage({
							content,
							source: { kind: "user" }
						});
						agent.followup(message);
						res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ ok: true }));
					} catch (error) {
						res.writeHead(500, { "content-type": "application/json" }).end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
					}
				}
			});
			this.ctx.effect(() => () => {
				route();
			}, "visual-aid upload route");
		});
		ctx.inject(["webServer", "settings"], (settingsCtx) => {
			const route = settingsCtx.webServer.register({
				kind: "exact",
				path: "/api/visual-aid/settings",
				handler: async (req, res) => {
					try {
						if (req.method === "GET") {
							const descriptor = settingsCtx.settings.describe().find((entry) => entry.ns === NS);
							if (descriptor === void 0) {
								res.writeHead(404, { "content-type": "application/json" }).end(JSON.stringify({ error: "visual-aid settings namespace is not registered" }));
								return;
							}
							res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({
								value: descriptor.value,
								revision: descriptor.revision,
								schema: descriptor.schema
							}));
							return;
						}
						if (req.method === "POST") {
							const chunks = [];
							for await (const chunk of req) chunks.push(Buffer.from(chunk));
							const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
							if (body.patch === void 0 || typeof body.patch !== "object") {
								res.writeHead(400, { "content-type": "application/json" }).end(JSON.stringify({ error: "patch is required" }));
								return;
							}
							await settingsCtx.settings.update(NS, body.patch);
							const descriptor = settingsCtx.settings.describe().find((entry) => entry.ns === NS);
							res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({
								ok: true,
								value: descriptor?.value,
								revision: descriptor?.revision
							}));
							return;
						}
						res.writeHead(405, { "content-type": "application/json" }).end(JSON.stringify({ error: "method not allowed" }));
					} catch (error) {
						res.writeHead(500, { "content-type": "application/json" }).end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
					}
				}
			});
			this.ctx.effect(() => () => {
				route();
			}, "visual-aid settings route");
		});
		ctx.inject(["webServer"], (sessionCtx) => {
			const route = sessionCtx.webServer.register({
				kind: "exact",
				path: "/api/visual-aid/session",
				handler: async (req, res) => {
					const sessionId = new URL(req.url ?? "/", "http://x").searchParams.get("sessionId");
					if (sessionId === null) {
						res.writeHead(400, { "content-type": "application/json" }).end(JSON.stringify({ error: "sessionId is required" }));
						return;
					}
					const session = this.ctx.sessions.get(SessionId(sessionId));
					if (session === void 0) {
						res.writeHead(404, { "content-type": "application/json" }).end(JSON.stringify({ error: "session not found" }));
						return;
					}
					const data = this.dataFor(session);
					res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({
						enabled: this.enabledFor(session),
						provider: data.enabled?.provider,
						model: data.enabled?.model,
						imageRecords: [...data.imageRecords.values()],
						qas: data.qas,
						nextImageNo: data.nextImageNo,
						warnings: data.warnings,
						stats: data.stats,
						operations: data.operations,
						...data.currentContextTokens === void 0 ? {} : { currentContextTokens: data.currentContextTokens },
						...data.currentDescribeInput === void 0 ? {} : { currentDescribeInput: data.currentDescribeInput },
						...data.currentDescribeOutput === void 0 ? {} : { currentDescribeOutput: data.currentDescribeOutput },
						...data.currentDescribeElapsedMs === void 0 ? {} : { currentDescribeElapsedMs: data.currentDescribeElapsedMs },
						...data.currentQueryInput === void 0 ? {} : { currentQueryInput: data.currentQueryInput },
						...data.currentQueryOutput === void 0 ? {} : { currentQueryOutput: data.currentQueryOutput },
						...data.currentQueryElapsedMs === void 0 ? {} : { currentQueryElapsedMs: data.currentQueryElapsedMs }
					}));
				}
			});
			this.ctx.effect(() => () => {
				route();
			}, "visual-aid session route");
		});
		ctx.inject(["webServer"], (modelCtx) => {
			const route = modelCtx.webServer.register({
				kind: "exact",
				path: "/api/visual-aid/model-info",
				handler: async (req, res) => {
					const url = new URL(req.url ?? "/", "http://x");
					const provider = url.searchParams.get("provider");
					const model = url.searchParams.get("model");
					if (provider === null || model === null) {
						res.writeHead(400, { "content-type": "application/json" }).end(JSON.stringify({ error: "provider and model are required" }));
						return;
					}
					try {
						const info = await this.ctx.llm.resolveModelInfo(provider, model);
						res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({
							maxTokens: info?.defaultMaxTokens,
							contextWindow: info?.context?.contextWindow,
							reasoning: info?.reasoning
						}));
					} catch {
						res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({}));
					}
				}
			});
			this.ctx.effect(() => () => {
				route();
			}, "visual-aid model-info route");
		});
		ctx.inject(["webServer"], (toggleCtx) => {
			const route = toggleCtx.webServer.register({
				kind: "exact",
				path: "/api/visual-aid/session-toggle",
				handler: async (req, res) => {
					try {
						const chunks = [];
						for await (const chunk of req) chunks.push(Buffer.from(chunk));
						const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
						if (body.sessionId === void 0 || typeof body.enabled !== "boolean") {
							res.writeHead(400, { "content-type": "application/json" }).end(JSON.stringify({ error: "sessionId and enabled are required" }));
							return;
						}
						const session = this.ctx.sessions.get(SessionId(body.sessionId));
						if (session === void 0) {
							res.writeHead(404, { "content-type": "application/json" }).end(JSON.stringify({ error: "session not found" }));
							return;
						}
						this.dataFor(session).enabled = { enabled: body.enabled };
						this.recordOperation(session, "toggle", { enabled: body.enabled });
						res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ ok: true }));
					} catch (error) {
						res.writeHead(500, { "content-type": "application/json" }).end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
					}
				}
			});
			this.ctx.effect(() => () => {
				route();
			}, "visual-aid session-toggle route");
		});
		ctx.inject(["commands", "settings"], (commandCtx) => {
			commandCtx.commands.register({
				name: "visual-aid",
				description: "Enable or disable visual aid for this session",
				input: { hint: "on or off" },
				handler: async (invocation) => {
					const session = invocation.agent.session;
					const on = invocation.rawInput.trim().toLowerCase() === "on";
					const off = invocation.rawInput.trim().toLowerCase() === "off";
					if (!on && !off) throw new Error("/visual-aid expects \"on\" or \"off\"");
					await commandCtx.settings.update(NS, { enabled: on });
					this.recordOperation(session, "toggle", { enabled: on });
					const agent = this.ctx.get("agents")?.get(session.id);
					if (agent !== void 0) this.refreshAgentTools(agent);
					return {
						kind: "success",
						text: on ? "visual aid enabled for this session" : "visual aid disabled for this session"
					};
				}
			});
		});
		ctx.systemPrompt.section({
			name: "visual-aid",
			order: 120,
			text: (context) => {
				if (!(context.agent === void 0 ? this.current.enabled : this.enabledFor(context.agent.session))) {
					const session = context.agent?.session;
					return session !== void 0 && this.dataFor(session).imageRecords.size > 0 ? "Visual aid is now disabled. You see original images directly; view_image has been removed." : "";
				}
				const session = context.agent?.session;
				const descriptions = (session === void 0 ? [] : this.recordsFor(session)).filter((record) => record.status === "described" && record.summary !== void 0).map((record) => `Image #${record.imageNo}: ${record.summary}`).join("\n\n");
				return `Visual aid is active. Images have already been converted into detailed text placeholders containing the full image content. Use that text as the source of truth and answer from it directly. Do NOT call view_image(#N, question) merely because the user asks about an image or because a description exists; only call view_image if the placeholder is missing information or you need to verify a specific detail that is not already present. Subagents inherit visual aid when the parent session has it enabled, but the native subagent tool cannot pass images. When creating a subagent that needs image content, you MUST include the full text description of the image in the subagent prompt, not just an image reference.\n\nCurrent image descriptions:\n${descriptions.length > 0 ? descriptions : "(none available yet)"}`;
			}
		});
		this.refreshTool();
		ctx.on("agent/created", ({ agent }) => {
			this.refreshAgentTools(agent);
		});
		ctx.on("agent/disposed", ({ agent }) => {
			this.agentToolCleanups.delete(agent.id);
		});
		ctx.on("session/disposed", (session) => {
			this.removeSessionData(session);
		});
	}
	patchResolveModelInfo() {
		const llm = this.ctx.llm;
		const original = llm.resolveModelInfo.bind(llm);
		llm.resolveModelInfo = async (provider, model, signal) => {
			const info = await original(provider, model, signal);
			if (!this.current.masqueradeMultimodal) return info;
			if (provider === this.current.provider && model === this.current.model) return info;
			const modalities = info.inputModalities ?? [];
			if (modalities.includes("image")) return info;
			return {
				...info,
				inputModalities: [...modalities, "image"]
			};
		};
	}
	applyConfig(config) {
		this.current = {
			enabled: config.enabled === true,
			provider: config.provider ?? "",
			model: config.model ?? "",
			maxTokens: config.maxTokens,
			timeoutMs: config.timeoutMs ?? 12e4,
			channelWindowRatio: config.channelWindowRatio ?? .85,
			describeImages: config.describeImages !== false,
			describeMaxTokens: config.describeMaxTokens ?? 512,
			masqueradeMultimodal: config.masqueradeMultimodal === true,
			reasoningEffort: config.reasoningEffort
		};
	}
	invalidateTarget() {
		this.targetCache = void 0;
	}
	resolveTarget(session, signal) {
		const override = this.sessionOverride(session);
		const provider = override?.provider ?? this.current.provider;
		const model = override?.model ?? this.current.model;
		const key = `${provider}\u0000${model}`;
		if (this.targetCache?.key === key) return this.targetCache.promise;
		const promise = (async () => {
			if (provider.length === 0 || model.length === 0) return void 0;
			try {
				const info = await this.ctx.llm.resolveModelInfo(provider, model, signal);
				if (info.inputModalities !== void 0 && !info.inputModalities.includes("image")) return void 0;
				return {
					provider,
					model,
					...info.defaultMaxTokens === void 0 ? {} : { defaultMaxTokens: info.defaultMaxTokens },
					...info.context?.contextWindow === void 0 ? {} : { contextWindow: info.context.contextWindow }
				};
			} catch {
				return;
			}
		})();
		this.targetCache = {
			key,
			promise
		};
		return promise;
	}
	sessionOverride(session) {
		const stored = this.dataFor(session).enabled;
		if (stored !== void 0) return { ...stored };
		let latest;
		for (const event of session.events) if (event.type === "visual-aid/toggle") latest = { ...event.data };
		return latest;
	}
	enabledFor(session) {
		if (session === void 0) return false;
		if (!this.current.enabled) return false;
		const provider = this.current.provider;
		const model = this.current.model;
		return provider.length > 0 && model.length > 0;
	}
	hasConfiguredModel(session) {
		const override = session === void 0 ? void 0 : this.sessionOverride(session);
		const provider = override?.provider ?? this.current.provider;
		const model = override?.model ?? this.current.model;
		return provider.length > 0 && model.length > 0;
	}
	configuredModelLabel(session) {
		const override = this.sessionOverride(session);
		return `${override?.provider ?? this.current.provider}/${override?.model ?? this.current.model}`;
	}
	sessionFilePath(session) {
		return join(this.storageDir, `${session.id}.json`);
	}
	sessionFilePathFor(id) {
		return join(this.storageDir, `${id}.json`);
	}
	readSessionFile(id) {
		const file = this.sessionFilePathFor(id);
		if (!existsSync(file)) return void 0;
		try {
			const raw = JSON.parse(readFileSync(file, "utf8"));
			return {
				...raw.enabled === void 0 ? {} : { enabled: raw.enabled },
				imageRecords: new Map((raw.imageRecords ?? []).map((record) => [record.imageNo, record])),
				qas: raw.qas ?? [],
				nextImageNo: raw.nextImageNo ?? 1,
				warnings: raw.warnings ?? [],
				stats: raw.stats ?? emptyVisualAidStats(),
				operations: raw.operations ?? [],
				...raw.currentContextTokens === void 0 ? {} : { currentContextTokens: raw.currentContextTokens },
				...raw.currentDescribeInput === void 0 ? {} : { currentDescribeInput: raw.currentDescribeInput },
				...raw.currentDescribeOutput === void 0 ? {} : { currentDescribeOutput: raw.currentDescribeOutput },
				...raw.currentDescribeElapsedMs === void 0 ? {} : { currentDescribeElapsedMs: raw.currentDescribeElapsedMs },
				...raw.currentQueryInput === void 0 ? {} : { currentQueryInput: raw.currentQueryInput },
				...raw.currentQueryOutput === void 0 ? {} : { currentQueryOutput: raw.currentQueryOutput },
				...raw.currentQueryElapsedMs === void 0 ? {} : { currentQueryElapsedMs: raw.currentQueryElapsedMs }
			};
		} catch {
			return;
		}
	}
	cloneSessionData(entry) {
		return {
			...entry.enabled === void 0 ? {} : { enabled: { ...entry.enabled } },
			imageRecords: new Map([...entry.imageRecords].map(([no, record]) => [no, { ...record }])),
			qas: entry.qas.map((qa) => ({ ...qa })),
			nextImageNo: entry.nextImageNo,
			warnings: entry.warnings.map((warning) => ({ ...warning })),
			stats: { ...entry.stats },
			operations: entry.operations.map((operation) => ({
				...operation,
				data: { ...operation.data }
			})),
			...entry.currentContextTokens === void 0 ? {} : { currentContextTokens: entry.currentContextTokens },
			...entry.currentDescribeInput === void 0 ? {} : { currentDescribeInput: entry.currentDescribeInput },
			...entry.currentDescribeOutput === void 0 ? {} : { currentDescribeOutput: entry.currentDescribeOutput },
			...entry.currentDescribeElapsedMs === void 0 ? {} : { currentDescribeElapsedMs: entry.currentDescribeElapsedMs },
			...entry.currentQueryInput === void 0 ? {} : { currentQueryInput: entry.currentQueryInput },
			...entry.currentQueryOutput === void 0 ? {} : { currentQueryOutput: entry.currentQueryOutput },
			...entry.currentQueryElapsedMs === void 0 ? {} : { currentQueryElapsedMs: entry.currentQueryElapsedMs }
		};
	}
	inheritSessionData(session) {
		const parentId = session.header.parentSession;
		if (parentId === void 0) return;
		if (this.sessionData.has(session.id)) return;
		if (existsSync(this.sessionFilePathFor(session.id))) return;
		const parentEntry = this.sessionData.get(parentId) ?? this.readSessionFile(parentId);
		if (parentEntry === void 0) return;
		const entry = this.cloneSessionData(parentEntry);
		this.sessionData.set(session.id, entry);
		this.saveSessionData(session);
	}
	loadSessionData(session) {
		if (this.sessionData.has(session.id)) return;
		const entry = this.readSessionFile(session.id) ?? {
			imageRecords: /* @__PURE__ */ new Map(),
			qas: [],
			nextImageNo: 1,
			warnings: [],
			stats: emptyVisualAidStats(),
			operations: []
		};
		this.sessionData.set(session.id, entry);
	}
	saveSessionData(session) {
		const entry = this.sessionData.get(session.id);
		if (entry === void 0) return;
		const payload = {
			...entry.enabled === void 0 ? {} : { enabled: entry.enabled },
			imageRecords: [...entry.imageRecords.values()],
			qas: entry.qas,
			nextImageNo: entry.nextImageNo,
			warnings: entry.warnings,
			stats: entry.stats,
			operations: entry.operations,
			...entry.currentContextTokens === void 0 ? {} : { currentContextTokens: entry.currentContextTokens },
			...entry.currentDescribeInput === void 0 ? {} : { currentDescribeInput: entry.currentDescribeInput },
			...entry.currentDescribeOutput === void 0 ? {} : { currentDescribeOutput: entry.currentDescribeOutput },
			...entry.currentDescribeElapsedMs === void 0 ? {} : { currentDescribeElapsedMs: entry.currentDescribeElapsedMs },
			...entry.currentQueryInput === void 0 ? {} : { currentQueryInput: entry.currentQueryInput },
			...entry.currentQueryOutput === void 0 ? {} : { currentQueryOutput: entry.currentQueryOutput },
			...entry.currentQueryElapsedMs === void 0 ? {} : { currentQueryElapsedMs: entry.currentQueryElapsedMs }
		};
		writeFileSync(this.sessionFilePath(session), JSON.stringify(payload, null, 2));
	}
	removeSessionData(session) {
		this.sessionData.delete(session.id);
		const file = this.sessionFilePath(session);
		if (existsSync(file)) rmSync(file, { force: true });
	}
	currentTurn(session) {
		let turn;
		for (const event of session.events) if (event.type === "turn/start" || event.type === "turn/end") turn = event.data.turn;
		return turn;
	}
	recordOperation(session, type, data) {
		const entry = this.dataFor(session);
		const operation = {
			type,
			time: Date.now(),
			data
		};
		const turn = this.currentTurn(session);
		if (turn !== void 0) operation.turn = turn;
		entry.operations.push(operation);
		this.saveSessionData(session);
	}
	dataFor(session) {
		this.loadSessionData(session);
		const entry = this.sessionData.get(session.id);
		if (entry === void 0) throw new Error("visual-aid: session data is missing after load");
		return entry;
	}
	qasFor(session) {
		return this.dataFor(session).qas.filter((q) => q.status === "answered" && q.answer !== void 0).map((q) => ({
			imageNos: [...q.imageNos].sort((a, b) => a - b),
			question: q.question,
			answer: q.answer
		}));
	}
	recordsFor(session) {
		const fromLog = foldImageStates(session, collectImageRecords(session));
		const stored = this.dataFor(session).imageRecords;
		if (stored.size === 0) return fromLog;
		const byNo = new Map(fromLog.map((record) => [record.imageNo, record]));
		for (const [imageNo, record] of stored) {
			const existing = byNo.get(imageNo);
			if (existing !== void 0 && existing.attachmentId === record.attachmentId) byNo.set(imageNo, {
				...existing,
				...record
			});
			else if (existing === void 0) byNo.set(imageNo, record);
		}
		return [...byNo.values()].sort((a, b) => a.imageNo - b.imageNo);
	}
	messagesHaveImage(messages) {
		return messages.some((message) => message.content.some((block) => block.type === "image" || block.type === "tool-result" && block.content.some((inner) => inner.type === "image")));
	}
	project(options, next) {
		if (this.projected.has(options)) return next();
		const session = options.sessionId === void 0 ? void 0 : this.ctx.sessions.get(options.sessionId);
		if (session === void 0 || !this.enabledFor(session)) return next();
		return this.projectInner(options, session);
	}
	async *projectInner(options, session) {
		const target = await this.resolveTarget(session, options.signal);
		if (target === void 0) {
			if (this.hasConfiguredModel(session) && this.messagesHaveImage(options.messages)) throw new Error(`visual-aid: configured vision model ${this.configuredModelLabel(session)} is unavailable or does not accept image input`);
			this.projected.add(options);
			yield* this.ctx.llm.stream(options);
			return;
		}
		if (options.provider === target.provider && options.model === target.model) {
			this.projected.add(options);
			yield* this.ctx.llm.stream(options);
			return;
		}
		if (!this.messagesHaveImage(options.messages)) {
			this.projected.add(options);
			yield* this.ctx.llm.stream(options);
			return;
		}
		this.ensureImageRecords(session);
		await this.settleDescriptions(session, target, options.signal);
		const records = this.recordsFor(session);
		if (records.length === 0) {
			this.projected.add(options);
			yield* this.ctx.llm.stream(options);
			return;
		}
		const messages = substituteImages(options.messages, new Map(records.map((record) => [record.imageNo, record])));
		const rebuilt = deepFreeze({
			...options,
			messages
		});
		const imageCount = options.messages.flatMap((m) => m.content).filter((b) => b.type === "image").length;
		const replacedCount = messages.flatMap((m) => m.content).filter((b) => b.type === "text" && b.text.startsWith("[Image #")).length;
		this.recordOperation(session, "main-request", {
			imageCount,
			replacedCount,
			textPreview: records.map((r) => r.summary ?? "").join("\n")
		});
		this.projected.add(rebuilt);
		yield* this.ctx.llm.stream(rebuilt);
	}
	ensureImageRecords(session) {
		const data = this.dataFor(session);
		const fromLog = collectImageRecords(session);
		let next = data.nextImageNo;
		for (const record of fromLog) {
			const existing = data.imageRecords.get(record.imageNo);
			if (existing !== void 0 && existing.attachmentId === record.attachmentId) data.imageRecords.set(record.imageNo, {
				...existing,
				imageNo: record.imageNo,
				attachmentId: record.attachmentId,
				mediaType: record.mediaType,
				bytes: record.bytes,
				width: record.width,
				height: record.height,
				...record.name === void 0 ? {} : { name: record.name }
			});
			else if (!data.imageRecords.has(record.imageNo)) {
				data.imageRecords.set(record.imageNo, {
					...record,
					status: "pending"
				});
				this.recordOperation(session, "image-added", {
					imageNo: record.imageNo,
					attachmentId: record.attachmentId,
					name: record.name
				});
			}
			next = Math.max(next, record.imageNo + 1);
		}
		data.nextImageNo = next;
		this.saveSessionData(session);
	}
	async settleDescriptions(session, explicit, signal) {
		if (!this.current.describeImages) return;
		const target = explicit ?? await this.resolveTarget(session, signal);
		if (target === void 0) return;
		this.ensureImageRecords(session);
		const pending = this.recordsFor(session).filter((record) => record.status === "pending");
		if (pending.length === 0) return;
		const key = String(session.id);
		let slot = this.inFlight.get(key);
		if (slot === void 0) {
			slot = /* @__PURE__ */ new Map();
			this.inFlight.set(key, slot);
		}
		const attempts = [];
		for (const record of pending) {
			const held = slot.get(record.imageNo);
			if (held !== void 0) {
				attempts.push(held);
				continue;
			}
			const attempt = this.describeOne(session, record, target, slot);
			slot.set(record.imageNo, attempt);
			attempts.push(attempt);
		}
		await Promise.allSettled(attempts);
	}
	async describeOne(session, record, target, slot) {
		try {
			this.recordOperation(session, "describe-start", {
				imageNo: record.imageNo,
				attachmentId: record.attachmentId
			});
			const result = await this.runVisionTextWithRetry(target, session.id, [createUserMessage({
				content: [{
					type: "text",
					text: DESCRIBE_PROMPT
				}, {
					type: "image",
					attachment: {
						attachmentId: record.attachmentId,
						mediaType: record.mediaType,
						bytes: record.bytes,
						width: record.width,
						height: record.height,
						...record.name === void 0 ? {} : { name: record.name }
					}
				}],
				source: {
					kind: "plugin",
					plugin: NAME
				}
			})], DESCRIBE_SYSTEM, this.effectiveDescribeMaxTokens(target), this.current.timeoutMs, void 0);
			const data = this.dataFor(session);
			data.imageRecords.set(record.imageNo, {
				...record,
				status: "described",
				summary: extractCleanDescription(result.text),
				rawSummary: result.text,
				elapsedMs: result.elapsedMs,
				...result.usage === void 0 ? {} : { usage: result.usage }
			});
			data.stats.visualSteps++;
			data.stats.visualElapsedMs += result.elapsedMs;
			data.stats.visualInput += (result.usage?.inputTokens ?? 0) + (result.usage?.cacheReadTokens ?? 0);
			data.stats.visualOutput += result.usage?.outputTokens ?? 0;
			data.stats.visualCacheRead += result.usage?.cacheReadTokens ?? 0;
			data.stats.visualCacheWrite += result.usage?.cacheWriteTokens ?? 0;
			data.stats.describeSteps++;
			data.stats.describeInput += (result.usage?.inputTokens ?? 0) + (result.usage?.cacheReadTokens ?? 0);
			data.stats.describeOutput += result.usage?.outputTokens ?? 0;
			data.stats.describeElapsedMs += result.elapsedMs;
			const describeTotalInput = (result.usage?.inputTokens ?? 0) + (result.usage?.cacheReadTokens ?? 0);
			if (result.usage?.inputTokens !== void 0) data.currentDescribeInput = describeTotalInput;
			if (result.usage?.outputTokens !== void 0) data.currentDescribeOutput = result.usage.outputTokens;
			data.currentDescribeElapsedMs = result.elapsedMs;
			this.recordOperation(session, "describe-end", {
				imageNo: record.imageNo,
				summary: extractCleanDescription(result.text),
				rawSummary: result.text,
				elapsedMs: result.elapsedMs
			});
			this.saveSessionData(session);
		} catch (error) {
			this.dataFor(session).imageRecords.set(record.imageNo, {
				...record,
				status: "failed",
				failure: { message: error instanceof Error ? error.message : String(error) }
			});
			this.recordOperation(session, "describe-failed", {
				imageNo: record.imageNo,
				message: error instanceof Error ? error.message : String(error)
			});
			this.saveSessionData(session);
		} finally {
			slot.delete(record.imageNo);
		}
	}
	refreshTool() {
		for (const dispose of this.toolDisposers) dispose();
		this.toolDisposers = [];
		if (!this.current.enabled || this.current.provider.length === 0 || this.current.model.length === 0) return;
		this.toolDisposers.push(this.ctx.tools.register(this.viewImageDefinition()));
		this.toolDisposers.push(this.ctx.tools.register(this.visualReadImageDefinition()));
	}
	refreshAllAgentTools() {
		const agents = this.ctx.get("agents");
		if (agents === void 0) return;
		for (const agent of agents.list()) this.refreshAgentTools(agent);
	}
	refreshAgentTools(agent) {
		const previous = this.agentToolCleanups.get(agent.id);
		if (previous !== void 0) previous();
		this.agentToolCleanups.delete(agent.id);
		const enabled = this.enabledFor(agent.session);
		if (enabled === this.current.enabled) return;
		if (enabled) {
			const dispose = agent.ctx.effect(() => {
				const disposers = [agent.ctx.tools.register(this.viewImageDefinition()), agent.ctx.tools.register(this.visualReadImageDefinition())];
				return () => {
					for (const dispose of disposers) dispose();
				};
			}, "visual-aid scoped tools");
			this.agentToolCleanups.set(agent.id, dispose);
		} else {
			const dispose = agent.ctx.effect(() => agent.ctx.tools.restrict({ deny: ["view_image", "visual_read_image"] }), "visual-aid scoped restriction");
			this.agentToolCleanups.set(agent.id, dispose);
		}
	}
	viewImageDefinition() {
		return defineTool({
			name: "view_image",
			description: "Ask the configured vision model about image #N in this session. Returns text. You may call it repeatedly with follow-up questions.",
			parameters: {
				image_ids: {
					type: "array",
					required: true,
					items: { type: "string" },
					description: "Image numbers like #1 or 1."
				},
				question: {
					type: "string",
					required: true,
					description: "The exact question."
				}
			},
			output: {
				schema: { type: "string" },
				render: (_args, value) => [{
					type: "text",
					text: value
				}]
			},
			timeoutMs: this.current.timeoutMs,
			isConcurrencySafe: () => false,
			execute: (args, exec) => this.executeViewImage(exec, args.image_ids, args.question)
		});
	}
	visualReadImageDefinition() {
		return defineTool({
			name: "visual_read_image",
			description: "Read an image file into this session through the visual-aid channel, even when the main model is text-only.",
			parameters: { file_path: {
				type: "string",
				required: true
			} },
			output: {
				schema: {
					type: "object",
					additionalProperties: false,
					properties: {
						path: {
							type: "string",
							required: true
						},
						image: {
							type: "object",
							additionalProperties: false,
							required: true,
							properties: {
								attachmentId: {
									type: "string",
									required: true
								},
								mediaType: {
									type: "string",
									enum: [
										"image/png",
										"image/jpeg",
										"image/webp",
										"image/gif"
									],
									required: true
								},
								bytes: {
									type: "integer",
									required: true
								},
								width: {
									type: "integer",
									required: true
								},
								height: {
									type: "integer",
									required: true
								},
								name: { type: "string" }
							}
						}
					}
				},
				render: (_args, value) => [{
					type: "text",
					text: `<path>${value.path}</path>\n<type>image</type>\n<content>${value.image.mediaType} image, ${value.image.width}x${value.image.height} px</content>`
				}, {
					type: "image",
					attachment: {
						attachmentId: value.image.attachmentId,
						mediaType: value.image.mediaType,
						bytes: value.image.bytes,
						width: value.image.width,
						height: value.image.height,
						...value.image.name === void 0 ? {} : { name: value.image.name }
					}
				}]
			},
			isConcurrencySafe: () => true,
			execute: (args, exec) => this.readImage(exec, args.file_path)
		});
	}
	async readImage(exec, filePath) {
		const mediaType = IMAGE_EXTENSIONS[extname(filePath).toLowerCase()];
		if (mediaType === void 0) throw new Error(`visual_read_image only accepts PNG/JPEG/WebP/GIF paths: ${filePath}`);
		const attachments = this.ctx.get("attachments");
		if (attachments === void 0) throw new Error("visual_read_image requires an attachment service");
		const fs = this.ctx.get("fs");
		if (fs === void 0) throw new Error("visual_read_image requires a filesystem service");
		const cwd = exec.agent?.session.header.cwd;
		const target = await fs.resolve(filePath, {
			...cwd === void 0 ? {} : { cwd },
			signal: exec.signal
		});
		const info = await fs.stat(target, exec.signal);
		if (info === void 0) throw new Error(`cannot read "${target.displayPath}": not found`);
		if (info.type !== "file") throw new Error(`cannot read "${target.displayPath}": not a regular file`);
		const cap = Math.min(attachments.imageLimits.maxImageBytes, attachments.imageLimits.maxMessageImageBytes);
		const data = await fs.readBytes(target, exec.signal, cap);
		let ref;
		try {
			ref = await attachments.saveImage({
				data,
				mediaType,
				name: basename(target.displayPath)
			});
		} catch (error) {
			if (error instanceof AttachmentError && error.code === "IMAGE_TYPE_MISMATCH") throw new Error(`cannot read "${target.displayPath}": extension declares ${mediaType}, but bytes use another format`, { cause: error });
			throw error;
		}
		this.ctx.emit("fs/observed", target, {
			kind: "present",
			version: info.version
		}, exec);
		return {
			path: target.displayPath,
			image: {
				attachmentId: String(ref.attachmentId),
				mediaType: ref.mediaType,
				bytes: ref.bytes,
				width: ref.width,
				height: ref.height,
				...ref.name === void 0 ? {} : { name: ref.name }
			}
		};
	}
	async executeViewImage(exec, rawIds, question) {
		const session = exec.agent?.session;
		if (session === void 0) throw new Error("view_image requires a session tool call");
		if (!this.enabledFor(session)) throw new Error("visual-aid is disabled for this session");
		const target = await this.resolveTarget(session, exec.signal);
		if (target === void 0) {
			if (this.hasConfiguredModel(session)) throw new Error(`view_image: configured vision model ${this.configuredModelLabel(session)} is unavailable or does not accept image input`);
			throw new Error("view_image: no usable visual model is configured");
		}
		this.recordOperation(session, "tool-invoked", {
			tool: "view_image",
			imageNos: rawIds,
			question
		});
		this.ensureImageRecords(session);
		const records = this.recordsFor(session);
		const byNo = new Map(records.map((record) => [record.imageNo, record]));
		const byAttachment = new Map(records.map((record) => [record.attachmentId, record]));
		const parse = (raw) => {
			const match = /^#?(\d+)$/.exec(raw.trim());
			if (match !== null && byNo.has(Number(match[1]))) return Number(match[1]);
			const found = byAttachment.get(raw.trim());
			if (found !== void 0) return found.imageNo;
			throw new Error(`view_image: unknown image ${JSON.stringify(raw)}`);
		};
		const imageNos = [...new Set(rawIds.map(parse))].sort((a, b) => a - b);
		const qas = this.qasFor(session);
		const contextWindow = target.contextWindow;
		if (contextWindow === void 0) throw new Error("view_image: visual model declares no context window");
		const built = buildVisualRequest(records, qas, question, target, contextWindow, this.current.channelWindowRatio);
		if (built.droppedImages > 0) {
			const warning = {
				imageNos: records.slice(0, built.droppedImages).map((record) => record.imageNo),
				message: `visual-aid dropped ${built.droppedImages} oldest image(s) because the channel exceeded ${Math.round(this.current.channelWindowRatio * 100)}% of the vision context window even after dropping every old QA pair`
			};
			this.dataFor(session).warnings.push(warning);
			this.recordOperation(session, "warning", warning);
			this.saveSessionData(session);
		}
		this.dataFor(session).qas.push({
			imageNos,
			question,
			status: "asked",
			route: target
		});
		this.dataFor(session).stats.visualSteps++;
		this.recordOperation(session, "query-asked", {
			imageNos,
			question
		});
		this.saveSessionData(session);
		const maxTokens = this.effectiveMaxTokens(target);
		try {
			const result = await this.runVisionTextWithRetry(target, session.id, built.messages, VISUAL_SYSTEM, maxTokens, this.current.timeoutMs, exec.signal);
			const data = this.dataFor(session);
			data.qas.push({
				imageNos,
				question,
				status: "answered",
				route: target,
				answer: result.text,
				elapsedMs: result.elapsedMs,
				...result.usage === void 0 ? {} : { usage: result.usage }
			});
			data.stats.visualAnswered++;
			data.stats.visualElapsedMs += result.elapsedMs;
			data.stats.visualInput += (result.usage?.inputTokens ?? 0) + (result.usage?.cacheReadTokens ?? 0);
			data.stats.visualOutput += result.usage?.outputTokens ?? 0;
			data.stats.visualCacheRead += result.usage?.cacheReadTokens ?? 0;
			data.stats.visualCacheWrite += result.usage?.cacheWriteTokens ?? 0;
			data.stats.querySteps++;
			data.stats.queryInput += (result.usage?.inputTokens ?? 0) + (result.usage?.cacheReadTokens ?? 0);
			data.stats.queryOutput += result.usage?.outputTokens ?? 0;
			data.stats.queryElapsedMs += result.elapsedMs;
			const queryTotalInput = (result.usage?.inputTokens ?? 0) + (result.usage?.cacheReadTokens ?? 0);
			if (result.usage?.inputTokens !== void 0) data.currentContextTokens = queryTotalInput;
			if (result.usage?.inputTokens !== void 0) data.currentQueryInput = queryTotalInput;
			if (result.usage?.outputTokens !== void 0) data.currentQueryOutput = result.usage.outputTokens;
			data.currentQueryElapsedMs = result.elapsedMs;
			this.recordOperation(session, "query-answered", {
				imageNos,
				question,
				answer: result.text
			});
			this.saveSessionData(session);
			return result.text;
		} catch (error) {
			this.dataFor(session).qas.push({
				imageNos,
				question,
				status: "failed",
				route: target,
				failure: { message: error instanceof Error ? error.message : String(error) }
			});
			this.recordOperation(session, "query-failed", {
				imageNos,
				question,
				message: error instanceof Error ? error.message : String(error)
			});
			this.saveSessionData(session);
			throw error;
		}
	}
	effectiveMaxTokens(target) {
		const configured = this.current.maxTokens;
		if (configured !== void 0 && configured !== 4096) return configured;
		return target.defaultMaxTokens ?? 4096;
	}
	effectiveDescribeMaxTokens(target) {
		const configured = this.current.describeMaxTokens;
		if (configured !== void 0 && configured > 512) return configured;
		const base = target.defaultMaxTokens ?? 4096;
		return Math.max(2048, Math.floor(base / 4));
	}
	async runVisionTextWithRetry(target, sessionId, messages, system, maxTokens, timeoutMs, signal) {
		let lastError;
		for (let attempt = 0; attempt <= DEFAULT_MAX_RETRIES; attempt++) {
			if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, 1e3 * attempt));
			try {
				return await this.runVisionText(target, sessionId, messages, system, maxTokens, timeoutMs, signal);
			} catch (error) {
				lastError = error;
			}
		}
		throw lastError;
	}
	async runVisionText(target, sessionId, messages, system, maxTokens, timeoutMs, signal) {
		const env_1 = {
			stack: [],
			error: void 0,
			hasError: false
		};
		try {
			const callDeadline = __addDisposableResource(env_1, deadline(signal, timeoutMs, "VISUAL_AID_TIMEOUT"), false);
			const started = Date.now();
			const options = deepFreeze({
				provider: target.provider,
				model: target.model,
				messages,
				system,
				maxTokens,
				sessionId,
				...this.current.reasoningEffort === void 0 ? {} : { reasoningEffort: this.current.reasoningEffort },
				signal: callDeadline.signal
			});
			const assembler = new BlockAssembler();
			for await (const chunk of this.ctx.llm.stream(options)) {
				callDeadline.signal.throwIfAborted();
				assembler.push(chunk);
			}
			const finish = assembler.finish;
			if (finish.kind !== "stop") {
				const failure = finish.kind === "error" || finish.kind === "aborted" ? finish.failure : {
					message: `visual call ended with ${finish.kind}`,
					code: "VISUAL_AID_FINISH"
				};
				throw new Error(`visual-aid failed on ${target.provider}/${target.model}: ${failure.message}`);
			}
			const text = assembler.blocks().filter((block) => block.type === "text" || block.type === "reasoning").map((block) => block.text.trim()).filter((text) => text.length > 0).join("\n");
			if (text.length === 0) throw new Error(`visual-aid produced no text on ${target.provider}/${target.model}`);
			const usage = assembler.usage;
			return {
				text,
				elapsedMs: Date.now() - started,
				...usage === void 0 ? {} : { usage: {
					inputTokens: usage.inputTokens,
					outputTokens: usage.outputTokens,
					...usage.cacheReadTokens === void 0 ? {} : { cacheReadTokens: usage.cacheReadTokens },
					...usage.cacheWriteTokens === void 0 ? {} : { cacheWriteTokens: usage.cacheWriteTokens }
				} }
			};
		} catch (e_1) {
			env_1.error = e_1;
			env_1.hasError = true;
		} finally {
			__disposeResources(env_1);
		}
	}
};
//#endregion
export { NAME, VisualAidService as default };
