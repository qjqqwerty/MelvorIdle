// 定义帮助函数对象，用于操作属性和检查属性是否存在
var helper = {
    // 定义属性，如果目标对象中没有该属性，则添加
    defineProperty: (target, source) => {
        for (var propName in source)
            helper.hasProperty(source, propName) &&
            !helper.hasProperty(target, propName) &&
            Object.defineProperty(target, propName, {
                enumerable: !0,
                get: source[propName]
            })
    },
    // 检查对象是否有指定属性
    hasProperty: (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop)
};

// 初始化矿业配置对象
var miningConfig = {};

// 如果不存在，则定义 create 函数
helper.defineProperty(miningConfig, {
    create: () => priority
});

// 打印版本信息的工具函数
const logVersionInfo = (...args) => ((args, ...rest) => {
    console.log(`[Priority Miner v${args}]`, ...rest);
})("1.1.0", ...args);

// 用于始终返回 false 的函数，用于调试目的
const alwaysFalse = (...args) => false;

// 插件名称
const pluginName = "priority-miner";

// 配置部分的名称
const sectionName = "General";

// 优先级调整函数，根据配置调整矿石的优先级
const adjustSelectedRock = (config, getPriority, action, selectedRock = undefined, flags) => { //G:27 a = (e, t, i, a = undefined, c) => {
    if (!game.mining.isActive) return;

    // 标志位
    const recurFlag = flags.length > 0 && !0 === flags[0];
    const nonClickFlag = flags.length > 1 && !0 === flags[1];

    // 读取配置信息
    const enablePriority = config.settings.section(sectionName).get(`${pluginName}-enable`);
    const enableGems = config.settings.section(sectionName).get(`${pluginName}-enable-gems`);

    if (!enablePriority) return;

    // 调试信息输出
    alwaysFalse("adjustSelectedRock called with", action);
    selectedRock && alwaysFalse("There is a selected rock:", selectedRock);
    flags.length > 0 && alwaysFalse("Extra args:", flags);

    const currentConfig = getPriority();
    alwaysFalse("Current config:", currentConfig);

    // 获取矿石对象
    const priorityActions = currentConfig.priority.map((id => game.mining.actions.getObjectByID(id)));
    const validActions = priorityActions.filter((action => {
        return !((rock = action).type.valueOf() === "Gem".valueOf() && !enableGems) &&
            game.mining.canMineOre(rock) &&
            !rock.isRespawning &&
            rock.currentHP > 0;
        var rock;
    }));

    alwaysFalse("Valid mining actions to check:", validActions);
    alwaysFalse("Current mining action:", game.mining.selectedRock ?? "NONE");
    alwaysFalse("Starting check");
    alwaysFalse("Recur flag is:", recurFlag);
    alwaysFalse("Non click flag is:", nonClickFlag);

    // 递归标志检查
    if (recurFlag) alwaysFalse("Recur flag was set, stopping");
    else {
        // 遍历有效的矿石动作
        for (const rockAction of validActions) {
            alwaysFalse("Checking rock action:", rockAction);

            // "respawnRock" 动作特殊处理，不进行点击
            if ("respawnRock" === action && rockAction.id === game.mining.selectedRock?.id) break;

            // 非点击标志检查
            if (!nonClickFlag && selectedRock?.id === game.mining.selectedRock?.id) {
                alwaysFalse("Non click flag was not set, stopping");
                break;
            }

            // 非当前选中的矿石则进行点击
            if (rockAction.id !== selectedRock?.id && game.mining.selectedRock?.id !== rockAction.id) {
                alwaysFalse("Clicking on rock", rockAction);
                game.mining.onRockClick(rockAction, !0, "onRockClick" !== action);
                break;
            }
        }

        alwaysFalse("Didn't click on any rock");
    }
}

