export function setup(ctx) {
    // 配置参数
    const config = {
        buffEnabled: true,      // 是否启用buff
        buffMultiplier: 0.5,    // 物品掉落率的倍增因子
    };

    // 监听钓鱼动作
    ctx.onFishCaught((fish, isSpecial) => {
        if (config.buffEnabled && isSpecial) {
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
            let newDropRate = currentDropRate + config.buffMultiplier;

            // 更新特殊物品的掉落率
            game.fishing.dropRates.set(itemId, newDropRate);

            // 在控制台输出调试信息
            console.log(`Buff生效：${itemId} 掉落率调整为 ${newDropRate}`);
        });
    }
}
