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
            styles: {
              x: {
                axis: 'X', type: 'number', unit: 'none', decimals: null
              },
              y: {
                axis: 'Y', type: 'number', unit: 'none', decimals: null
              },
              z: {
                axis: 'Z', type: 'number', unit: 'none', decimals: null
              }
            }
          };
          _.defaults(_this.panel, panelDefault);
          if (!_this.panel.cameraPosition) {
            _this.resetCameraPosition();
          }

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
            this.addEditorTab('Options', 'public/plugins/grafana-graph3d-panel/editor.html', 2);
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
          key: 'onDataReceived',
          value: function onDataReceived(dataList) {
            this.series = dataList.map(this.seriesHandler.bind(this));
            this.data = this.parseSeries(this.series);
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
          key: 'setUnitFormat',
          value: function setUnitFormat(column, subItem) {
            column.unit = subItem.value;
            this.render(this.data);
          }
        }, {
          key: 'resetCameraPosition',
          value: function resetCameraPosition() {
            // See http://visjs.org/docs/graph3d/#Methods
            this.panel.cameraPosition = {
              horizontal: 1.0,
              vertical: 0.5,
              distance: 1.7
            };
            this.render(this.data);
          }
        }, {
          key: 'loadCameraPosition',
          value: function loadCameraPosition() {
            this.panel.cameraPosition = this.currentCameraPosition;
          }
        }, {
          key: 'formatValue',
          value: function formatValue(value) {
            return value;
          }
        }, {
          key: 'link',
          value: function link(scope, elem, attrs, ctrl) {
            this.graph3d = rendering(scope, elem, attrs, ctrl);
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
