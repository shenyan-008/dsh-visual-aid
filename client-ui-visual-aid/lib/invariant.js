//#region lib/types/invariant.js
const name = "client-ui-visual-aid-invariant";
const inject = ["invariants"];
const install = () => {};
const apply = (ctx) => Promise.resolve(ctx.invariants.register("@deepseek-ai/dsh-client-ui-visual-aid", install));
//#endregion
export { apply, inject, name };
