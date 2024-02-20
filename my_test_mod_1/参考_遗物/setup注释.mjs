// Mod信息
var modInfo = {
    namespace: "ancientRelicsMod",
    name: "Ancient Relics Mod",
    setup: "setup.mjs",
    icon: "https://i.imgur.com/C8yL9g8.png",
    version: "1.2.2"
  };
  
  // 模块初始化函数
  function initializeModule(game) {
    // 获取设置部分
    let settingsSection = game.settings.section("Ancient Relics");
  
    // 添加设置项
    settingsSection.add([
      {
        type: "switch",
        name: "enable-mod",
        label: "Enable Ancient Relics",
        hint: " ",
        default: true,
        onChange: () => {
          // 当开关状态改变时触发的函数
          var nextElement, smallElement;
          let hintElement = (nextElement = (element = document.getElementById("ancientRelicsMod:enable-mod")) == null ? void 0 : element.nextElementSibling) == null ? void 0 : nextElement.querySelector("small");
          hintElement && (hintElement.textContent = "Reload Required", hintElement.classList.add("text-warning"), handleReload());
        }
      },
      {
        type: "switch",
        name: "enable-lesser-relics",
        label: "Enable Lesser Relics",
        hint: " ",
        default: true,
        onChange: () => {
          var nextElement, smallElement;
          let hintElement = (nextElement = (element = document.getElementById("ancientRelicsMod:enable-lesser-relics")) == null ? void 0 : element.nextElementSibling) == null ? void 0 : nextElement.querySelector("small");
          hintElement && (hintElement.textContent = "Reload Required", hintElement.classList.add("text-warning"), handleReload());
        }
      },
      {
        type: "button",
        name: "save-reload",
        display: "Save & Reload",
        color: "primary",
        onClick: () => {
          saveData();
          window.location.reload();
        }
      }
    ]);
  
    // 应用设置变更到游戏中
    game.patch(Skill, "hasMasterRelic").replace(function (e) {
      return this.game.currentGamemode.allowAncientRelicDrops = !!settingsSection.get("enable-mod"),
        this.game.currentGamemode.allowAncientRelicDrops ? this.numberOfRelicsFound >= 5 : false;
    });
  
    // 处理重新加载按钮样式
    function handleReload() {
      let reloadButton = document.getElementById("ancientRelicsMod:save-reload");
      if (reloadButton && reloadButton.classList.contains("btn-primary")) reloadButton.classList.replace("btn-primary", "btn-danger");
      else return;
    }
  
    // 配置侧边栏子项
    game.patch(SidebarSubitem, "configure").before(function (element) {
      return this.id !== "Ancient Relics Mod" || game.currentGamemode.localID !== "AncientRelics" ? [element] :
        (element && (element.onClick = () => showModDisabledAlert()), [element]);
    });
  
    // 角色加载完成时执行的函数
    game.onCharacterLoaded(() => {
      if (game.currentGamemode.localID === "AncientRelics") return;
  
      // 获取并打印一些设置信息
      let enableLesserRelics = settingsSection.get("enable-lesser-relics");
  
      console.log(`Ancient Relics Mod v%s loaded save %c%s%c with: 
        %cAncient Relics %s%c
        %cLesser Relics %s%c`, modInfo.version, "color: green; font-weight: bold;", game.characterName, "",
        "color: #d3ba7c;", settingsSection.get("enable-mod") ? "Enabled" : "Disabled", "",
        "color: #e41e7f;", enableLesserRelics ? "Enabled" : "Disabled", "");
  
      // 应用修改到Player类
      game.patch(Player, "addAncientRelicModifiers").replace(function (func) {
        if (settingsSection.get("enable-mod")) return func();
      });
  
      // 如果启用 Lesser Relics，则在相应的技能中添加对当前游戏模式的支持
      enableLesserRelics && game.skills.filter(skill => skill.rareDrops.some(drop => {
        var item;
        return (item = drop.item) == null ? void 0 : item._localID.includes("Lesser_Relic");
      })).forEach(skill => {
        let drop = skill.rareDrops.find(item => {
          var itemID;
          return (itemID = item.item) == null ? void 0 : itemID._localID.includes("Lesser_Relic");
        });
  
        drop && drop.gamemodes && drop.gamemodes.push(game.currentGamemode);
      });
    });
  
    // 游戏界面准备好后执行的函数
    game.onInterfaceReady(() => {
      if (game.currentGamemode.localID === "AncientRelics") return;
  
      // 获取侧边栏中的 Ancient Relics 子项
      let ancientRelicsCategory = sidebar.category("Ancient Relics");
  
      // 如果 Ancient Relics 子项存在且模块启用，则移除 'd-none' 类以显示它
      ancientRelicsCategory && ancientRelicsCategory.rootEl && settingsSection.get("enable-mod") && ancientRelicsCategory.rootEl.classList.remove("d-none");
    });
  }
  
  // 导出模块初始化函数
  export { initializeModule as setup };
  