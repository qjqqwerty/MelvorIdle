export function setup(ctx) {
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
    
    const buffEnabled = conf.get("mod-enabled");    // 是否启用buff
    const buffMultiplier = conf.get("modification-range"); // 物品掉落率的倍增因子

    console.log(buffEnabled);
    
    // 监听钓鱼动作
    ctx.onFishCaught((fish, isSpecial) => {
        if (buffEnabled && isSpecial) {
            // 如果启用了buff，并且捕获的是特殊物品
            applyBuff();
        }
    });

    // 应用buff的函数
    function applyBuff() {
        // 获取所有物品的掉落率
        const allDropRates = game.fishing.dropRates.getAll();

        // 遍历所有物品的掉落率，修改特殊物品的掉落率
        Object.keys(allDropRates).forEach(itemId => {
            // 获取当前物品的掉落率
            let currentDropRate = allDropRates[itemId];

            // 根据配置的倍增因子修改掉落率
            let newDropRate = currentDropRate + buffMultiplier;

            // 更新特殊物品的掉落率
            game.fishing.dropRates.set(itemId, newDropRate);

            // 在控制台输出调试信息
            console.log(`Buff生效：${itemId} 掉落率调整为 ${newDropRate}`);
        });
    }
}
