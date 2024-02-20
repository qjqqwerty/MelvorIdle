export function setup(ctx) {
	ctx.onCharacterSelectionLoaded(ctx => {
		// debug
		const debugLog = (...msg) => {
			mod.api.SEMI.log(`${id} v4628`, ...msg);
		};

		// script details
		const id = 'auto-farm';
		const title = 'SEMI Auto Farming';

		// plot states
		const STATE_LOCKED = 0;
		const STATE_EMPTY = 1;
		const STATE_GROWING = 2;
		const STATE_GROWN = 3;
		const STATE_DEAD = 4;

		// setting groups
		const SETTING_COMPOST = ctx.settings.section('Compost');
		const SETTING_EQUIPMENT = ctx.settings.section('Auto Swap Equipment');

		// planting priorities
		const priorityToConfig = (arr) => arr.map(action => action.id);
		const priorityFromConfig = (arr) => arr.map(actionID => getAction(actionID));
		const priorityTypes = {
			custom: {
				id: 'custom',
				description: 'Custom priority',
				tooltip: 'Drag seeds to change their priority'
			},
			mastery: {
				id: 'mastery',
				description: 'Highest mastery',
				tooltip: 'Seeds with maxed mastery are excluded<br>Click seeds to disable/enable them',
			},
			replant: {
				id: 'replant',
				description: 'Replant',
				tooltip: 'Lock patches to their current seeds'
			},
			lowestQuantity: {
				id: 'lowestQuantity',
				description: 'Lowest Quantity',
				tooltip: 'Crops with the lowest quantity in the bank are planted',
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

		// items
		const shopCompost = game.shop.purchases.getObjectByID('melvorD:Compost');
		const itemCompost = game.items.getObjectByID('melvorD:Compost');
		const itemWeirdGloop = game.items.getObjectByID('melvorD:Weird_Gloop');

		// utils
		const getAction = (id) => game.farming.actions.getObjectByID(id);
		const getMasteryLevel = (action) => game.farming.getMasteryLevel(action);
		const getMasteryXP = (action) => game.farming.getMasteryXP(action);
		const poolActive = (level) => game.farming.isPoolTierActive(level);

		const bankQty = (item) => game.bank.getQty(item);
		const bankHasRoom = (item) => game.bank.occupiedSlots < game.bank.maximumSlots || item == null || bankQty(item) > 0;

		const getProduct = (action) => action.product;
		const canAfford = (action) => bankQty(action.seedCost.item) >= action.seedCost.quantity;
		const canCropDie = (action) => !(getMasteryLevel(action) >= 50 || poolActive(1));

		// equipment
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
		gearSlots.forEach(slot => { // convert id -> item
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
			if(!canChangeEquipment())
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

			gearSwapped = mod.api.SEMI.equipmentDifferences(oldEquipment);
			writeEquipmentChangeDebug(gearSwapped);
		};

		const equipmentRestore = () => {
			debugLog(`Restoring Equipment Swap:`, (gearSwapped != null));
			if (gearSwapped != null) {
				const oldEquipment = mod.api.SEMI.equipmentSnapshot();

				mod.api.SEMI.equipmentDifferencesRestore(gearSwapped);
				gearSwapped = null;

				writeEquipmentChangeDebug(mod.api.SEMI.equipmentDifferences(oldEquipment));
			}
		};

		const writeEquipmentChangeDebug = (snapshot) => {
			gearSlots.forEach(slotKey => {
				if(snapshot[slotKey] != null) {
					debugLog(`${slotKey}: ${snapshot[slotKey].old.item.id} x ${snapshot[slotKey].old.quantity} -> ${snapshot[slotKey].new.item.id} x ${snapshot[slotKey].new.quantity}`);
				}
			});
		};

		// compost
		const canBuyCompost = (total = 5) => {
			if (game.modifiers.freeCompost > 0)
				return false;

			if(!SETTING_COMPOST.get('compost-buy'))
				return false;

			return game.gp.amount >= (shopCompost.costs.gp.cost * total) && bankHasRoom(itemCompost);
		};

		const buyCompost = () => {
			let qty = bankQty(itemCompost);
			let purchaseAmount = 5 - qty;
			if (purchaseAmount > 0 && canBuyCompost(purchaseAmount)) {
				let lastBuyQty = game.shop.buyQuantity;
				game.shop.buyQuantity = purchaseAmount;
				game.shop.buyItemOnClick(shopCompost, true);
				game.shop.buyQuantity = lastBuyQty;
				debugLog(`Bought ${purchaseAmount} Compost.`);
			}
		};

		// plots
		const needActionFilter = (plot) => config[plot.category.id].enabled && (
			plot.state == STATE_EMPTY ||
			plot.state == STATE_DEAD ||
			plot.state == STATE_GROWN
		);

		const handlePlots = () => {
			const needAction = game.farming.plots.some(plot => needActionFilter(plot));

			if (needAction) {
				equipmentSwap();

				game.farming.plots.forEach(plot => {
					if (plot.state == STATE_LOCKED)
						return;
					if (plot.state == STATE_GROWING)
						return;
					if (!config[plot.category.id].enabled)
						return;
					if (config[plot.category.id].reservedPlots[plot.id] !== undefined)
						return;

					if (plot.state == STATE_GROWN || plot.state == STATE_DEAD)
						harvestPlot(plot);

					if (plot.state == STATE_EMPTY)
						seedPlot(plot);
				});

				FARMING_CATEGORIES.forEach(category => {
					if (config[category.id].priorityType === priorityTypes.mastery.id) {
						orderMasteryPriorityMenu(category);
					}
				});

				equipmentRestore();
			}
		};

		const harvestPlot = (plot) => {
			const plotType = plot.category.id;

			if (config[plotType].priorityType === priorityTypes.replant.id) {
				config[plotType].lockedPlots[plot.id] = plot.plantedRecipe.id;
			}

			if (plot.state == STATE_DEAD || bankHasRoom(getProduct(plot.plantedRecipe))) {
				game.farming.harvestPlotOnClick(plot);
			}
		};

		const seedPlot = (plot) => {
			let seedAction = getNextSeedAction(plot);

			if (!seedAction)
				return;

			// apply compost
			if (plot.compostLevel < 100) {
				if (SETTING_COMPOST.get('use-weird-gloop')
						&& plot.compostItem != itemWeirdGloop
						&& bankQty(itemWeirdGloop) > 1) {
					game.farming.compostPlot(plot, itemWeirdGloop, 1);
				}
				else if (SETTING_COMPOST.get('use-compost') && canCropDie(seedAction)) {
					buyCompost();

					if (bankQty(itemCompost) > 0) {
						game.farming.compostPlot(plot, itemCompost, 5);
					}
				}
			}

			game.farming.plantRecipe(seedAction, plot);
		};

		const getNextSeedAction = (plot) => {
			// Find next seed in bank according to priority
			const plotType = plot.category.id;
			const plotTypeConfig = config[plotType];

			const lockedSeed = plotTypeConfig.lockedPlots[plot.id];
			let actions = [];

			if (lockedSeed !== undefined) {
				actions = [getAction(lockedSeed)];
			}
			else if (plotTypeConfig.priorityType === priorityTypes.custom.id) {
				actions = PRIORITY_ARRAYS[plotType];
			}
			else if (plotTypeConfig.priorityType === priorityTypes.mastery.id) {
				actions = FARMING_ACTIONS[plotType]
					.filter(action => !config.disabledActions[action.id] && getMasteryLevel(action) < 99)
					.sort((a, b) => getMasteryXP(b) - getMasteryXP(a));
			}
			else if (plotTypeConfig.priorityType === priorityTypes.lowestQuantity.id) {
				actions = FARMING_ACTIONS[plotType]
					.filter(action => !config.disabledActions[action.id])
					.sort((a, b) => bankQty(getProduct(a)) - bankQty(getProduct(b)));
			}

			//for (let k = 0; k < actions.length; k++) {
			//	debugLog(actions[k].name, getMasteryXP(actions[k]).toFixed(3), bankQty(getProduct(actions[k])));
			//}

			let nextSeed = null;
			for (let k = 0; k < actions.length; k++) {
				const action = actions[k];
				if (game.farming.level >= action.level && canAfford(action)) {
					nextSeed = action;
					break;
				}
			}

			return nextSeed;
		}

		// ui
		const htmlID = (id) => id.replace(/[:_]/g, '-').toLowerCase();

		const orderMasteryPriorityMenu = (category) => {
			const menu = $(`#${id}-${htmlID(category.id)}-prioritysettings-mastery`);
			menu.children()
				.toArray()
				.filter((e) => getMasteryLevel(getAction($(e).data('action'))) >= 99)
				.forEach((e) => $(e).remove());
			const sortedMenuItems = menu
				.children()
				.toArray()
				.sort((a, b) => getMasteryXP(getAction($(b).data('action'))) - getMasteryXP(getAction($(a).data('action'))));
			menu.append(sortedMenuItems);
		};

		const orderCustomPriorityMenu = (category) => {
			const priority = PRIORITY_ARRAYS[category.id];
			if (!priority.length) {
				return;
			}
			const menu = $(`#${id}-${htmlID(category.id)}-prioritysettings-custom`);
			const menuItems = [...menu.children()];

			function indexOfOrInf(el) {
				let i = priority.indexOf(el);
				return i === -1 ? Infinity : i;
			}

			const sortedMenu = menuItems.sort(
				(a, b) => indexOfOrInf(getAction($(a).data('action'))) - indexOfOrInf(getAction($(b).data('action')))
			);
			menu.append(sortedMenu);
		};

		const showReservedButtonInCategory = (category) => {
			const plots = game.farming.getPlotsForCategory(category);
			plots.every((plot, i) => {
				if (plot.state !== STATE_LOCKED) {
					if (farmingMenus.plots[i].buttonCheckBox === undefined) {
						const buttonId = id + '-' + htmlID(plot.id) + '-plot-reserved'
						const buttonContainer = createElement('div', {
							className: 'custom-control custom-switch',
							children: [createElement('label', {
								className: 'custom-control-label',
								attributes: [['for', buttonId]],
								children: ['Reserved']
							})]
						});
						const buttonCheckBox = createElement('input', {
							className: 'custom-control-input',
							attributes: [['type', 'checkbox'], ['id', buttonId]],
						});
						buttonContainer.prepend(buttonCheckBox);

						farmingMenus.plots[i].buttonCheckBox = buttonCheckBox;
						farmingMenus.plots[i].categoryName.after(buttonContainer);
						farmingMenus.plots[i].categoryName.parentNode.style.flexWrap = "wrap";
					}

					farmingMenus.plots[i].buttonCheckBox.checked = config[plot.category.id].reservedPlots[plot.id] !== undefined;
					farmingMenus.plots[i].buttonCheckBox.onclick = () => {
						if (config[plot.category.id].reservedPlots[plot.id] !== undefined) {
							delete config[plot.category.id].reservedPlots[plot.id];
						} else {
							config[plot.category.id].reservedPlots[plot.id] = 'Reserved';
						}
						storeConfig();
					};

					return plot.state !== STATE_LOCKED;
				}
			});
		}

		const injectGUI = () => {
			$(`#${id}`).remove();

			const disabledOpacity = 0.25;

			function createPatchTypeDiv(category) {
				const catID = htmlID(category.id);

				function createSeedDiv(action) {
					return `
							<div class="btn btn-outline-secondary ${id}-priority-selector" data-action="${action.id}" data-tippy-content="${action.name}" style="margin: 2px; padding: 6px; float: left;">
								<img src="${action.product.media}" width="30" height="30">
							</div>`;
				}

				function createPriorityTypeSelector(priorityType) {
					const prefix = `${id}-${catID}-prioritytype`;
					const elementId = `${prefix}-${priorityType.id}`;
					return `<div class="custom-control custom-radio custom-control-inline" data-tippy-content="${priorityType.tooltip}">
								<input class="custom-control-input" type="radio" id="${elementId}" name="${prefix}" value="${priorityType.id}"${config[category.id].priorityType === priorityType.id ? ' checked' : ''}>
								<label class="custom-control-label" for="${elementId}">${priorityType.description}</label>
							</div>`;
				}

				const prefix = `${id}-${catID}`;
				const prioritySettings = `${prefix}-prioritysettings`;
				const seedDivs = FARMING_ACTIONS[category.id].map(createSeedDiv).join('');

				return `<div id="${prefix}" class="col-12 col-md-6 col-xl-4">
						<div class="block block-rounded block-link-pop border-top border-farming border-4x" style="padding-bottom: 12px;">
							<div class="block-header border-bottom">
								<h3 class="block-title">AutoFarm ${category.name}</h3>
								<div class="custom-control custom-switch">
									<input type="checkbox" class="custom-control-input" id="${prefix}-enabled" name="${prefix}-enabled"${config[category.id].enabled ? ' checked' : ''}>
									<label class="custom-control-label" for="${prefix}-enabled">Enable</label>
								</div>
							</div>
							<div class="block-content" style="padding-top: 12px">
								${Object.values(priorityTypes).map(createPriorityTypeSelector).join('')}
							</div>
							<div class="block-content" style="padding-top: 12px">
								<div id="${prioritySettings}-custom">
									${seedDivs}
									<button id="${prioritySettings}-reset" class="btn btn-primary locked" data-tippy-content="Reset order to default (highest to lowest level)" style="margin: 5px 0 0 2px; float: right;">Reset</button>
								</div>
								<div id="${prioritySettings}-mastery" class="${id}-seed-toggles">
									${seedDivs}
								</div>
								<div id="${prioritySettings}-lowestQuantity" class="${id}-seed-toggles">
									${seedDivs}
								</div>
							</div>
						</div>
					</div>`;
			}

			const autoFarmDiv = `<div id="${id}" class="row row-deck gutters-tiny">${FARMING_CATEGORIES.map(createPatchTypeDiv).join('')}</div>`;

			$('#farming-category-container').after($(autoFarmDiv));

			showReservedButtonInCategory(game.farming.categories.firstObject);

			function addStateChangeHandler(category) {
				$(`#${id}-${htmlID(category.id)}-enabled`).change((event) => {
					config[category.id].enabled = event.currentTarget.checked;
					CURRENT_TICK = (TICKS_PER_MINUTE - 5);
					storeConfig();
				});
			}
			FARMING_CATEGORIES.forEach(addStateChangeHandler);


			function showSelectedPriorityTypeSettings(category) {
				for (const priorityType of Object.values(priorityTypes)) {
					$(`#${id}-${htmlID(category.id)}-prioritysettings-${priorityType.id}`).toggle(
						priorityType.id === config[category.id].priorityType
					);
				}
			}
			FARMING_CATEGORIES.forEach(showSelectedPriorityTypeSettings);

			function lockPatch(category, plot, action) {
				if (action !== undefined) {
					config[category.id].lockedPlots[plot.id] = action.id;
				}
				else {
					delete config[category.id].lockedPlots[plot.id];
				}
			}

			function addPriorityTypeChangeHandler(category) {
				function lockAllPlots(auto = false) {
					FARMING_PLOTS[category.id].forEach(plot => {
						lockPatch(category, plot, auto ? undefined : plot.plantedRecipe);
					});
					$(`.${id}-seed-selector`).remove();
				}

				$(`#${id} input[name="${id}-${htmlID(category.id)}-prioritytype"]`).change((event) => {
					if (config[category.id].priorityType === priorityTypes.replant.id) {
						lockAllPlots(true);
					}

					config[category.id].priorityType = event.currentTarget.value;
					if (event.currentTarget.value === priorityTypes.replant.id) {
						lockAllPlots();
					}
					showSelectedPriorityTypeSettings(category);
					storeConfig();
				});
			}
			FARMING_CATEGORIES.forEach(addPriorityTypeChangeHandler);

			function makeSortable(category) {
				const elementId = `${id}-${htmlID(category.id)}-prioritysettings-custom`;
				Sortable.create(document.getElementById(elementId), {
					animation: 150,
					filter: '.locked',
					onMove: (event) => {
						if (event.related) {
							return !event.related.classList.contains('locked');
						}
					},
					onEnd: () => {
						PRIORITY_ARRAYS[category.id] = [...$(`#${elementId} .${id}-priority-selector`)].map(
							(x) => getAction($(x).data('action'))
						);
						config[category.id].priority = priorityToConfig(PRIORITY_ARRAYS[category.id]);
						storeConfig();
					},
				});
			}
			FARMING_CATEGORIES.forEach(makeSortable);

			function addPriorityResetClickHandler(category) {
				$(`#${id}-${htmlID(category.id)}-prioritysettings-reset`).on('click', () => {
					PRIORITY_ARRAYS[category.id] = [...FARMING_ACTIONS[category.id]];
					config[category.id].priority = priorityToConfig(PRIORITY_ARRAYS[category.id]);
					orderCustomPriorityMenu(category);
					storeConfig();
				});
			}
			FARMING_CATEGORIES.forEach(addPriorityResetClickHandler);

			$(`.${id}-seed-toggles div`).each((_, e) => {
				const toggle = $(e);
				const actionID = toggle.data('action');
				if (config.disabledActions[actionID]) {
					toggle.css('opacity', disabledOpacity);
				}
			});

			$(`.${id}-seed-toggles div`).on('click', (event) => {
				const toggle = $(event.currentTarget);
				const actionID = toggle.data('action');
				if (config.disabledActions[actionID]) {
					delete config.disabledActions[actionID];
				}
				else {
					config.disabledActions[actionID] = true;
				}
				const opacity = config.disabledActions[actionID] ? disabledOpacity : 1;
				toggle.fadeTo(200, opacity);
				storeConfig();
			});

			FARMING_CATEGORIES.forEach(category => {
				orderCustomPriorityMenu(category);
				orderMasteryPriorityMenu(category);
			});

			tippy(`#${id} [data-tippy-content]`, {
				animation: false,
				allowHTML: true
			});
		};

		// config
		const storeConfig = () => {
			ctx.characterStorage.setItem('config', config);
		}

		const loadConfig = () => {
			const storedConfig = ctx.characterStorage.getItem('config');
			if (!storedConfig) {
				return;
			}

			config = { ...config, ...storedConfig };

			FARMING_CATEGORIES.forEach(category => {
				if (config[category.id] && config[category.id].priority) {
					PRIORITY_ARRAYS[category.id] = priorityFromConfig(config[category.id].priority);
				}

				if (config[category.id].reservedPlots == undefined) {
					config[category.id].reservedPlots = {};
				}
			});
		}

		// settings
		SETTING_COMPOST.add([
			{
				'type': 'switch',
				'name': `compost-buy`,
				'label': `Buy Compost if none available.`,
				'default': true
			},
			{
				'type': 'switch',
				'name': `use-compost`,
				'label': `Use Compost`,
				'default': true
			},
			{
				'type': 'switch',
				'name': `use-weird-gloop`,
				'label': `Use Weird Gloop`,
				'default': true
			}
		]);

		SETTING_EQUIPMENT.add({
			'name': 'auto-swap-equipment-description',
			'type': 'label',
			'label': 'Swap to and from equipment when not in combat before handling any plots.'
		});
		SETTING_EQUIPMENT.add(Object.keys(gearPriorityIDs).map(slotKey => {
			return {
				'type': 'switch',
				'name': `swap-${slotKey}`,
				'label': `Swap ${slotKey}`,
				'hint': `[${gearPriority[slotKey].map(item => item.name).join(', ')}]`,
				'default': false
			}
		}));

		// game hooks
		let CURRENT_TICK = 0;
		const farmingPassiveTick = () => {
			CURRENT_TICK++;
			if (CURRENT_TICK > TICKS_PER_MINUTE) {
				//debugLog('farming passiveTick');
				CURRENT_TICK = 0;

				handlePlots();
			}
		};

		ctx.onCharacterLoaded(() => {
			loadConfig();

			// passive timer
			ctx.patch(Farming, 'passiveTick').after(function() {
				try {
					farmingPassiveTick();
				} catch (e) {
					debugLog(e);
				}
			});

			// crop finished
			ctx.patch(Farming, 'growPlots').after(function(_, timer) {
				CURRENT_TICK = (TICKS_PER_MINUTE - 5);
			});

			// add reserved button
			ctx.patch(Farming, 'showPlotsInCategory').after(function (_, category) {
				showReservedButtonInCategory(category);
			});

			// purchase / unlock plot
			ctx.patch(Farming, 'unlockPlotOnClick').after(function(_, plot) {
				if (plot.state === STATE_EMPTY) {
					CURRENT_TICK = (TICKS_PER_MINUTE - 5);
				}
			});

			// harvest plot
			ctx.patch(Farming, 'harvestPlotOnClick').after(function(_, plot) {
				CURRENT_TICK = (TICKS_PER_MINUTE - 5);
			});
		});

		ctx.onInterfaceReady(() => {
			injectGUI();
		});
	});
}
