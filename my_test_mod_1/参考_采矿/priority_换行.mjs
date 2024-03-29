// 定义帮助函数对象，用于操作属性和检查属性是否存在
var e = {
    d: (t, i) => {
        for (var n in i)
            e.o(i, n) &&
            !e.o(t, n) &&
            Object.defineProperty(t, n, {
                enumerable: !0,
                get: i[n]
            })
    },
    o: (e, t) => Object.prototype.hasOwnProperty.call(e, t)
},
// 初始化矿业配置对象
t = {};
// 如果不存在，则定义 create 函数
e.d(t, {
c: () => p
});
// 打印版本信息的工具函数
const i = (...e) => ((e, ...t) => {
    console.log(`[Priority Miner v${e}]`, ...t)
})("1.1.0", ...e),
n = (...e) => false,
o = "priority-miner",
r = "General",
a = (e, t, i, a = undefined, c) => {
    if (!game.mining.isActive) return;
    const s = c.length > 0 && !0 === c[0],
        l = c.length > 1 && !0 === c[1],
        g = e.settings.section(r).get(`${o}-enable`),
        d = e.settings.section(r).get(`${o}-enable-gems`);
    if (!g) return;
    n("adjustSelectedRock called with", i), a && n("There is a selected rock:", a), c.length > 0 && n("Extra args:", c);
    const m = t();
    n("Current config:", m);
    const p = m.priority.map((e => game.mining.actions.getObjectByID(e))),
        y = p.filter((e => {
            return !((t = e).type.valueOf() === "Gem".valueOf() && !d) && game.mining.canMineOre(t) && !t.isRespawning && t.currentHP > 0;
            var t
        }));
    if (n("Valid mining actions to check:", y), n("Current mining action:", game.mining.selectedRock ?? "NONE"), n("Starting check"), n("Recur flag is:", s), n("Non click flag is:", l), s) n("Recur flag was set, stopping");
    else {
        for (const e of y) {
            if (n("Checking rock action:", e), "respawnRock" === i && e.id === game.mining.selectedRock?.id) break;
            if (!l && a?.id === game.mining.selectedRock?.id) {
                n("Non click flag was not set, stopping");
                break
            }
            if (e.id !== a?.id && game.mining.selectedRock?.id !== e.id) {
                n("Clicking on rock", e), game.mining.onRockClick(e, !0, "onRockClick" !== i);
                break
            }
        }
        n("Didn't click on any rock")
    }
},
c = (e, t) => {
    const {
        getConfig: c
    } = t;
    i("Patching game functions"), n("Config before patching:", c()), e.patch(Mining, "respawnRock").after(((...t) => {
        a(e, c, "respawnRock", void 0, t)
    })), e.patch(Mining, "startRespawningRock").after(((...t) => {
        a(e, c, "startRespawningRock", void 0, t)
    })), e.patch(Mining, "onRockClick").before(((t, ...i) => {
        a(e, c, "onRockClick", t, i)
    })), e.patch(Mining, "renderRockUnlock").before((() => {
        (e => {
            if (!e.settings.section(r).get(`${o}-enable`)) return void $("#priority-miner-holder").attr("hidden", !0);
            $("#priority-miner-holder").attr("hidden", !1);
            const t = e.settings.section(r).get(`${o}-enable-spoilers`),
                i = e.settings.section(r).get(`${o}-enable-gems`);
            [...$("#priority-miner-prioritysettings-custom").children()].forEach((e => {
                const n = game.mining.actions.getObjectByID($(e).data("action")) ?? {
                    name: "No action data",
                    level: 0,
                    type: "Not a gem"
                };
                $(e).attr("hidden", n.level > game.mining.level), t && $(e).attr("hidden", !1), "Gem" !== n.type.valueOf() || i || $(e).attr("hidden", !0)
            }))
        })(e)
    }))
},
s = e => {
    e.settings.section(r).add({
        type: "switch",
        name: `${o}-enable`,
        label: "Enable Priority Miner",
        default: !0
    }), e.settings.section(r).add({
        type: "switch",
        name: `${o}-enable-gems`,
        label: "Enable mining gem veins",
        default: !1
    }), e.settings.section(r).add({
        type: "switch",
        name: `${o}-enable-spoilers`,
        label: "Display all rocks without level requirements (spoilers). Gems will still be hidden unless gem mining is enabled.",
        default: !1
    })
},
l = ({
    actions: e,
    level: t
}) => ({
    $template: "#item-img-button",
    actions: e,
    level: t
}),
g = ({
    priorityTypes: e,
    selected: t
}) => ({
    $template: "#priority-type-selector-template",
    priorityTypes: e,
    selected: t
}),
d = ({
    model: e,
    actions: t,
    priorityTypes: i,
    handlers: n
}) => ({
    $template: "#priority-miner-section",
    ItemImageButton: l,
    PriorityTypeSelector: g,
    model: e,
    actions: t,
    priorityTypes: i,
    handlers: n
}),
m = 1;

function p(e) {
i("Loading..."), n("Running in debug mode"), s(e);
const t = game.mining.actions.allObjects.sort(((e, t) => t.level - e.level)),
    o = {
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
let r = ui.createStore({
    enabled: !1,
    selected: "custom",
    priority: t.map((e => e.id)),
    version: m,
    level: game.mining.level
});
const a = () => {
        n("Saving config"), e.characterStorage.setItem("autoMineConfig", r)
    },
    l = e => {
        if (0 === r.priority.length) return;
        const t = r.priority.map((e => game.mining.actions.getObjectByID(e))),
            i = $(`#priority-miner-prioritysettings-${e}`),
            n = [...i.children()],
            o = e => {
                const i = t.indexOf(e);
                return -1 === i ? 1 / 0 : i
            },
            a = n.sort(((e, t) => o(game.mining.actions.getObjectByID($(e).data("action"))) - o(game.mining.actions.getObjectByID($(t).data("action")))));
        i.append(a)
    },
    g = e => {
        r.enabled = e.currentTarget.checked, a()
    },
    p = () => {
        const e = t.map((e => e.id));
        r.priority = e, l("custom"), a()
    },
    y = () => e.characterStorage.getItem("autoMineConfig"),
    u = e => {
        r.level = e, a()
    };
e.onCharacterLoaded((() => {
    (() => {
        const t = e.characterStorage.getItem("autoMineConfig");
        t ? t.version === m ? (i("Merging stored config"), r = {
            ...r,
            ...t
        }) : i("Config version difference, using default config.") : n("No stored config to load, using default.")
    })(), a(), c(e, {
        getConfig: y,
        updateLevelInConfig: u
    })
})), e.onInterfaceReady((() => {
    const e = document.createElement("div");
    e.id = "priority-miner-holder", e.className = "row row-deck";
    const n = {
        enableChanged: g,
        prioResetHandler: p
    };
    $("#mining-ores-container").before(e), ui.create(d({
        model: r,
        actions: t,
        priorityTypes: Object.values(o),
        handlers: n
    }), document.getElementById("priority-miner-holder")), (() => {
        const e = "priority-miner-priority";
        Sortable.create(document.getElementById(`${e}settings-custom`), {
            animation: 150,
            onEnd: () => {
                const t = [...$(`#${e}settings-custom .${e}-selector`)].map((e => game.mining.actions.getObjectByID($(e).data("action")))).map((e => e.id));
                r.priority = t, a()
            }
        })
    })(), tippy("#priority-miner [data-tippy-content]", {
        animation: !1,
        allowHTML: !0
    }), l("custom"), l("mastery"), i("Finished loading!")
}))
}
var y = t.c;
export {
y as setup
};