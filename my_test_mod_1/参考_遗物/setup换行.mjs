var c = {
    namespace: "ancientRelicsMod",
    name: "Ancient Relics Mod",
    setup: "setup.mjs",
    icon: "https://i.imgur.com/C8yL9g8.png",
    version: "1.2.2"
  };
  
  function u(i) {
    let s = i.settings.section("Ancient Relics");
  
    s.add([
      {
        type: "switch",
        name: "enable-mod",
        label: "Enable Ancient Relics",
        hint: " ",
        default: !0,
        onChange: () => {
          var n, t;
          let e = (t = (n = document.getElementById("ancientRelicsMod:enable-mod")) == null ? void 0 : n.nextElementSibling) == null ? void 0 : t.querySelector("small");
          e && (e.textContent = "Reload Required", e.classList.add("text-warning"), l());
        }
      },
      {
        type: "switch",
        name: "enable-lesser-relics",
        label: "Enable Lesser Relics",
        hint: " ",
        default: !0,
        onChange: () => {
          var n, t;
          let e = (t = (n = document.getElementById("ancientRelicsMod:enable-lesser-relics")) == null ? void 0 : n.nextElementSibling) == null ? void 0 : t.querySelector("small");
          e && (e.textContent = "Reload Required", e.classList.add("text-warning"), l());
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
  
    i.patch(Skill, "hasMasterRelic").replace(function (e) {
      return this.game.currentGamemode.allowAncientRelicDrops = !!s.get("enable-mod"),
        this.game.currentGamemode.allowAncientRelicDrops ? this.numberOfRelicsFound >= 5 : !1;
    });
  
    function l() {
      let e = document.getElementById("ancientRelicsMod:save-reload");
      if (e && e.classList.contains("btn-primary")) e.classList.replace("btn-primary", "btn-danger");
      else return;
    }
  
    i.patch(SidebarSubitem, "configure").before(function (e) {
      return this.id !== "Ancient Relics Mod" || game.currentGamemode.localID !== "AncientRelics" ? [e] :
        (e && (e.onClick = () => Swal.fire({
          icon: "error",
          title: "Mod Disabled",
          html: '<h5 class="font-w600 font-size-sm mb-1 text-danger">Ancient Relics Mod is disabled for this save</h5><h5 class="font-w600 font-size-sm m-0 text-warning"><small>(Current gamemode is already Ancient Relics)</small></h5>'
        })), [e]);
    });
  
    i.onCharacterLoaded(() => {
      if (game.currentGamemode.localID === "AncientRelics") return;
  
      let e = s.get("enable-lesser-relics");
  
      console.log(`Ancient Relics Mod v%s loaded save %c%s%c with: 
        %cAncient Relics %s%c
        %cLesser Relics %s%c`, c.version, "color: green; font-weight: bold;", game.characterName, "",
        "color: #d3ba7c;", s.get("enable-mod") ? "Enabled" : "Disabled", "",
        "color: #e41e7f;", e ? "Enabled" : "Disabled", "");
  
      i.patch(Player, "addAncientRelicModifiers").replace(function (n) {
        if (s.get("enable-mod")) return n();
      });
  
      e && game.skills.filter(n => n.rareDrops.some(t => {
        var a;
        return (a = t.item) == null ? void 0 : a._localID.includes("Lesser_Relic");
      })).forEach(n => {
        let t = n.rareDrops.find(a => {
          var o;
          return (o = a.item) == null ? void 0 : o._localID.includes("Lesser_Relic");
        });
  
        t && t.gamemodes && t.gamemodes.push(game.currentGamemode);
      });
    });
  
    i.onInterfaceReady(() => {
      if (game.currentGamemode.localID === "AncientRelics") return;
  
      let e = sidebar.category("Ancient Relics");
      e && e.rootEl && s.get("enable-mod") && e.rootEl.classList.remove("d-none");
    });
  }
  
  export { u as setup };
  