// 对游戏函数进行补丁
const patchGameFunctions = (ctx, getConfig) => { //G:58 c = (e, t) => {
    // 打印版本信息
    const logPatchInfo = (...args) => logVersionInfo("Patching game functions");

    // 调试信息输出
    const alwaysFalse = (...args) => alwaysFalse("Config before patching:", getConfig());

    // 补丁 respawnRock 函数
    ctx.patch(Mining, "respawnRock").after((...args) => {
        adjustSelectedRock(ctx, getConfig, "respawnRock", undefined, args);
    });

    // 补丁 startRespawningRock 函数
    ctx.patch(Mining, "startRespawningRock").after((...args) => {
        adjustSelectedRock(ctx, getConfig, "startRespawningRock", undefined, args);
    });

    // 补丁 onRockClick 函数
    ctx.patch(Mining, "onRockClick").before((t, ...args) => {
        adjustSelectedRock(ctx, getConfig, "onRockClick", t, args);
    });

    // 补丁 renderRockUnlock 函数
    ctx.patch(Mining, "renderRockUnlock").before(() => {
        (ctx => {
            if (!ctx.settings.section(sectionName).get(`${pluginName}-enable`)) return void $("#priority-miner-holder").attr("hidden", !0);

            $("#priority-miner-holder").attr("hidden", !1);

            const enableSpoilers = ctx.settings.section(sectionName).get(`${pluginName}-enable-spoilers`);
            const enableGems = ctx.settings.section(sectionName).get(`${pluginName}-enable-gems`);

            // 遍历配置的矿石和宝石元素
            [...$("#priority-miner-prioritysettings-custom").children()].forEach((element => {
                // 获取矿石对象
                const rockAction = game.mining.actions.getObjectByID($(element).data("action")) ?? {
                    name: "No action data",
                    level: 0,
                    type: "Not a gem"
                };

                // 根据等级和配置进行显示隐藏
                $(element).attr("hidden", rockAction.level > game.mining.level);
                enableSpoilers && $(element).attr("hidden", !1);

                // 宝石的显示隐藏根据配置
                if ("Gem" !== rockAction.type.valueOf() || enableGems) {
                    $(element).attr("hidden", !0);
                }
            }));
        })(ctx);
    });
}

// 添加插件设置
const addSettings = (ctx) => {
    ctx.settings.section(sectionName).add({
        type: "switch",
        name: `${pluginName}-enable`,
        label: "Enable Priority Miner",
        default: !0
    });

    ctx.settings.section(sectionName).add({
        type: "switch",
        name: `${pluginName}-enable-gems`,
        label: "Enable mining gem veins",
        default: !1
    });

    ctx.settings.section(sectionName).add({
        type: "switch",
        name: `${pluginName}-enable-spoilers`,
        label: "Display all rocks without level requirements (spoilers). Gems will still be hidden unless gem mining is enabled.",
        default: !1
    });
}

// 定义 UI 模板
const createItemImageButton = ({ actions, level }) => ({
    $template: "#item-img-button",
    actions: actions,
    level: level
});

const createPriorityTypeSelector = ({ priorityTypes, selected }) => ({
    $template: "#priority-type-selector-template",
    priorityTypes: priorityTypes,
    selected: selected
});

const createPriorityMinerSection = ({ model, actions, priorityTypes, handlers }) => ({
    $template: "#priority-miner-section",
    ItemImageButton: createItemImageButton,
    PriorityTypeSelector: createPriorityTypeSelector,
    model: model,
    actions: actions,
    priorityTypes: priorityTypes,
    handlers: handlers
});

const pluginVersion = 1;

