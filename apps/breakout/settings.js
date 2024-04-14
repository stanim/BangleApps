/*jslint unordered:true, white:true*/
/*global Bangle,BTN1,BTN3,clearInterval,E,g,require,setInterval,setWatch*/
// make sure to enclose the function in parentheses
// prettier-ignore
(function (back) { // NOSONAR
  const settingsFile = "breakout.settings.json";
  // Load settings
  let settings = Object.assign( //NOSONAR
    {
      level: 1,
      levelHighest: 1,
      levelSave: true,
      scoreHighest: 0
    },
    require("Storage").readJSON(settingsFile, true) || {}
  );

  function writeSettings() {
    require("Storage").writeJSON(settingsFile, settings);
  }

  // Show the menu
  const appMenu = {
    "": { title: "App Name" },
    "< Back": () => back(),
    "Starting level": {
      max: 50,
      min: 1,
      onchange: function (v) {
        settings.level = v;
        writeSettings();
      },
      value: settings.level || 1
    },
    "Save level?": {
      onchange: function (v) {
        settings.levelSave = v;
        writeSettings();
      },
      value: Boolean(settings.levelSave) // !! converts undefined to false
    }
  };
  E.showMenu(appMenu);
});
