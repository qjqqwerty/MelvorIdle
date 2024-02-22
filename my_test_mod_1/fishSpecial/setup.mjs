export function setup(ctx) {
    ctx.onCharacterSelectionLoaded(ctx => {
        // 调试日志
        const debugLog = (...msg) => {
            mod.api.SEMI.log(`id:${id}`, ...msg);
        };

        // 配置参数
        const conf = ctx.settings.section('General');
        conf.add([
            {
                type: "switch",
                name: "mod-enabled",
                label: "enabled 钓鱼特殊物品掉率修改",
                hint: " ",
                default: !0,
            },
            {
                type: "number",
                name: "modification-range",
                label: "修改-范围",
                min: -10,
                max: 100,
                default: 50,
            }]);

        console.log(conf);
        console.log(`配置对象 ${conf}`);


        const buffEnabled = conf.get("mod-enabled");    // 是否启用buff
        const buffMultiplier = conf.get("modification-range"); // 物品掉落率的倍增因子

        console.log(buffEnabled);
        console.log(`是否启用buff ${buffEnabled}`);
        debugLog("debugLog", buffEnabled);
        debugLog(`是否启用buff ${buffEnabled}`);

        ctx.onCharacterLoaded(async (ctx) => {
            // 测试生效时间
            console.log(`onCharacterLoaded生效`);
            debugLog(`onCharacterLoaded生效`);
        });

        const buffDropRates = game.modifiers.increasedFishingSpecialChance;
        console.log(`全局特殊掉落率为 ${buffDropRates}`);
        debugLog(`全局特殊掉落率为 ${buffDropRates}`);
        const debuffDropRates = game.modifiers.decreasedFishingSpecialChance;
        console.log(`特殊掉落率衰减为 ${debuffDropRates}`);
        debugLog(`特殊掉落率衰减为 ${debuffDropRates}`);

        // 监听钓鱼动作
        // if (game.fishing.isActive) {
        //     applyBuff();
        // }return;
        applyBuff();

        // 应用buff的函数
        function applyBuff() {
            // 根据配置的倍增因子修改掉落率
            let newDropRate = currentDropRate + buffMultiplier;

            // 更新特殊物品的掉落率
            // game.fishing.dropRates.set(itemId, newDropRate);

            // 在控制台输出调试信息
            console.log(`Buff生效：${itemId} 掉落率调整为 ${newDropRate}`);
            debugLog(`Buff生效：${itemId} 掉落率调整为 ${newDropRate}`);
        }
    });
}