// 插件入口函数
function priority(ctx) {
    logVersionInfo("Loading...");
    alwaysFalse("Running in debug mode");

    // 添加插件设置
    addSettings(ctx);

    // 获取所有矿石对象并根据等级进行排序
    const allActions = game.mining.actions.allObjects.sort((a, b) => b.level - a.level);

    // 定义优先级类型对象
    const priorityTypes = {
        custom: {
            id: "custom",
            description: "Custom priority",
            tooltip: "Drag rocks/gems to change their priority"
        },
        mastery: {
            id: "mastery",
            description: "Highest mastery",
            tooltip: "Rocks with maxed mastery are excluded<br>Click rocks to disable/enable them"
        }
    };

    // 创建 UI 数据存储对象
    let store = ui.createStore({
        enabled: !1,
        selected: "custom",
        priority: allActions.map((a => a.id)),
        version: pluginVersion,
        level: game.mining.level
    });

    // 保存配置信息的函数
    const saveConfig = () => {
        alwaysFalse("Saving config");
        ctx.characterStorage.setItem("autoMineConfig", store);
    }

    // 优先级排序的函数
    const sortPriority = (section) => {
        if (0 === store.priority.length) return;

        const rocks = store.priority.map((id => game.mining.actions.getObjectByID(id)));
        const sectionElement = $(`#priority-miner-prioritysettings-${section}`);
        const children = [...sectionElement.children()];

        const order = (rock) => {
            const index = rocks.indexOf(rock);
            return -1 === index ? 1 / 0 : index;
        }

        const sortedChildren = children.sort((a, b) =>
            order(game.mining.actions.getObjectByID($(a).data("action"))) -
            order(game.mining.actions.getObjectByID($(b).data("action")))
        );

        sectionElement.append(sortedChildren);
    }

    // 复选框变更的处理函数
    const enableChangedHandler = (e) => {
        store.enabled = e.currentTarget.checked;
        saveConfig();
    }

    // 优先级重置的处理函数
    const prioResetHandler = () => {
        const newPriority = allActions.map((a => a.id));
        store.priority = newPriority;
        sortPriority("custom");
        saveConfig();
    }

    // 获取配置信息的函数
    const getConfig = () => ctx.characterStorage.getItem("autoMineConfig");

    // 更新等级配置信息的函数
    const updateLevelInConfig = (level) => {
        store.level = level;
        saveConfig();
    }

    // 角色加载时执行的回调
    ctx.onCharacterLoaded(() => {
        (() => {
            const storedConfig = ctx.characterStorage.getItem("autoMineConfig");

            if (storedConfig) {
                storedConfig.version === pluginVersion ?
                    (logVersionInfo("Merging stored config"), store = { ...store, ...storedConfig }) :
                    logVersionInfo("Config version difference, using default config.");
            } else {
                alwaysFalse("No stored config to load, using default.");
            }
        })();

        saveConfig();
        patchGameFunctions(ctx, getConfig);
    });

    // 界面准备就绪时执行的回调
    ctx.onInterfaceReady(() => {
        const holder = document.createElement("div");
        holder.id = "priority-miner-holder";
        holder.className = "row row-deck";

        const handlers = {
            enableChanged: enableChangedHandler,
            prioResetHandler: prioResetHandler
        };

        $("#mining-ores-container").before(holder);

        // 创建优先级矿工部分的 UI
        ui.create(createPriorityMinerSection({
            model: store,
            actions: allActions,
            priorityTypes: Object.values(priorityTypes),
            handlers: handlers
        }), document.getElementById("priority-miner-holder"));

        (() => {
            const section = "priority-miner-priority";
            Sortable.create(document.getElementById(`${section}settings-custom`), {
                animation: 150,
                onEnd: () => {
                    const newPriority = [...$(`#${section}settings-custom .${section}-selector`)].map((a => game.mining.actions.getObjectByID($(a).data("action")))).map((a => a.id));
                    store.priority = newPriority;
                    saveConfig();
                }
            })
        })();

        // Tooltip 初始化
        tippy("#priority-miner [data-tippy-content]", {
            animation: !1,
            allowHTML: !0
        });

        sortPriority("custom");
        sortPriority("mastery");

        logVersionInfo("Finished loading!");
    });
}

// 导出 setup 函数
var exportSetup = miningConfig.create;
export {
    exportSetup as setup
};
