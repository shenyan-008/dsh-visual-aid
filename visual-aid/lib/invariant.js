//#region lib/types/invariant.js
const name = "visual-aid-invariant";
const inject = ["invariants"];
const install = () => {};
const apply = (ctx) => Promise.resolve(ctx.invariants.register("@sy008/dsh-visual-aid", install));
//#endregion
export { apply, inject, name };
