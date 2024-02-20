export function setup(ctx) {
    ctx.onCharacterSelectionLoaded(ctx => {
        // 调试日志
        const debugLog = (...msg) => {
            mod.api.SEMI.log(`${id} v4628`, ...msg);
        };

        // 脚本详情
        const id = 'auto-farm';
        const title = 'SEMI自动农场';

        // 地块状态
        const STATE_LOCKED = 0;
        const STATE_EMPTY = 1;
        const STATE_GROWING = 2;
        const STATE_GROWN = 3;
        const STATE_DEAD = 4;

        // 设置组
        const SETTING_COMPOST = ctx.settings.section('Compost');
        const SETTING_EQUIPMENT = ctx.settings.section('Auto Swap Equipment');

        // 种植优先级
        const priorityToConfig = (arr) => arr.map(action => action.id);
        const priorityFromConfig = (arr) => arr.map(actionID => getAction(actionID));
        const priorityTypes = {
            custom: {
                id: 'custom',
                description: '自定义优先级',
                tooltip: '拖动种子以更改其优先级'
            },
            mastery: {
                id: 'mastery',
                description: '最高精通',
                tooltip: '具有最大精通的种子将被排除<br>点击种子以禁用/启用它们',
            },
            replant: {
                id: 'replant',
                description: '重新种植',
                tooltip: '将地块锁定到其当前种子'
            },
            lowestQuantity: {
                id: 'lowestQuantity',
                description: '最低库存',
                tooltip: '在库存中数量最少的作物将被种植',
            }
        };

        let config = {
            disabledActions: {}
        };

        const PRIORITY_ARRAYS = {};
        const FARMING_CATEGORIES = game.farming.categories.allObjects;
        const FARMING_ACTIONS = {};
        const FARMING_PLOTS = {};
        FARMING_CATEGORIES.forEach(category => {
            FARMING_ACTIONS[category.id] = game.farming.actions.filter(action => action.category == category).sort((a, b) => b.level - a.level);
            FARMING_PLOTS[category.id] = game.farming.plots.filter(plot => plot.category == category).sort((a, b) => a.level - b.level);
            PRIORITY_ARRAYS[category.id] = [...FARMING_ACTIONS[category.id]];

            config[category.id] = {
                enabled: false,
                priorityType: priorityTypes.custom.id,
                priority: priorityToConfig(PRIORITY_ARRAYS[category.id]),
                lockedPlots: {},
                reservedPlots: {},
            };
        });

        // 物品
        const shopCompost = game.shop.purchases.getObjectByID('melvorD:Compost');
        const itemCompost = game.items.getObjectByID('melvorD:Compost');
        const itemWeirdGloop = game.items.getObjectByID('melvorD:Weird_Gloop');

        // 实用工具
        const getAction = (id) => game.farming.actions.getObjectByID(id);
        const getMasteryLevel = (action) => game.farming.getMasteryLevel(action);
        const getMasteryXP = (action) => game.farming.getMasteryXP(action);
        const poolActive = (level) => game.farming.isPoolTierActive(level);

        const bankQty = (item) => game.bank.getQty(item);
        const bankHasRoom = (item) => game.bank.occupiedSlots < game.bank.maximumSlots || item == null || bankQty(item) > 0;

        const getProduct = (action) => action.product;
        const canAfford = (action) => bankQty(action.seedCost.item) >= action.seedCost.quantity;
        const canCropDie = (action) => !(getMasteryLevel(action) >= 50 || poolActive(1));

        // 装备
        const getGearSlot = (slot) => game.combat.player.equipment.slots[slot];
        const canEquipGearItem = (item) => game.checkRequirements(item.equipRequirements, false);
        const equipGearItem = (slot, item, qty = 1000000) => game.combat.player.equipItem(item, game.combat.player.selectedEquipmentSet, slot, qty);
        const isItemEquipped = (item) => game.combat.player.equipment.getSlotOfItem(item) != 'None';
        const gearSlots = Object.keys(game.combat.player.equipment.slots);

        const gearPriority = {};
        const gearPriorityIDs = {
            'Weapon': ['melvorD:Bobs_Rake'],
            'Ring': ['melvorD:Aorpheats_Signet_Ring'],
            'Gloves': ['melvorF:Bobs_Gloves'],
            'Cape': [
                'melvorTotH:Superior_Max_Skillcape',
                'melvorTotH:Superior_Farming_Skillcape',
                'melvorF:Cape_of_Completion',
                'melvorF:Max_Skillcape',
                'melvorD:Farming_Skillcape'
            ],
            'Consumable': ['melvorF:Seed_Pouch_II', 'melvorF:Seed_Pouch']
        };
        gearSlots.forEach(slot => { // 将ID转换为物品
            if (gearPriorityIDs[slot]) {
                gearPriority[slot] = [];
                gearPriorityIDs[slot].forEach(itemID => {
                    let item = game.items.getObjectByID(itemID);
                    if (item) {
                        gearPriority[slot].push(item);
                    }
                });
            }
        });
        //console.debug(`[${id}] Swap Gear:`, gearPriority);

        let gearSwapped = null;

        const canChangeEquipment = () => {
            debugLog(`canChangeEquipment:`, game.combat.player.manager.areaType == CombatAreaType.None, !game.isGolbinRaid);
            return game.combat.player.manager.areaType == CombatAreaType.None && !game.isGolbinRaid;
        }

        const equipmentSwap = () => {
            if (!canChangeEquipment())
                return;

            debugLog(`Doing Equipment Swap:`);
            const oldEquipment = mod.api.SEMI.equipmentSnapshot();

            gearSlots.forEach(slotKey => {
                let gear = gearPriority[slotKey];
                if (gear && SETTING_EQUIPMENT.get(`swap-${slotKey}`)) {
                    for (let i = 0; i < gear.length; i++) {
                        let toEquipItem = gear[i];
                        let gearSlot = getGearSlot(slotKey);

                        if (bankQty(toEquipItem) <= 0 || !canEquipGearItem(toEquipItem))
                            continue;

                        if (gearSlot.item != toEquipItem && !isItemEquipped(toEquipItem)) {
                            equipGearItem(slotKey, toEquipItem);
                            break;
                        }
                    }
                }
            });

            gearSwapped = mod.api.SEMI.equipmentDifferences(oldEquipment, mod.api.SEMI.equipmentSnapshot());

            debugLog(`Equipment Swap Complete:`, gearSwapped);
        }

        // 修复未注册的插槽
        if (!SETTING_EQUIPMENT.get('swap-Consumable')) {
            SETTING_EQUIPMENT.set('swap-Consumable', false);
        }

        // 兼容性检查
        const checkCompatibility = () => {
            if (mod.api.SEMI.version < 2091) {
                mod.api.SEMI.log(`[${id}] Error: Incompatible SEMI Version`);
                mod.api.SEMI.notify(`[${id}] Error: Incompatible SEMI Version`, `Please update to SEMI v2091 or newer.`);
                return false;
            }

            if (!game.farming)
                return false;

            return true;
        }

        // 特殊调用
        const callSpecial = (func, ...args) => {
            if (func) {
                try {
                    return func(...args);
                } catch (err) {
                    mod.api.SEMI.notify(`[${id}] Error`, `Error in special function:\n${err}`);
                    console.error(`[${id}] Special Function Error:`, err);
                }
            }
        }

        // 校验操作
        const validActions = (category, priority = true) => {
            let actions = priority ? priorityFromConfig(config[category].priority) : FARMING_ACTIONS[category];
            let validActions = actions.filter(action => action && !config.disabledActions[action.id] && (canAfford(action) || getMasteryLevel(action) >= 50));
            return validActions;
        }

        // 操作地块
        const plotAction = (category, plot, action) => {
            if (game.farming.isLocked(plot)) {
                return false;
            }

            if (config.lockedPlots[category][plot.id]) {
                return false;
            }

            if (config.reservedPlots[category][plot.id] && config.reservedPlots[category][plot.id] !== action.id) {
                return false;
            }

            if (!canAfford(action) && getMasteryLevel(action) < 50) {
                return false;
            }

            const canReplant = getMasteryLevel(action) >= 50 && canAfford(action);
            const canGrown = !canReplant && plot.plant && plot.plant.action == action.id;

            if (canReplant || canGrown) {
                return true;
            }

            return false;
        }

        // 取消锁定地块
        const unlockPlots = (category, excludePlots = []) => {
            let categoryPlots = FARMING_PLOTS[category];
            let plots = categoryPlots.filter(plot => !excludePlots.includes(plot.id));

            plots.forEach(plot => {
                if (config.lockedPlots[category][plot.id]) {
                    game.farming.unlock(plot);
                }
            });
        }

        // 检查交换装备
        const checkEquipmentSwap = () => {
            if (SETTING_EQUIPMENT.get('enabled')) {
                if (gearSwapped) {
                    // 已经交换过，需要恢复原始状态
                    mod.api.SEMI.equipmentApply(gearSwapped);
                    debugLog(`Restoring Equipment:`);
                    gearSwapped = null;
                } else {
                    // 检查是否需要交换装备
                    if (canChangeEquipment()) {
                        equipmentSwap();
                    }
                }
            }
        }

        // 更新种植优先级
        const updatePriority = (category) => {
            let currentPriority = config[category].priority;
            let newPriority = PRIORITY_ARRAYS[category].slice();

            currentPriority.forEach(actionID => {
                let action = getAction(actionID);
                if (action) {
                    let index = newPriority.findIndex(newAction => newAction.id == actionID);
                    if (index !== -1) {
                        newPriority.splice(index, 1);
                        newPriority.unshift(action);
                    }
                }
            });

            config[category].priority = priorityToConfig(newPriority);
        }

        // 注册更新处理
        mod.subscribe(['chatMessage', 'shopPurchase', 'itemUpdate', 'farmingAction', 'bankUpdate'], (event) => {
            if (!checkCompatibility())
                return;

            if (event.type === 'shopPurchase' && event.shopPurchase === shopCompost) {
                SETTING_COMPOST.set('limit', bankQty(itemCompost));
            }

            if (event.type === 'itemUpdate' && event.item === itemWeirdGloop) {
                SETTING_EQUIPMENT.set('enabled', game.items.total(itemWeirdGloop) > 0);
            }

            // 处理SEMI更新
            if (event.type === 'chatMessage' && event.message.startsWith('[SEMI]')) {
                if (event.message.includes('Welcome')) {
                    // 欢迎消息
                    mod.api.SEMI.log(`[${id}] Welcome to SEMI Auto Farm by Semitry!`);
                    mod.api.SEMI.log(`[${id}] If you have any issues or suggestions, please let me know.`);
                }

                if (event.message.includes('Ready')) {
                    // 准备就绪消息
                    mod.api.SEMI.log(`[${id}] SEMI is ready!`);
                    mod.api.SEMI.log(`[${id}] Check the settings and start auto farming.`);
                }

                if (event.message.includes('Running') || event.message.includes('Stopping')) {
                    // 运行状态变化消息
                    const running = event.message.includes('Running');
                    if (running) {
                        mod.api.SEMI.log(`[${id}] Auto farming is now running.`);
                        mod.api.SEMI.log(`[${id}] You can disable it anytime.`);
                    } else {
                        mod.api.SEMI.log(`[${id}] Auto farming has stopped.`);
                        mod.api.SEMI.log(`[${id}] You can start it again.`);
                    }
                }
            }

            // 处理银行更新
            if (event.type === 'bankUpdate' && !game.inBank) {
                // 更新种植优先级
                FARMING_CATEGORIES.forEach(category => updatePriority(category));

                // 更新土壤覆盖限制
                FARMING_ACTIONS['Soil']['Earthy Rich Soil'].config.maxItems = SETTING_COMPOST.get('limit');
            }

            // 处理种植操作
            if (event.type === 'farmingAction' && event.success && event.action && event.plot && event.category && validActions(event.category).includes(event.action)) {
                let category = event.category;
                let action = event.action;
                let plot = event.plot;

                // 种植优先级
                if (config[category].priorityType === priorityTypes.mastery.id) {
                    const maxMasteryLevel = Math.max(...validActions(category).map(action => getMasteryLevel(action)));
                    if (maxMasteryLevel > 0 && getMasteryLevel(action) < maxMasteryLevel) {
                        debugLog(`Priority Mastery Restriction:`, action.id, maxMasteryLevel);
                        unlockPlots(category, [plot.id]);
                        return;
                    }
                }

                // 土壤覆盖限制
                const soilConfig = FARMING_ACTIONS['Soil']['Earthy Rich Soil'].config;
                if (soilConfig.enabled && soilConfig.maxItems > 0 && getItems(itemCompost) >= soilConfig.maxItems) {
                    debugLog(`Soil Compost Limit Reached:`, soilConfig.maxItems);
                    unlockPlots(category, [plot.id]);
                    return;
                }

                // 检查种植操作
                if (plotAction(category, plot, action)) {
                    // 检查是否需要交换装备
                    checkEquipmentSwap();
                    // 种植
                    game.farming.plant(action, plot);
                }
            }
        });

        // 添加设置页
        mod.api.SEMI.registerSettings(id, () => (
            <div>
                <div className={style.section}>
                    <h1>General Settings</h1>
                    <p>General settings for SEMI Auto Farm.</p>
                    <div className={style.setting}>
                        <label>
                            <input type="checkbox" checked={SETTING_GLOBAL.get('enabled')} onChange={() => SETTING_GLOBAL.set('enabled', !SETTING_GLOBAL.get('enabled'))} />
                            Enable SEMI Auto Farm
                        </label>
                    </div>
                    <div className={style.setting}>
                        <label>
                            <input type="checkbox" checked={SETTING_GLOBAL.get('debug')} onChange={() => SETTING_GLOBAL.set('debug', !SETTING_GLOBAL.get('debug'))} />
                            Enable Debug Logging
                        </label>
                    </div>
                    <div className={style.setting}>
                        <label>
                            <input type="checkbox" checked={SETTING_GLOBAL.get('instantPlot')} onChange={() => SETTING_GLOBAL.set('instantPlot', !SETTING_GLOBAL.get('instantPlot'))} />
                            Instant Planting
                        </label>
                        <p>Instantly plant crops without waiting for the planting animation.</p>
                    </div>
                    <div className={style.setting}>
                        <label>
                            <input type="checkbox" checked={SETTING_GLOBAL.get('skipStaggering')} onChange={() => SETTING_GLOBAL.set('skipStaggering', !SETTING_GLOBAL.get('skipStaggering'))} />
                            Skip Staggering
                        </label>
                        <p>Skip the staggering effect when farming.</p>
                    </div>
                </div>

                <div className={style.section}>
                    <h1>Equipment Settings</h1>
                    <p>Settings related to equipment swapping.</p>
                    <div className={style.setting}>
                        <label>
                            <input type="checkbox" checked={SETTING_EQUIPMENT.get('enabled')} onChange={() => SETTING_EQUIPMENT.set('enabled', !SETTING_EQUIPMENT.get('enabled'))} />
                            Enable Equipment Swapping
                        </label>
                        <p>Automatically swap equipment before planting crops. Requires "Weird Gloop" in inventory.</p>
                    </div>
                    <div className={style.setting}>
                        <label>
                            <input type="checkbox" checked={SETTING_EQUIPMENT.get('swap-Consumable')} onChange={() => SETTING_EQUIPMENT.set('swap-Consumable', !SETTING_EQUIPMENT.get('swap-Consumable'))} />
                            Swap Consumable (Fertilizer)
                        </label>
                        <p>Swap consumable item (Fertilizer) along with equipment.</p>
                    </div>
                </div>

                <div className={style.section}>
                    <h1>Farming Settings</h1>
                    <p>Settings for each farming category.</p>
                    {FARMING_CATEGORIES.map(category => (
                        <div key={category} className={style.category}>
                            <h2>{category}</h2>
                            <div className={style.setting}>
                                <label>
                                    <input type="checkbox" checked={config[category].enabled} onChange={() => config[category].enabled = !config[category].enabled} />
                                    Enable {category} Farming
                                </label>
                            </div>
                            <div className={style.setting}>
                                <label>
                                    Priority Type:
                                    <select value={config[category].priorityType} onChange={(e) => config[category].priorityType = e.target.value}>
                                        <option value={priorityTypes.action.id}>Action Order</option>
                                        <option value={priorityTypes.mastery.id}>Mastery Level</option>
                                    </select>
                                </label>
                            </div>
                            <div className={style.setting}>
                                <label>
                                    Priority Order:
                                    <select multiple={true} value={config[category].priority} onChange={(e) => config[category].priority = Array.from(e.target.selectedOptions, option => option.value)}>
                                        {PRIORITY_ARRAYS[category].map(action => (
                                            <option key={action.id} value={action.id}>{action.name}</option>
                                        ))}
                                    </select>
                                </label>
                            </div>
                            <div className={style.setting}>
                                <label>
                                    <input type="checkbox" checked={config[category].skipLocked} onChange={() => config[category].skipLocked = !config[category].skipLocked} />
                                    Skip Locked Plots
                                </label>
                            </div>
                            <div className={style.setting}>
                                <label>
                                    <input type="checkbox" checked={config[category].skipReserved} onChange={() => config[category].skipReserved = !config[category].skipReserved} />
                                    Skip Reserved Plots
                                </label>
                            </div>
                            <div className={style.setting}>
                                <label>
                                    Reserve Action:
                                    <select value={config.reservedPlots[category]} onChange={(e) => config.reservedPlots[category] = e.target.value}>
                                        <option value="">None</option>
                                        {FARMING_ACTIONS[category].map(action => (
                                            <option key={action.id} value={action.id}>{action.name}</option>
                                        ))}
                                    </select>
                                </label>
                            </div>
                        </div>
                    ))}
                </div>

                <div className={style.section}>
                    <h1>Compost Settings</h1>
                    <p>Settings related to compost usage.</p>
                    <div className={style.setting}>
                        <label>
                            <input type="checkbox" checked={SETTING_COMPOST.get('enabled')} onChange={() => SETTING_COMPOST.set('enabled', !SETTING_COMPOST.get('enabled'))} />
                            Enable Compost Usage
                        </label>
                        <p>Automatically buy and use compost when farming.</p>
                    </div>
                    <div className={style.setting}>
                        <label>
                            Limit Compost:
                            <input type="number" value={SETTING_COMPOST.get('limit')} onChange={(e) => SETTING_COMPOST.set('limit', parseInt(e.target.value) || 0)} />
                        </label>
                        <p>Limit the number of composts to buy and use. Set to 0 for no limit.</p>
                    </div>
                    <div className={style.setting}>
                        <label>
                            Max Compost Price:
                            <input type="number" value={SETTING_COMPOST.get('maxPrice')} onChange={(e) => SETTING_COMPOST.set('maxPrice', parseInt(e.target.value) || 0)} />
                        </label>
                        <p>Set the maximum price to buy compost. Set to 0 for unlimited price.</p>
                    </div>
                </div>

            </div>
        ));
    });
}
