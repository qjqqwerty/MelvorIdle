var modInfo = {
    namespace: "ancientRelicsMod",
    name: "Ancient Relics Mod",
    setupFile: "setup.mjs",
    iconURL: "https://i.imgur.com/C8yL9g8.png",
    version: "1.2.2"
  };
  
  function setupMod(modInterface) {
    let settingsSection = modInterface.settings.section("Ancient Relics");
  
    settingsSection.add([
      {
        type: "switch",
        name: "enable-mod",
        label: "Enable Ancient Relics",
        hint: " ",
        default: true,
        onChange: () => {
          var nextElement, smallElement;
          let reloadHint = (smallElement = (nextElement = document.getElementById("ancientRelicsMod:enable-mod")) == null ? void 0 : nextElement.nextElementSibling) == null ? void 0 : smallElement.querySelector("small");
          reloadHint && (reloadHint.textContent = "Reload Required", reloadHint.classList.add("text-warning"), handleReload());
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
          let reloadHint = (smallElement = (nextElement = document.getElementById("ancientRelicsMod:enable-lesser-relics")) == null ? void 0 : nextElement.nextElementSibling) == null ? void 0 : smallElement.querySelector("small");
          reloadHint && (reloadHint.textContent = "Reload Required", reloadHint.classList.add("text-warning"), handleReload());
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
  
    modInterface.patch(Skill, "hasMasterRelic").replace(function (e) {
      return this.game.currentGamemode.allowAncientRelicDrops = !!settingsSection.get("enable-mod"),
        this.game.currentGamemode.allowAncientRelicDrops ? this.numberOfRelicsFound >= 5 : false;
    });
  
    function handleReload() {
      let reloadButton = document.getElementById("ancientRelicsMod:save-reload");
      if (reloadButton && reloadButton.classList.contains("btn-primary")) reloadButton.classList.replace("btn-primary", "btn-danger");
      else return;
    }
  
    modInterface.patch(SidebarSubitem, "configure").before(function (e) {
      return this.id !== "Ancient Relics Mod" || game.currentGamemode.localID !== "AncientRelics" ? [e] :
        (e && (e.onClick = () => Swal.fire({
          icon: "error",
          title: "Mod Disabled",
          html: '<h5 class="font-w600 font-size-sm mb-1 text-danger">Ancient Relics Mod is disabled for this save</h5><h5 class="font-w600 font-size-sm m-0 text-warning"><small>(Current gamemode is already Ancient Relics)</small></h5>'
        })), [e]);
    });
  
    modInterface.onCharacterLoaded(() => {
      if (game.currentGamemode.localID === "AncientRelics") return;
  
      let enableLesserRelics = settingsSection.get("enable-lesser-relics");
  
      console.log(`Ancient Relics Mod v%s loaded save %c%s%c with: 
        %cAncient Relics %s%c
        %cLesser Relics %s%c`, modInfo.version, "color: green; font-weight: bold;", game.characterName, "",
        "color: #d3ba7c;", settingsSection.get("enable-mod") ? "Enabled" : "Disabled", "",
        "color: #e41e7f;", enableLesserRelics ? "Enabled" : "Disabled", "");
  
      modInterface.patch(Player, "addAncientRelicModifiers").replace(function (n) {
        if (settingsSection.get("enable-mod")) return n();
      });
  
      enableLesserRelics && game.skills.filter(n => n.rareDrops.some(t => {
        var item;
        return (item = t.item) == null ? void 0 : item._localID.includes("Lesser_Relic");
      })).forEach(n => {
        let relicDrop = n.rareDrops.find(item => {
          var relic;
          return (relic = item.item) == null ? void 0 : relic._localID.includes("Lesser_Relic");
        });
  
        relicDrop && relicDrop.gamemodes && relicDrop.gamemodes.push(game.currentGamemode);
      });
    });
  
    modInterface.onInterfaceReady(() => {
      if (game.currentGamemode.localID === "AncientRelics") return;
  
      let ancientRelicsCategory = sidebar.category("Ancient Relics");
      ancientRelicsCategory && ancientRelicsCategory.rootEl && settingsSection.get("enable-mod") && ancientRelicsCategory.rootEl.classList.remove("d-none");
    });
  }
  
  export { setupMod as setup };
  