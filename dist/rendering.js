'use strict';

System.register(['lodash', 'jquery', 'moment', 'app/core/utils/kbn', './d3.v3.min'], function (_export, _context) {
  "use strict";

  var _, $, moment, kbn, d3;

  function link(scope, elem, attrs, ctrl) {
    var data, panel, position;

    elem = elem.find('.sunburst-panel');
    ctrl.events.on('render', function () {
      render();
      ctrl.renderingCompleted();
    });

    function setElementHeight() {
      try {
        var height = ctrl.height || panel.height || ctrl.row.height;
        if (_.isString(height)) {
          height = parseInt(height.replace('px', ''), 10);
        }

        height -= 5; // padding
        height -= panel.title ? 24 : 9; // subtract panel title bar

        elem.css('height', height + 'px');

        return true;
      } catch (e) {
        // IE throws errors sometimes
        return false;
      }
    }

    function render() {
      if (!ctrl.data) {
        return;
      }

      data = ctrl.data;
      panel = ctrl.panel;

      if (setElementHeight()) {
        addSunburst();
      }
    }

    /*
    function getKey(arr, val) {
      return parseInt(_.keys(arr).find(function(key) {
        return arr[key] == val;
      }));
    }
     function createColumnFormater(style) {
      var defaultFormater = function(v) {
        if (v === null || v === void 0 || v === undefined) {
          return '';
        }
        if (_.isArray(v)) {
          v = v.join(', ');
        }
        return v;
      };
       if (! style) {
        return defaultFormater;
      }
       switch (style.type) {
      case 'date':
        return v => {
          if (_.isArray(v)) { v = v[0]; }
          var date = moment(v);
          if (ctrl.dashboard.isTimezoneUtc()) {
            date = date.utc();
          }
          return date.format(style.dateFormat || 'YYYY-MM-DD HH:mm:ss');
        };
        break;
       case 'number':
        var valueFormater = kbn.valueFormats[style.unit];
         return v =>  {
          if (v === null || v === void 0) {
            return '-';
          }
           if (_.isString(v)) {
            return v;
          }
           return valueFormater(v, style.decimals, null);
        };
        break;
       default:
        return defaultFormater;
      }
     }
    */

    function addSunburst() {
      if (data.length === 0) {
        return;
      }
      var elemWidth = elem.width();
      var elemHeight = elem.height();
      var margin = { top: 30, right: 10, bottom: 20, left: 10 };
      var width = elemWidth - margin.left - margin.right;
      var height = elemHeight - margin.top - margin.bottom;
      var radius = Math.min(width, height) / 2;

      d3.select("#sunburst-panel-g-" + ctrl.panel.id).remove();

      var svg = d3.select("#sunburst-panel-svg-" + ctrl.panel.id).attr("width", width + margin.left + margin.right).attr("height", height + margin.top + margin.bottom).append('g').attr('id', "sunburst-panel-g-" + ctrl.panel.id).attr("transform", "translate(" + (margin.left + width / 2) + ", " + (margin.top + height / 2) + ")");

      var x = d3.scale.linear().range([0, 2 * Math.PI]);
      var y = d3.scale.sqrt().range([0, radius]);

      var partition = d3.layout.partition().children(function (d) {
        return Array.isArray(d.values) ? d.values : null;
      }).value(function (d) {
        return d.values;
      });

      var color = function color(d) {
        var colors;

        if (!d.parent) {
          colors = d3.scale.category10().domain(d3.range(0, 10));
          d.color = 'transparent';
        } else if (d.children) {
          var startColor = d3.hcl(d.color).darker(),
              endColor = d3.hcl(d.color).brighter();

          colors = d3.scale.linear().interpolate(d3.interpolateHcl).range([startColor.toString(), endColor.toString()]).domain([0, d.children.length + 1]);
        }

        if (d.children) {
          d.children.map(function (child, i) {
            return { value: child.value, idx: i };
          }).sort(function (a, b) {
            return b.value - a.value;
          }).forEach(function (child, i) {
            d.children[child.idx].color = colors(i);
          });
        }

        return d.color;
      };

      //d3.csv("public/plugins/grafana-sunburst-panel/tornadoes.csv", function(error, dataset) {
      d3.csv("dummy", function (error, dataset) {
        var hierarchy = {
          key: "United States",
          values: d3.nest().key(function (d) {
            return d.region;
          }).key(function (d) {
            return d.state;
          }).key(function (d) {
            return d.county;
          }).rollup(function (leaves) {
            //return leaves.length;
            return leaves[0].count;
          }).entries(data[0].datapoints)
        };

        var path = svg.selectAll("path").data(partition.nodes(hierarchy)).enter().append("path").attr("d", arc).attr("stroke", "#fff").attr("fill-rule", "evenodd").attr("fill", color).on("click", click).on("mouseover", mouseover).on("mouseout", mouseout);

        var tooltip = svg.append("text").attr("font-size", 12).attr("fill", "#fff").attr("fill-opacity", 0).attr("text-anchor", "middle").attr("transform", "translate(" + 0 + "," + (12 + height / 2) + ")").style("pointer-events", "none");

        function click(d) {
          path.transition().duration(750).attrTween("d", arcTween(d));
          mouseout();
        };

        function mouseover(d) {
          tooltip.text(d.key + ": " + d.value + " sighting" + (d.value > 1 ? "s" : "")).transition().attr("fill-opacity", 1);
        };

        function mouseout() {
          tooltip.transition().attr("fill-opacity", 0);
        };
      });

      var arc = d3.svg.arc().startAngle(function (d) {
        return Math.max(0, Math.min(2 * Math.PI, x(d.x)));
      }).endAngle(function (d) {
        return Math.max(0, Math.min(2 * Math.PI, x(d.x + d.dx)));
      }).innerRadius(function (d) {
        return Math.max(0, y(d.y));
      }).outerRadius(function (d) {
        return Math.max(0, y(d.y + d.dy));
      });

      function arcTween(d) {
        var xd = d3.interpolate(x.domain(), [d.x, d.x + d.dx]),
            yd = d3.interpolate(y.domain(), [d.y, 1]),
            yr = d3.interpolate(y.range(), [d.y ? 20 : 0, radius]);

        return function (d, i) {
          return i ? function (t) {
            return arc(d);
          } : function (t) {
            x.domain(xd(t));
            y.domain(yd(t)).range(yr(t));
            return arc(d);
          };
        };
      }

      /*
      var formater = {
          x: createColumnFormater(panel.styles.x),
          y: createColumnFormater(panel.styles.y),
          z: createColumnFormater(panel.styles.z)
      };
       var labels = _.pluck(data, 'label');
       var datapoints = [];
      datapoints.push(_.map(data[0].datapoints, function(dp) {
        return formater.x(dp[1]);
      }));
      datapoints = datapoints.concat(_.map(data, function(serie) {
        return _.map(serie.datapoints, function(dp) {
          return dp[0];
        });
      }));
       var valueLabels = _.map(datapoints, function(dp, i) {
        if (i < 2) {
          return _.uniq(dp);
        }
      });
       // dataset
      var graphdata = new vis.DataSet();
      for (var i = 0; i < datapoints[0].length; i += 1) {
        graphdata.add({
          x: getKey(valueLabels[0], datapoints[0][i]),
          y: getKey(valueLabels[1], datapoints[1][i]),
          z: datapoints[2][i],
          style: datapoints[2][i]
        });
      }
       // prepare div for canvas
      var plotDiv = document.createElement('div');
       // css
      var width = elem.width();
      var height = elem.height();
      $(plotDiv).css({
        width: width + 'px',
        height: height + 'px',
        margin: 'auto',
        position: 'relative'
      });
       var axisLabels = {
          x: panel.styles.x.label || 'time',
          y: panel.styles.y.label || labels[0],
          z: panel.styles.z.label || labels[1]
      };
      var units = {
          x: kbn.valueFormats[panel.styles.x.unit] || panel.styles.x.unit || '',
          y: kbn.valueFormats[panel.styles.y.unit] || panel.styles.y.unit || '',
          z: kbn.valueFormats[panel.styles.z.unit] || panel.styles.z.unit || ''
      };
       var options = {
        width: width + 'px',
        height: height + 'px',
        axisColor: '#888888',
         style:           panel.graphType,
        showGrid:        true,
        showShadow:      false,
        showPerspective: panel.showPerspective || false,
        verticalRatio:   panel.verticalRatio || 0.5,
        keepAspectRatio: panel.keepAspectRatio || false,
         xLabel: axisLabels.x,
        yLabel: axisLabels.y,
        zLabel: axisLabels.z,
         xMin: panel.styles.x.min || null,
        yMin: panel.styles.y.min || null,
        zMin: panel.styles.z.min || null,
         xMax: panel.styles.x.max || null,
        yMax: panel.styles.y.max || null,
        zMax: panel.styles.z.max || null,
         xStep: panel.styles.x.step || null,
        yStep: panel.styles.y.step || null,
        zStep: panel.styles.z.step || null,
         xValueLabel: function(key) {
          return formater.x(valueLabels[0][key]);
        },
        yValueLabel: function(key) {
          return formater.y(valueLabels[1][key]);
        },
        zValueLabel: function(key) {
          return formater.z(key);
        },
         tooltip: function (point) {
           return axisLabels.x + ': ' + formater.x(valueLabels[0][point.x]) + '<br>' +
                  axisLabels.y + ': ' + formater.y(valueLabels[1][point.y]) + '<br>' +
                  axisLabels.z + ': ' + '<b>' + formater.z(point.z) + '</b>';
        }
      };
       for (var key in options) {
          if (options[key] === null) {
             delete options[key];
          }
      }
       // draw
      var graph3d = new vis.Graph3d(plotDiv, graphdata, options);
      graph3d.on('cameraPositionChange', onCameraPositionChange);
      graph3d.setCameraPosition(panel.cameraPosition);
       elem.html(plotDiv);
      graph3d.redraw();
      */
    }
  }

  _export('default', link);

  return {
    setters: [function (_lodash) {
      _ = _lodash.default;
    }, function (_jquery) {
      $ = _jquery.default;
    }, function (_moment) {
      moment = _moment.default;
    }, function (_appCoreUtilsKbn) {
      kbn = _appCoreUtilsKbn.default;
    }, function (_d3V3Min) {
      d3 = _d3V3Min.default;
    }],
    execute: function () {}
  };
});
//# sourceMappingURL=rendering.js.map
