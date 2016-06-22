import {MetricsPanelCtrl} from 'app/plugins/sdk';
import _ from 'lodash';
import kbn from 'app/core/utils/kbn';
import TimeSeries from 'app/core/time_series';
import rendering from './rendering';

export class SunburstCtrl extends MetricsPanelCtrl {

  constructor($scope, $injector, $rootScope) {
    super($scope, $injector);
    this.$rootScope = $rootScope;

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
    _.defaults(this.panel, panelDefault);
    if (! this.panel.cameraPosition) {
      this.resetCameraPosition();
    }

    this.events.on('render', this.onRender.bind(this));
    this.events.on('data-received', this.onDataReceived.bind(this));
    this.events.on('data-error', this.onDataError.bind(this));
    this.events.on('data-snapshot-load', this.onDataReceived.bind(this));
    this.events.on('init-edit-mode', this.onInitEditMode.bind(this));
  }

  onInitEditMode() {
    this.addEditorTab('Options', 'public/plugins/grafana-graph3d-panel/editor.html', 2);
  }

  onDataError() {
    this.series = [];
    this.render();
  }

  onRender() {
    this.data = this.parseSeries(this.series);
  }

  parseSeries(series) {
    return _.map(this.series, (serie, i) => {
      return {
        label: serie.alias,
        datapoints: serie.datapoints
      };
    });
  }

  onDataReceived(dataList) {
    this.series = dataList.map(this.seriesHandler.bind(this));
    this.data = this.parseSeries(this.series);
    this.render(this.data);
  }

  seriesHandler(seriesData) {
    var series = new TimeSeries({
      datapoints: seriesData.datapoints,
      alias: seriesData.target
    });

    return series;
  }

  setUnitFormat(column, subItem) {
    column.unit = subItem.value;
    this.render(this.data);
  };

  resetCameraPosition() {
    // See http://visjs.org/docs/graph3d/#Methods
    this.panel.cameraPosition = {
      horizontal: 1.0,
      vertical:   0.5,
      distance:   1.7
    };
    this.render(this.data);
  }

  loadCameraPosition() {
    this.panel.cameraPosition = this.currentCameraPosition;
  }

  formatValue(value) {
    return value;
  }

  link(scope, elem, attrs, ctrl) {
    this.graph3d = rendering(scope, elem, attrs, ctrl);
  }
}

SunburstCtrl.templateUrl = 'module.html';
