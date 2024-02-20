export function setup(ctx) {
	ctx.onCharacterSelectionLoaded(ctx => {
		// debug
		const debugLog = (...msg) => {
			mod.api.SEMI.log(`${id} v7610`, ...msg);
		};

		// script details
		const id = 'drop-chances';
		const title = 'Show % Drop Chances';

		const localeSettings = {
			minimumFractionDigits: 0,
			maximumFractionDigits: 4
		};

		// setting groups
		const SETTING_DISPLAY = ctx.settings.section('Display type');
		SETTING_DISPLAY.add(
			[{
				type: 'label',
				label: 'Choose whether to display drop rates as a percentage or as 1/x',
				name: 'label-droprate-style'
			},
			{
				type: 'radio-group',
				name: `droprate-style`,
				label: '',
				default: "x",
				options: [{ value: "x", label: "1/x", hint: "" }, { value: "%", label: "Percentage", hint: "" }]
			}
			]
		);

		const dropDisplay = (weight, totalWeight) => {
			if (SETTING_DISPLAY.get("droprate-style") == "x") {
				return ` (1/${(totalWeight / weight).toLocaleString(undefined, localeSettings)})`;
			} else {
				return ` (${((weight / totalWeight) * 100).toPrecision(4)}%)`;
			}
		};


		const dropChances = () => {
			// Monster Drops
			ctx.patch(CombatManager, 'getMonsterDropsHTML').replace(function (_getMonsterDropsHTML, monster, respectArea) {
				let drops = '';
				let totalWeight = monster.lootTable.totalWeight;
				if (monster.lootChance !== undefined) {
					totalWeight = (totalWeight * 100) / monster.lootChance;
				}
				if (monster.lootChance > 0 && monster.lootTable.size > 0 && !(respectArea && this.areaType === CombatAreaType.Dungeon)) {
					drops = monster.lootTable.sortedDropsArray.map((drop) => {
						let dropText = templateLangString('BANK_STRING_40', {
							qty: `${drop.maxQuantity}`,
							itemImage: `<img class="skill-icon-xs mr-2" src="${drop.item.media}">`,
							itemName: drop.item.name,
						});
						dropText += dropDisplay(drop.weight, totalWeight);
						return dropText;
					}).join('<br>');
				}
				let bones = '';
				if (monster.bones !== undefined && !(respectArea && this.selectedArea instanceof Dungeon && !this.selectedArea.dropBones)) {
					bones = `${getLangString('MISC_STRING_7')}<br><small><img class="skill-icon-xs mr-2" src="${monster.bones.item.media}">${monster.bones.item.name}</small><br><br>`;
				}
				else {
					bones = getLangString('COMBAT_MISC_107') + '<br><br>';
				}
				let html = `<span class="text-dark">${bones}<br>`;
				if (drops !== '') {
					html += `${getLangString('MISC_STRING_8')}<br><small>${getLangString('MISC_STRING_9')}</small><br>${drops}`;
				}
				html += '</span>';
				return html;
			});

			// Chest Contents
			window.viewItemContents = (item) => {
				if (!item) {
					item = game.bank.selectedBankItem.item;
				}
				const dropsOrdered = item.dropTable.sortedDropsArray;
				let totalWeight = item.dropTable.totalWeight;
				const drops = dropsOrdered.map((drop) => {
					let dropText = templateString(getLangString('BANK_STRING_40'), {
						qty: `${numberWithCommas(drop.maxQuantity)}`,
						itemImage: `<img class="skill-icon-xs mr-2" src="${drop.item.media}">`,
						itemName: drop.item.name,
					});
					dropText += dropDisplay(drop?.weight, totalWeight);
					return dropText;
				}).join('<br>');

				Swal.fire({
					title: item.name,
					html: getLangString('BANK_STRING_39') + '<br><small>' + drops,
					imageUrl: item.media,
					imageWidth: 64,
					imageHeight: 64,
					imageAlt: item.name,
				});
			};

			// Thieving
			thievingMenu.showNPCDrops = (npc, area) => {
				const sortedTable = npc.lootTable.sortedDropsArray;
				const { minGP, maxGP } = game.thieving.getNPCGPRange(npc);
				let html = `<span class="text-dark"><small><img class="skill-icon-xs mr-2" src="${cdnMedia('assets/media/main/coins.svg')}"> ${templateLangString('MENU_TEXT_GP_AMOUNT', { gp: `${formatNumber(minGP)}-${formatNumber(maxGP)}`, })}</small><br>`;
				html += `${getLangString('THIEVING_POSSIBLE_COMMON')}<br><small>`;
				if (sortedTable.length) {
					html += `${getLangString('THIEVING_MOST_TO_LEAST_COMMON')}<br>`;
					const totalWeight = npc.lootTable.weight;
					html += sortedTable.map(({ item, weight, minQuantity, maxQuantity }) => {
						let text = `${maxQuantity > minQuantity ? `${minQuantity}-` : ''}${maxQuantity} x <img class="skill-icon-xs mr-2" src="${item.media}">${item.name}`;
						text += dropDisplay(weight * 3, totalWeight * 4); // Regular drops only account for 3/4th of the total drop table
						return text;
					}).join('<br>');
					html += `<br>Average Value: ${npc.lootTable.averageDropValue.toPrecision(3)} GP<br>`;
				} else {
					html += getLangString('THIEVING_NO_COMMON_DROPS');
				}
				html += `</small><br>`;
				html += `${getLangString('THIEVING_POSSIBLE_RARE')}<br><small>`;
				const generalRareHTML = [];
				game.thieving.generalRareItems.forEach(({ item, npcs, chance }) => {
					if (npcs === undefined || npcs.has(npc)) {
						generalRareHTML.push(`${thievingMenu.formatSpecialDrop(item)}${dropDisplay(chance / 100, 1)}`);
					}
				});
				html += generalRareHTML.join('<br>');
				html += `</small><br>`;
				if (area.uniqueDrops.length) {
					html += `${getLangString('THIEVING_POSSIBLE_AREA_UNIQUE')}<br><small>`;
					html += area.uniqueDrops.map((uniqueRareItem) => {
						let chance = game.thieving.isPoolTierActive(3) ? 3 : 1;
						let text = `${thievingMenu.formatSpecialDrop(uniqueRareItem.item, uniqueRareItem.quantity)}${dropDisplay(game.thieving.areaUniqueChance * chance / 100, 1)}`;
						return text
					}).join('<br>');
					html += '</small><br>';
				}
				if (npc.uniqueDrop !== undefined) {
					html += `${getLangString('THIEVING_POSSIBLE_NPC_UNIQUE')}<br><small>${thievingMenu.formatSpecialDrop(
						npc.uniqueDrop.item,
						npc.uniqueDrop.quantity
					)}${dropDisplay(game.thieving.getNPCPickpocket(npc) / 100, 1)}</small>`;
				}
				html += '</span>';

				Swal.fire({
					title: npc.name,
					html,
					imageUrl: npc.media,
					imageWidth: 64,
					imageHeight: 64,
					imageAlt: npc.name,
				});
			};

			// Archology
			if (typeof ArtefactDropList != 'undefined') {
				const sizes = [['tiny', 'artefactsTiny'], ['small', 'artefactsSmall'], ['medium', 'artefactsMedium'], ['large', 'artefactsLarge']];

				ctx.patch(ArtefactDropList, 'setList').replace(function (_setList, digSite) {
					for (const [size, elm] of sizes) {
						const drops = digSite.artefacts[size];
						drops.sortedDropsArray.map(({ item, weight, minQuantity, maxQuantity }) => {
							const el = createElement('div');
							el.innerHTML = `${this.formatSpecialDrop(item, maxQuantity)}${dropDisplay(weight, drops.totalWeight)} ${this.getWeightBadge(weight)}`;
							this[elm].appendChild(el);
						}
						);
					}
				});
			}

			debugLog(id, 'Mod loaded successfully')
		};

		ctx.onInterfaceReady(() => {
			dropChances();
		});
	});
}
