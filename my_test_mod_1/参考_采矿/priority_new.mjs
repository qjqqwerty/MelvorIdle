// 定义帮助函数对象，用于操作属性和检查属性是否存在
var miningUtils = {
    // 如果属性不存在，则定义属性
    definePropertyIfNotExists: (target, source) => {
        for (var key in source) {
            if (miningUtils.hasOwnProperty(source, key) && 
                !miningUtils.hasOwnProperty(target, key)) {
                Object.defineProperty(target, key, { enumerable: true, get: source[key] });
            }
        }
    },
    // 检查对象是否有指定的属性
    hasOwnProperty: (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop)
};

// 初始化矿业配置对象
var miningConfig = {};
// 如果不存在，则定义 create 函数
miningUtils.definePropertyIfNotExists(miningConfig, { create: () => setup });

// 打印版本信息的工具函数
const logVersionInfo = (...args) => ((version, ...rest) => {
    console.log(`[Priority Miner v${version}]`, ...rest);
})("1.1.0", ...args);

// 始终返回 false 的工具函数
const alwaysFalse = (...args) => false;

// 插件关键字和常用区域
const pluginKey = "priority-miner";
const generalSection = "General";

// 处理矿业行动的函数
const handleMiningAction = (character, getConfig, updateLevelInConfig) => {
    // 如果矿业不活跃，则返回
    if (!game.mining.isActive) return;

    // 判断是否有额外的参数
    const hasExtraArgs = args => args.length > 0;
    // 判断是否设置了递归标志
    const isRecurFlagSet = flags => flags.length > 0 && flags[0] === true;
    // 判断是否设置了非点击标志
    const isNonClickFlagSet = flags => flags.length > 1 && flags[1] === true;

    // 获取插件是否启用以及是否启用了挖宝石
    const enablePlugin = character.settings.section(generalSection).get(`${pluginKey}-enable`);
    const enableGems = character.settings.section(generalSection).get(`${pluginKey}-enable-gems`);

    // 如果插件未启用，则返回
    if (!enablePlugin) return;

    // 打印信息：adjustSelectedRock 被调用
    logVersionInfo("adjustSelectedRock called with", action);

    // 如果有选中的岩石，则打印信息
    if (selectedRock) {
        logVersionInfo("There is a selected rock:", selectedRock);
    }

    // 如果有额外的参数，则打印信息
    if (hasExtraArgs(extraArgs)) {
        logVersionInfo("Extra args:", extraArgs);
    }

    // 获取当前配置
    const currentConfig = getConfig();
    logVersionInfo("Current config:", currentConfig);

    // 获取优先级动作，并过滤出有效的动作
    const priorityActions = currentConfig.priority.map(actionId => game.mining.actions.getObjectByID(actionId));
    const validActions = priorityActions.filter(action => {
        const isGem = action.type.valueOf() === "Gem".valueOf() && !enableGems;
        return !isGem && game.mining.canMineOre(action) && !action.isRespawning && action.currentHP > 0;
    });

    // 打印信息：有效的挖矿动作
    logVersionInfo("Valid mining actions to check:", validActions);
    // 打印信息：当前的挖矿动作
    logVersionInfo("Current mining action:", game.mining.selectedRock ?? "NONE");
    // 打印信息：开始检查
    logVersionInfo("Starting check");
    // 打印信息：递归标志
    logVersionInfo("Recur flag is:", isRecurFlagSet(flags));
    // 打印信息：非点击标志
    logVersionInfo("Non click flag is:", isNonClickFlagSet(flags));

    // 如果设置了递归标志，则打印信息并停止
    if (isRecurFlagSet(flags)) {
        logVersionInfo("Recur flag was set, stopping");
    } else {
        // 遍历有效的动作
        for (const action of validActions) {
            logVersionInfo("Checking rock action:", action);

            // 如果是 respawnRock 动作且与当前选中的岩石 ID 相同，则跳出循环
            if (actionId === game.mining.selectedRock?.id && action === "respawnRock") {
                break;
            }

            // 如果非点击标志未设置且选中的岩石 ID 与当前动作相同，则跳出循环
            if (!isNonClickFlagSet(flags) && selectedRock?.id === game.mining.selectedRock?.id) {
                logVersionInfo("Non click flag was not set, stopping");
                break;
            }

            // 如果当前动作 ID 不等于选中的岩石 ID 且当前选中的岩石 ID 不等于当前动作 ID，则点击该岩石
            if (action.id !== selectedRock?.id && game.mining.selectedRock?.id !== action.id) {
                logVersionInfo("Clicking on rock", action);
                game.mining.onRockClick(action, true, "onRockClick" !== actionId);
                break;
            }
        }

        // 打印信息：未点击任何岩石
        logVersionInfo("Didn't click on any rock");
    }
};

