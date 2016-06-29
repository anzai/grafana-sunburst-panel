'use strict';

System.register(['./css/sunburst.css!', 'lodash', 'jquery', 'moment', 'app/core/utils/kbn', './d3.v3.min'], function (_export, _context) {
  "use strict";

  var _, $, moment, kbn, d3;

  function link(scope, elem, attrs, ctrl) {
    var data, panel;
    var formater = [];

    elem = elem.find('.sunburst');

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

    function createValueFormater(style) {
      var defaultFormater = function defaultFormater(v) {
        return v;
      };

      if (!style) {
        return defaultFormater;
      }

      switch (style.type) {
        case 'date':
          var dateFormater = function dateFormater(v) {
            v = parseFloat(v);
            var date = moment(v);
            if (ctrl.dashboard.isTimezoneUtc()) {
              date = date.utc();
            }
            return date.format(style.dateFormat || 'YYYY-MM-DD HH:mm:ss');
          };
          return dateFormater;
          break;

        case 'number':
          var numberFormater = function numberFormater(v) {
            var valueFormater = kbn.valueFormats[style.unit];
            v = parseFloat(v);
            return valueFormater(v, style.decimals, null);
          };
          return numberFormater;
          break;

        default:
          return defaultFormater;
      }
    }

    function addSunburst() {
      if (data.length === 0 || data[0].datapoints.length === 0) {
        return;
      }

      // Prepare <svg> and <g>
      var elemWidth = elem.width();
      var elemHeight = elem.height();
      var margin = { top: 10, right: 10, bottom: 10, left: 10 };
      var tooltipHeight = 25;
      var sidebarWidth = 100;
      var width = elemWidth - margin.left - margin.right - sidebarWidth;
      var height = elemHeight - margin.top - margin.bottom - tooltipHeight;
      var radius = Math.min(width, height) / 2;

      d3.select("#sunburst-g-" + ctrl.panel.id).remove();

      var svg = d3.select("#sunburst-svg-" + ctrl.panel.id).attr("width", width + margin.left + margin.right).attr("height", height + margin.top + margin.bottom).append('g').attr('id', "sunburst-g-" + ctrl.panel.id).attr("transform", "translate(" + (margin.left + width / 2) + ", " + (margin.top + height / 2) + ")");

      var x = d3.scale.linear().range([0, 2 * Math.PI]);
      var y = d3.scale.sqrt().range([0, radius]);

      var partition = d3.layout.partition().children(function (d) {
        return Array.isArray(d.values) ? d.values : null;
      }).value(function (d) {
        return d.values;
      });

      // Load data
      var hierarchy = _createHierarchy(data[0].datapoints);

      d3.csv("dummy", function (error, dataset) {
        // Set colors
        var color = function color(d) {
          var colors;

          if (!d.parent) {
            var scale;

            if (hierarchy.values.length < 10) {
              scale = d3.scale.category10();
            } else {
              scale = d3.scale.category20();
            }
            colors = scale.domain(d3.range(0, 10));
            d.color = 'transparent';
          } else if (d.children) {
            var startColor = d3.hcl(d.color).darker();
            var endColor = d3.hcl(d.color).brighter();

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

        // Draw
        var path = svg.selectAll("path").data(partition.nodes(hierarchy)).enter().append("path").attr("d", arc).attr("stroke", "#fff").attr("fill-rule", "evenodd").attr("fill", color).on("click", click).on("mouseover", mouseover).on("mouseout", mouseout);

        // Set tooltip
        var tooltip = d3.select("#sunburst-tooltip-" + ctrl.panel.id + ' > a').attr('href', panel.linkPrefix).text(panel.rootKey + ': ' + _formatValue(hierarchy.value, panel.nodeKeys.length - 1));

        // Set legend
        d3.select('#sunburst-toggle-' + ctrl.panel.id).on("click", toggleLegend);

        // Set actions
        function click(d) {
          path.transition().duration(750).attrTween("d", arcTween(d));

          mouseout();
        };

        function mouseover(d) {
          _updateTooltip(d);
          _updateLegend(d);
        };

        function mouseout() {
          _removeLegend();
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
        var xd = d3.interpolate(x.domain(), [d.x, d.x + d.dx]);
        var yd = d3.interpolate(y.domain(), [d.y, 1]);
        var yr = d3.interpolate(y.range(), [d.y ? 20 : 0, radius]);

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

      function _createHierarchy(datapoints) {
        panel.nodeKeys = _.keys(datapoints[0]);

        var nest = d3.nest();
        _.each(panel.nodeKeys, function (key, depth) {
          formater[depth] = createValueFormater(panel.styles[key]);

          if (depth !== panel.nodeKeys.length - 1) {
            nest = nest.key(function (d) {
              return d[key];
            });
          } else {
            nest = nest.rollup(function (leaves) {
              return leaves[0][key];
            });
          }
        });

        var hierarchy = {
          key: panel.rootKey,
          values: nest.entries(datapoints)
        };

        return hierarchy;
      }

      function _getNodeArray(d) {
        var nodeArray = [];
        var current = d;
        while (current.parent) {
          nodeArray.unshift(current);
          current = current.parent;
        }
        return nodeArray;
      }

      function _formatValue(value, depth) {
        if (formater[depth]) {
          var valueFormater = formater[depth];
          value = valueFormater(value);
        }

        return value;
      }

      function _updateTooltip(d) {
        var nodeArray = _getNodeArray(d);

        var nodePath = '';
        var linkParams = [];
        if (nodeArray.length > 0) {
          var formatedKeys = [];
          _.each(nodeArray, function (node, i) {
            formatedKeys[i] = _formatValue(node.key, node.depth - 1);
            linkParams[i] = panel.nodeKeys[i] + '=' + node.key;
          });

          nodePath = formatedKeys.join(' > ');
        } else {
          nodePath = panel.rootKey;
        }

        var value = _formatValue(d.value, panel.nodeKeys.length - 1);

        var tooltipHref = null;
        if (panel.linkPrefix) {
          var delimiter = panel.linkPrefix.indexOf('\?') != -1 ? '&' : '?';
          tooltipHref = panel.linkPrefix + delimiter + linkParams.join('&');
        }

        d3.select("#sunburst-tooltip-" + ctrl.panel.id + ' > a').attr('href', tooltipHref).text(nodePath + ": " + value).transition().attr("fill-opacity", 1);
      }

      function _removeLegend() {
        d3.select('#sunburst-legend-' + ctrl.panel.id + ' > svg').remove();
      }

      function _updateLegend(d) {
        _removeLegend();

        if (d.values === undefined) {
          return;
        }
        var colors = [];
        _.each(d.values, function (node) {
          colors[node.key] = node.color;
        });

        var li = {
          w: 75, h: 30, s: 3, r: 3
        };

        var legend = d3.select('#sunburst-legend-' + ctrl.panel.id).append('svg').attr("width", li.w).attr("height", d3.keys(colors).length * (li.h + li.s));

        var g = legend.selectAll("g").data(d3.entries(colors)).enter().append("svg:g").attr("transform", function (d, i) {
          return "translate(0," + i * (li.h + li.s) + ")";
        });

        g.append("svg:rect").attr("rx", li.r).attr("ry", li.r).attr("width", li.w).attr("height", li.h).style("fill", function (d) {
          return d.value;
        });

        g.append("svg:text").attr("x", li.w / 2).attr("y", li.h / 2).attr("dy", "0.35em").attr("text-anchor", "middle").style('font-size', '7').style('fill', '#fff').text(function (d) {
          return _formatValue(d.key, d.depth);
        });
      }

      function toggleLegend() {
        var legend = d3.select('#sunburst-legend-' + ctrl.panel.id);
        var checked = d3.select('#sunburst-sidebar-' + ctrl.panel.id).prop('checked');

        if (checked) {
          legend.style("visibility", "");
        } else {
          legend.style("visibility", "hidden");
        }
      }
    }
  }

  _export('default', link);

  return {
    setters: [function (_cssSunburstCss) {}, function (_lodash) {
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
