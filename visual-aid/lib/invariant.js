//#region lib/types/invariant.js
const name = "visual-aid-invariant";
const inject = ["invariants"];
const install = () => {};
const apply = (ctx) => Promise.resolve(ctx.invariants.register("@deepseek-ai/dsh-visual-aid", install));
//#endregion
export { apply, inject, name };
