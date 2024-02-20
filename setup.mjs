export function setup(ctx) {
    ctx.patch(Skill, 'addXP').before(function(amount, masteryAction) {
        return [amount * 1.066, masteryAction];
    });
}