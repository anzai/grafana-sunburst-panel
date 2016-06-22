'use strict';

System.register(['lodash', './sunburst_ctrl'], function (_export, _context) {
  "use strict";

  var _, SunburstCtrl;

  return {
    setters: [function (_lodash) {
      _ = _lodash.default;
    }, function (_sunburst_ctrl) {
      SunburstCtrl = _sunburst_ctrl.SunburstCtrl;
    }],
    execute: function () {
      _export('PanelCtrl', SunburstCtrl);
    }
  };
});
//# sourceMappingURL=module.js.map
