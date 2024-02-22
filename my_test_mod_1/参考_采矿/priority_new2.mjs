// 定义帮助函数对象，用于操作属性和检查属性是否存在
var helper = {
    defineProperty: (target, source) => {
        for (var propName in source)
            helper.hasProperty(source, propName) &&
            !helper.hasProperty(target, propName) &&
            Object.defineProperty(target, propName, {
                enumerable: !0,
                get: source[propName]
            })
    },
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

const alwaysFalse = (...args) => false;

const pluginName = "priority-miner";
const sectionName = "General";

const adjustSelectedRock = (config, getPriority, action, selectedRock = undefined, flags) => {
    if (!game.mining.isActive) return;

    const recurFlag = flags.length > 0 && !0 === flags[0];
    const nonClickFlag = flags.length > 1 && !0 === flags[1];

    const enablePriority = config.settings.section(sectionName).get(`${pluginName}-enable`);
    const enableGems = config.settings.section(sectionName).get(`${pluginName}-enable-gems`);

    if (!enablePriority) return;

    alwaysFalse("adjustSelectedRock called with", action);
    selectedRock && alwaysFalse("There is a selected rock:", selectedRock);
    flags.length > 0 && alwaysFalse("Extra args:", flags);

    const currentConfig = getPriority();
    alwaysFalse("Current config:", currentConfig);

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

    if (recurFlag) alwaysFalse("Recur flag was set, stopping");
    else {
        for (const rockAction of validActions) {
            if (alwaysFalse("Checking rock action:", rockAction), "respawnRock" === action && rockAction.id === game.mining.selectedRock?.id) break;

            if (!nonClickFlag && selectedRock?.id === game.mining.selectedRock?.id) {
                alwaysFalse("Non click flag was not set, stopping");
                break;
            }

            if (rockAction.id !== selectedRock?.id && game.mining.selectedRock?.id !== rockAction.id) {
                alwaysFalse("Clicking on rock", rockAction);
                game.mining.onRockClick(rockAction, !0, "onRockClick" !== action);
                break;
            }
        }

        alwaysFalse("Didn't click on any rock");
    }
}

const patchGameFunctions = (ctx, getConfig) => {
    const i = (...args) => logVersionInfo("Patching game functions");
    const alwaysFalse = (...args) => alwaysFalse("Config before patching:", getConfig());

    ctx.patch(Mining, "respawnRock").after((...args) => {
        adjustSelectedRock(ctx, getConfig, "respawnRock", undefined, args);
    });

    ctx.patch(Mining, "startRespawningRock").after((...args) => {
        adjustSelectedRock(ctx, getConfig, "startRespawningRock", undefined, args);
    });

    ctx.patch(Mining, "onRockClick").before((t, ...args) => {
        adjustSelectedRock(ctx, getConfig, "onRockClick", t, args);
    });

    ctx.patch(Mining, "renderRockUnlock").before(() => {
        (ctx => {
            if (!ctx.settings.section(sectionName).get(`${pluginName}-enable`)) return void $("#priority-miner-holder").attr("hidden", !0);

            $("#priority-miner-holder").attr("hidden", !1);

            const enableSpoilers = ctx.settings.section(sectionName).get(`${pluginName}-enable-spoilers`);
            const enableGems = ctx.settings.section(sectionName).get(`${pluginName}-enable-gems`);

            [...$("#priority-miner-prioritysettings-custom").children()].forEach((element => {
                const rockAction = game.mining.actions.getObjectByID($(element).data("action")) ?? {
                    name: "No action data",
                    level: 0,
                    type: "Not a gem"
                };

                $(element).attr("hidden", rockAction.level > game.mining.level);
                enableSpoilers && $(element).attr("hidden", !1);

                if ("Gem" !== rockAction.type.valueOf() || enableGems) {
                    $(element).attr("hidden", !0);
                }
            }));
        })(ctx);
    });
}

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

const createItemImageButton = ({
    actions: actions,
    level: level
}) => ({
    $template: "#item-img-button",
    actions: actions,
    level: level
});

const createPriorityTypeSelector = ({
    priorityTypes: priorityTypes,
    selected: selected
}) => ({
    $template: "#priority-type-selector-template",
    priorityTypes: priorityTypes,
    selected: selected
});

const createPriorityMinerSection = ({
    model: model,
    actions: actions,
    priorityTypes: priorityTypes,
    handlers: handlers
}) => ({
    $template: "#priority-miner-section",
    ItemImageButton: createItemImageButton,
    PriorityTypeSelector: createPriorityTypeSelector,
    model: model,
    actions: actions,
    priorityTypes: priorityTypes,
    handlers: handlers
});

const pluginVersion = 1;

function priority(ctx) {
    logVersionInfo("Loading...");
    alwaysFalse("Running in debug mode");

    addSettings(ctx);

    const allActions = game.mining.actions.allObjects.sort((a, b) => b.level - a.level);
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

    let store = ui.createStore({
        enabled: !1,
        selected: "custom",
        priority: allActions.map((a => a.id)),
        version: pluginVersion,
        level: game.mining.level
    });

    const saveConfig = () => {
        alwaysFalse("Saving config");
        ctx.characterStorage.setItem("autoMineConfig", store);
    }

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

    const enableChangedHandler = (e) => {
        store.enabled = e.currentTarget.checked;
        saveConfig();
    }

    const prioResetHandler = () => {
        const newPriority = allActions.map((a => a.id));
        store.priority = newPriority;
        sortPriority("custom");
        saveConfig();
    }

    const getConfig = () => ctx.characterStorage.getItem("autoMineConfig");
    const updateLevelInConfig = (level) => {
        store.level = level;
        saveConfig();
    }

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

    ctx.onInterfaceReady(() => {
        const holder = document.createElement("div");
        holder.id = "priority-miner-holder";
        holder.className = "row row-deck";

        const handlers = {
            enableChanged: enableChangedHandler,
            prioResetHandler: prioResetHandler
        };

        $("#mining-ores-container").before(holder);

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

        tippy("#priority-miner [data-tippy-content]", {
            animation: !1,
            allowHTML: !0
        });

        sortPriority("custom");
        sortPriority("mastery");

        logVersionInfo("Finished loading!");
    });
}

var exportSetup = miningConfig.create;
export {
    exportSetup as setup
};
