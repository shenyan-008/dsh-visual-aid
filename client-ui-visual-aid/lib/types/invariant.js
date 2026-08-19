export const name = 'client-ui-visual-aid-invariant';
export const inject = ['invariants'];
const install = () => { };
export const apply = (ctx) => Promise.resolve(ctx.invariants.register('@sy008/dsh-client-ui-visual-aid', install));
//# sourceMappingURL=invariant.js.map