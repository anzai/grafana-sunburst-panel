import {MetricsPanelCtrl} from 'app/plugins/sdk';
import _ from 'lodash';
import kbn from 'app/core/utils/kbn';
import TimeSeries from 'app/core/time_series';
import rendering from './rendering';

export class SunburstCtrl extends MetricsPanelCtrl {

  constructor($scope, $injector, $rootScope) {
    super($scope, $injector);
    this.$rootScope = $rootScope;

    this.formatType;

    this.columnTypes = [
      {text: 'Number', value: 'number'},
      {text: 'String', value: 'string'},
      {text: 'Date', value: 'date'},
    ];

    this.dateFormats = [
      {text: 'YYYY-MM-DD HH:mm:ss', value: 'YYYY-MM-DD HH:mm:ss'},
      {text: 'MM/DD/YY h:mm:ss a', value: 'MM/DD/YY h:mm:ss a'},
      {text: 'MMMM D, YYYY LT',  value: 'MMMM D, YYYY LT'},
    ];

    this.unitFormats = kbn.getUnitFormats();

    var panelDefault = {
      graphType: 'bar',
      styles: {},
      rootKey: 'root',
    };
    _.defaults(this.panel, panelDefault);

    this.events.on('render', this.onRender.bind(this));
    this.events.on('data-received', this.onDataReceived.bind(this));
    this.events.on('data-error', this.onDataError.bind(this));
    this.events.on('data-snapshot-load', this.onDataReceived.bind(this));
    this.events.on('init-edit-mode', this.onInitEditMode.bind(this));
  }

  onInitEditMode() {
    this.addEditorTab('Options', 'public/plugins/grafana-sunburst-panel/editor.html', 2);
  }

  onDataError() {
    this.series = [];
    this.render();
  }

  onRender() {
  }

  parseSeries(dataList) {
    var rtn = [];
    var unifiedDatapoints = [];

    _.each(dataList, function(data, j) {
      // Get format type
      var formatType;
      if (! dataList[0].type) {
        formatType = 'timeseries';
      } else {
        formatType = dataList[0].type;
      }

      // Parse
      var datapoints = [];
      switch (formatType) {
      case 'docs':
        datapoints = data.datapoints;
        break;

      case 'timeseries':
        var key = data.field || data.target || 'key_' + j;

        _.each(data.datapoints, function(row, i) {
          if (datapoints[i] === undefined) {
            datapoints[i] = {};
            datapoints[i]['time_msec'] = row[1];

            _.each(data.props, function(v, k) {
              datapoints[i][k] = v;
            });
          }
          datapoints[i][data.field] = row[0];
        });
        break;

      case 'table':
        _.each(data.rows, function(row) {
          if (_.last(row) === null) {
            return;
          }

          var obj = {};
          _.each(row, function(value, i) {
            var key = data.columns[i].text || data.target || 'key_' + i;
            obj[key] = value;
          });
          datapoints.push(obj);
        });
        break;
      }

      // Remove datapoints with null values
      if (datapoints.length > 0) {
        var filteredDatapoints = _.filter(datapoints, function(dp) {
          var nullValues = _.filter(dp, function(value) {
            return value === null;
          });
          return nullValues.length === 0;
        });

        if (filteredDatapoints.length > 0) {
          unifiedDatapoints = unifiedDatapoints.concat(filteredDatapoints);
        }
      }
    });

    rtn.push({
      label: '__data_',
      datapoints: unifiedDatapoints
    });

    return rtn;
  }

  setUnitFormat(style, subItem) {
    style.unit = subItem.value;
    this.render(this.data);
  };

  onDataReceived(dataList) {
    this.dataList = dataList;
    this.data = this.parseSeries(dataList);
    this.initStyles();
    this.render(this.data);
  }

  seriesHandler(seriesData) {
    var series = new TimeSeries({
      datapoints: seriesData.datapoints,
      alias: seriesData.target
    });

    return series;
  }

  initStyles() {
    if (this.data.length === 0 || this.data[0].datapoints.length === 0) {
      return;
    }

    var keys = _.keys(this.data[0].datapoints[0]);

    var self = this;
    var styles = {};
    _.each(keys, function(key, i) {
      if (self.panel.styles[key]) {
        styles[key] = self.panel.styles[key];
      } else {
        var type = (i === keys.length - 1) ? 'number' : 'string';
        styles[key] = {
          type: 'string', unit: 'none', decimals: null
        };
      }
    });
    this.panel.styles = styles;
  }

  link(scope, elem, attrs, ctrl) {
    this.sunburst = rendering(scope, elem, attrs, ctrl);
  }
}

SunburstCtrl.templateUrl = 'module.html';
