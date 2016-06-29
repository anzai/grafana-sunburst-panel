'use strict';

System.register(['app/plugins/sdk', 'lodash', 'app/core/utils/kbn', 'app/core/time_series', './rendering'], function (_export, _context) {
  "use strict";

  var MetricsPanelCtrl, _, kbn, TimeSeries, rendering, _createClass, SunburstCtrl;

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  function _possibleConstructorReturn(self, call) {
    if (!self) {
      throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
    }

    return call && (typeof call === "object" || typeof call === "function") ? call : self;
  }

  function _inherits(subClass, superClass) {
    if (typeof superClass !== "function" && superClass !== null) {
      throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
    }

    subClass.prototype = Object.create(superClass && superClass.prototype, {
      constructor: {
        value: subClass,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
    if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
  }

  return {
    setters: [function (_appPluginsSdk) {
      MetricsPanelCtrl = _appPluginsSdk.MetricsPanelCtrl;
    }, function (_lodash) {
      _ = _lodash.default;
    }, function (_appCoreUtilsKbn) {
      kbn = _appCoreUtilsKbn.default;
    }, function (_appCoreTime_series) {
      TimeSeries = _appCoreTime_series.default;
    }, function (_rendering) {
      rendering = _rendering.default;
    }],
    execute: function () {
      _createClass = function () {
        function defineProperties(target, props) {
          for (var i = 0; i < props.length; i++) {
            var descriptor = props[i];
            descriptor.enumerable = descriptor.enumerable || false;
            descriptor.configurable = true;
            if ("value" in descriptor) descriptor.writable = true;
            Object.defineProperty(target, descriptor.key, descriptor);
          }
        }

        return function (Constructor, protoProps, staticProps) {
          if (protoProps) defineProperties(Constructor.prototype, protoProps);
          if (staticProps) defineProperties(Constructor, staticProps);
          return Constructor;
        };
      }();

      _export('SunburstCtrl', SunburstCtrl = function (_MetricsPanelCtrl) {
        _inherits(SunburstCtrl, _MetricsPanelCtrl);

        function SunburstCtrl($scope, $injector, $rootScope) {
          _classCallCheck(this, SunburstCtrl);

          var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(SunburstCtrl).call(this, $scope, $injector));

          _this.$rootScope = $rootScope;

          _this.columnTypes = [{ text: 'Number', value: 'number' }, { text: 'String', value: 'string' }, { text: 'Date', value: 'date' }];

          _this.dateFormats = [{ text: 'YYYY-MM-DD HH:mm:ss', value: 'YYYY-MM-DD HH:mm:ss' }, { text: 'MM/DD/YY h:mm:ss a', value: 'MM/DD/YY h:mm:ss a' }, { text: 'MMMM D, YYYY LT', value: 'MMMM D, YYYY LT' }];

          _this.unitFormats = kbn.getUnitFormats();

          var panelDefault = {
            graphType: 'bar',
            styles: {},
            rootKey: 'root'
          };
          _.defaults(_this.panel, panelDefault);

          _this.events.on('render', _this.onRender.bind(_this));
          _this.events.on('data-received', _this.onDataReceived.bind(_this));
          _this.events.on('data-error', _this.onDataError.bind(_this));
          _this.events.on('data-snapshot-load', _this.onDataReceived.bind(_this));
          _this.events.on('init-edit-mode', _this.onInitEditMode.bind(_this));
          return _this;
        }

        _createClass(SunburstCtrl, [{
          key: 'onInitEditMode',
          value: function onInitEditMode() {
            this.addEditorTab('Options', 'public/plugins/grafana-sunburst-panel/editor.html', 2);
          }
        }, {
          key: 'onDataError',
          value: function onDataError() {
            this.series = [];
            this.render();
          }
        }, {
          key: 'onRender',
          value: function onRender() {
            this.data = this.parseSeries(this.series);
          }
        }, {
          key: 'parseSeries',
          value: function parseSeries(series) {
            return _.map(this.series, function (serie, i) {
              return {
                label: serie.alias,
                datapoints: serie.datapoints
              };
            });
          }
        }, {
          key: 'setUnitFormat',
          value: function setUnitFormat(style, subItem) {
            style.unit = subItem.value;
            this.render(this.data);
          }
        }, {
          key: 'onDataReceived',
          value: function onDataReceived(dataList) {
            this.series = dataList.map(this.seriesHandler.bind(this));
            this.data = this.parseSeries(this.series);

            this.initStyles();

            this.render(this.data);
          }
        }, {
          key: 'seriesHandler',
          value: function seriesHandler(seriesData) {
            var series = new TimeSeries({
              datapoints: seriesData.datapoints,
              alias: seriesData.target
            });

            return series;
          }
        }, {
          key: 'initStyles',
          value: function initStyles() {
            if (this.data.length === 0 || this.data[0].datapoints.length === 0) {
              return;
            }

            var keys = _.keys(this.data[0].datapoints[0]);

            var self = this;
            var styles = {};
            _.each(keys, function (key, i) {
              if (self.panel.styles[key]) {
                styles[key] = self.panel.styles[key];
              } else {
                var type = i === keys.length - 1 ? 'number' : 'string';
                styles[key] = {
                  type: 'string', unit: 'none', decimals: null
                };
              }
            });
            this.panel.styles = styles;
          }
        }, {
          key: 'link',
          value: function link(scope, elem, attrs, ctrl) {
            this.sunburst = rendering(scope, elem, attrs, ctrl);
          }
        }]);

        return SunburstCtrl;
      }(MetricsPanelCtrl));

      _export('SunburstCtrl', SunburstCtrl);

      SunburstCtrl.templateUrl = 'module.html';
    }
  };
});
//# sourceMappingURL=sunburst_ctrl.js.map