// 对游戏函数进行补丁的函数
const patchGameFunctions = (character, pluginUtils) => {
    const { getConfig } = pluginUtils;

    // 打印信息：打补丁前的配置
    logVersionInfo("Patching game functions");
    logVersionInfo("Config before patching:", getConfig());

    // 在 respawnRock 后执行的函数
    pluginUtils.patch(Mining, "respawnRock").after((...args) => {
        handleMiningAction(character, getConfig, "respawnRock", undefined, args);
    });

    // 在 startRespawningRock 后执行的函数
    pluginUtils.patch(Mining, "startRespawningRock").after((...args) => {
        handleMiningAction(character, getConfig, "startRespawningRock", undefined, args);
    });

    // 在 onRockClick 前执行的函数
    pluginUtils.patch(Mining, "onRockClick").before((rock, ...args) => {
        handleMiningAction(character, getConfig, "onRockClick", rock, args);
    });

    // 在 renderRockUnlock 前执行的函数
    pluginUtils.patch(Mining, "renderRockUnlock").before(() => {
        const handleRockUnlock = (character) => {
            if (!character.settings.section(generalSection).get(`${pluginKey}-enable`)) {
                return void $("#priority-miner-holder").attr("hidden", true);
            }

            $("#priority-miner-holder").attr("hidden", false);

            const spoilersEnabled = character.settings.section(generalSection).get(`${pluginKey}-enable-spoilers`);
            const gemsEnabled = character.settings.section(generalSection).get(`${pluginKey}-enable-gems`);

            [...$("#priority-miner-prioritysettings-custom").children()].forEach(element => {
                const actionId = $(element).data("action");
                const action = game.mining.actions.getObjectByID(actionId) || { name: "No action data", level: 0, type: "Not a gem" };

                $(element).attr("hidden", action.level > game.mining.level);
                spoilersEnabled && $(element).attr("hidden", false);
                action.type.valueOf() !== "Gem" || gemsEnabled || $(element).attr("hidden", true);
            });
        };

        handleRockUnlock(character);
    });
};

// 配置界面的初始化函数
const createPluginInterface = (options) => {
    const { model, actions, priorityTypes, handlers } = options;
    const { ItemImageButton, PriorityTypeSelector } = options;

    // 打印信息：加载中
    logVersionInfo("Loading...");
    // 打印信息：以调试模式运行
    logVersionInfo("Running in debug mode");

    // 初始化配置存储对象
    let store = ui.createStore({
        enabled: false,
        selected: "custom",
        priority: actions.map(action => action.id),
        version: 1,
        level: game.mining.level
    });

    // 保存配置的函数
    const saveConfig = () => {
        logVersionInfo("Saving config");
        character.characterStorage.setItem("autoMineConfig", store);
    };

    // 更新优先级列表的函数
    const updatePriorityList = (section) => {
        if (store.priority.length === 0) return;

        const sortedActions = store.priority.map(actionId => game.mining.actions.getObjectByID(actionId));
        const sectionElement = $(`#priority-miner-prioritysettings-${section}`);
        const childElements = [...sectionElement.children()];

        const getOrder = action => {
            const index = sortedActions.indexOf(action);
            return index === -1 ? Infinity : index;
        };

        const sortedChildren = childElements.sort((a, b) => getOrder(game.mining.actions.getObjectByID($(a).data("action"))) - getOrder(game.mining.actions.getObjectByID($(b).data("action"))));

        sectionElement.append(sortedChildren);
    };

    // 处理启用状态变更的函数
    const handleEnableChange = event => {
        store.enabled = event.currentTarget.checked;
        saveConfig();
    };

    // 处理优先级重置的函数
    const handlePriorityReset = () => {
        const actionIds = actions.map(action => action.id);
        store.priority = actionIds;
        updatePriorityList("custom");
        saveConfig();
    };

    // 获取配置的函数
    const getConfig = () => character.characterStorage.getItem("autoMineConfig");

    // 更新配置中的等级的函数
    const updateLevelInConfig = newLevel => {
        store.level = newLevel;
        saveConfig();
    };

    // 在角色加载时执行
    character.onCharacterLoaded(() => {
        // 合并存储的配置
        const storedConfig = character.characterStorage.getItem("autoMineConfig");

        if (storedConfig) {
            storedConfig.version === 1 ? (logVersionInfo("Merging stored config"), store = { ...store, ...storedConfig }) : logVersionInfo("Config version difference, using default config.");
        } else {
            logVersionInfo("No stored config to load, using default.");
        }

        saveConfig();
        patchGameFunctions(character, { getConfig, patch: character.ezPatched });
    });

    // 在界面准备就绪时执行
    character.onInterfaceReady(() => {
        const interfaceHolder = document.createElement("div");
        interfaceHolder.id = "priority-miner-holder";
        interfaceHolder.className = "row row-deck";

        const eventHandlers = { enableChanged: handleEnableChange, prioResetHandler: handlePriorityReset };

        $("#mining-ores-container").before(interfaceHolder);

        ui.create(createPluginInterface({ model: store, actions: actions, priorityTypes: Object.values(priorityTypes), handlers: eventHandlers }), document.getElementById("priority-miner-holder"));

        Sortable.create(document.getElementById("priority-miner-prioritysettings-custom"), {
            animation: 150,
            onEnd: () => {
                const newPriorityOrder = [...$(`#priority-miner-prioritysettings-custom .priority-miner-selector`)]
                    .map(element => game.mining.actions.getObjectByID($(element).data("action")))
                    .map(action => action.id);

                store.priority = newPriorityOrder;
                saveConfig();
            }
        });

        tippy("#priority-miner [data-tippy-content]", { animation: false, allowHTML: true });

        updatePriorityList("custom");
        updatePriorityList("mastery");

        logVersionInfo("Finished loading!");
    });
}

var setupFunction = miningConfig.create;
export { setupFunction as setup };
