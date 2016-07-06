'use strict';

System.register(['./css/sunburst.css!', 'lodash', 'jquery', 'moment', 'app/core/utils/kbn', './d3.v3.min'], function (_export, _context) {
  "use strict";

  var _, $, moment, kbn, d3;

  function link(scope, elem, attrs, ctrl) {
    var data, panel;
    var formaters = [];

    elem = elem.find('.sunburst');

    ctrl.events.on('render', function () {
      render();
      ctrl.renderingCompleted();
    });

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

    function addSunburst() {
      // Prepare data
      if (data.length === 0 || data[0].datapoints.length === 0) {
        return;
      }
      var rawData = data[0].datapoints;
      var hierarchy = createHierarchy(rawData);

      panel.nodeKeys = _.keys(rawData[0]);

      var partition = d3.layout.partition().children(function (d) {
        return Array.isArray(d.values) ? d.values : null;
      }).value(function (d) {
        return d.values;
      });

      // Configure graph size
      var elemWidth = elem.width();
      var elemHeight = elem.height();
      var margin = { top: 10, right: 10, bottom: 10, left: 10 };
      var width = elemWidth - margin.left - margin.right;
      var height = elemHeight - margin.top - margin.bottom;
      var radius = Math.min(width, height) / 2;

      // Configure actions
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

      var mouseout = function mouseout(d) {};

      var click = function click(d) {
        svg.selectAll("path").transition().duration(750).attrTween("d", arcTween(d));

        mouseout();
      };

      var mouseover = function mouseover(d) {
        var position = d3.mouse(d3.select('#sunburst-div-' + ctrl.panel.id).node());
        updateTooltip(d, position);
      };

      var x = d3.scale.linear().range([0, 2 * Math.PI]);
      var y = d3.scale.sqrt().range([0, radius]);

      var arc = d3.svg.arc().startAngle(function (d) {
        return Math.max(0, Math.min(2 * Math.PI, x(d.x)));
      }).endAngle(function (d) {
        return Math.max(0, Math.min(2 * Math.PI, x(d.x + d.dx)));
      }).innerRadius(function (d) {
        return Math.max(0, y(d.y));
      }).outerRadius(function (d) {
        return Math.max(0, y(d.y + d.dy));
      });

      var arcTween = function arcTween(d) {
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
      };

      // Draw graph
      d3.select("#sunburst-g-" + ctrl.panel.id).remove();

      var svg = d3.select("#sunburst-svg-" + ctrl.panel.id).attr("width", width + margin.left + margin.right).attr("height", height + margin.top + margin.bottom).on("click", function () {
        d3.select("#sunburst-tooltip-" + ctrl.panel.id).classed('hidden', true);
      }).append('g').attr('id', "sunburst-g-" + ctrl.panel.id).attr("transform", "translate(" + (margin.left + width / 2) + ", " + (margin.top + height / 2) + ")");

      var path = svg.selectAll("path").data(partition.nodes(hierarchy)).enter().append("path").attr("d", arc).attr("stroke", "#fff").attr("fill-rule", "evenodd").attr("fill", color).on("click", click).on("mouseover", mouseover).on("mouseout", mouseout);
    }

    // Functions
    function createHierarchy(datapoints) {
      var nest = d3.nest();
      _.each(panel.nodeKeys, function (key, depth) {
        // Prepare formaters
        formaters[depth + 1] = createValueFormater(panel.styles[key]);

        // Prepare nest
        if (depth !== panel.nodeKeys.length - 1) {
          nest = nest.key(function (d) {
            return d[key];
          });
        } else {
          nest = nest.rollup(function (v) {
            return v[0][key];
          });
        }
      });

      var rtn = {
        key: panel.rootKey,
        values: nest.entries(datapoints)
      };

      return rtn;
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

    function format(value, depth) {
      var rtn = value;

      if (depth === null) {
        depth = formaters.length - 1;
      }

      if (formaters[depth]) {
        var valueFormater = formaters[depth];
        rtn = valueFormater(value);
      }

      return rtn;
    }

    function getAncestors(node) {
      var rtn = [];
      var current = node;
      while (current.parent) {
        rtn.unshift(current);
        current = current.parent;
      }
      rtn.unshift(current);
      return rtn;
    }

    function floorPercent(value) {
      // Format like "12.34"
      var rtn = String(Math.floor(value * 10000) / 100);
      if (rtn === '100') {
        rtn = '100.00';
      }
      return rtn;
    }

    function updateTooltip(d, position) {
      var lines = [];
      var linkParams = [];
      var tooltipHref = panel.linkTemplate;

      var ancectors = getAncestors(d);
      var totalValue = ancectors[0].value;

      _.each(ancectors, function (ancector, i) {
        var avg = ancector.children ? ancector.value / ancector.children.length : ancector.value;
        var rate = floorPercent(ancector.value / totalValue);

        var line = {
          key: format(ancector.key, ancector.depth),
          value: format(ancector.value, null),
          avg: format(avg, null),
          rate: String(rate) + '%',
          group: panel.nodeKeys[i],
          depth: ancector.depth,
          color: ancector.color
        };

        lines.push(line);

        if (panel.linkTemplate) {
          tooltipHref = tooltipHref.replace('\$' + String(i + 1), ancector.key);
        }
      });

      if (panel.linkTemplate) {
        tooltipHref = tooltipHref.replace(/\/\$\d*/g, '');
      }

      var tooltip = d3.select("#sunburst-tooltip-" + ctrl.panel.id).style("left", position[0] + "px").style("top", position[1] + "px").classed("hidden", false);

      tooltip.select('table').remove();

      var table = tooltip.append('table');
      var thead = table.append('thead');
      var tbody = table.append('tbody');

      var headerCols = ['field', 'sum', 'average', 'rate'];
      thead.append('tr').selectAll('td').data(headerCols).enter().append('td').text(function (d) {
        return d;
      });

      _.each(lines, function (l) {
        var tr = tbody.append('tr');

        tr.append('th').text(l.key).style({ 'border-left-color': l.color });
        tr.append('td').text(l.value);
        tr.append('td').text(l.avg);
        tr.append('td').text(l.rate);
      });
    }

    function hideTooltip() {
      d3.select("#sunburst-tooltip-" + ctrl.panel.id).classed('hidden', true);
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
