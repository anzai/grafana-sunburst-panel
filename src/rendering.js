import './css/sunburst.css!';
import _ from 'lodash';
import $ from 'jquery';
import moment from 'moment';
import kbn from 'app/core/utils/kbn';
import d3 from './d3.v3.min';

export default function link(scope, elem, attrs, ctrl) {
  var data, panel;
  var formaters = [];

  elem = elem.find('.sunburst');

  ctrl.events.on('render', function() {
    render();
    ctrl.renderingCompleted();
  });

  function render() {
    if (!ctrl.data) { return; }

    data = ctrl.data;
    panel = ctrl.panel;

    if (setElementHeight()) {
      addSunburst();
    }
  }

  /* ----------------------------------------------------------------------- */
  /* Draw                                                                    */
  /* ----------------------------------------------------------------------- */

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
    } catch(e) { // IE throws errors sometimes
      return false;
    }
  }

  function addSunburst() {
    if (data.length === 0 || data[0].datapoints.length === 0) {
      return;
    }
    var rawData = data[0].datapoints;
    var rawHierarchy = createHierarchy(rawData);

    panel.nodeKeys = _.keys(rawData[0]);

    // Prepare <svg> and <g>
    var elemWidth = elem.width();
    var elemHeight = elem.height();
    var margin = { top: 10, right: 10, bottom: 10, left: 10 };
    var tooltipHeight = 0; //25;
    var tooltipWidth = 0; //maxLength * 10;
    var sidebarWidth = tooltipWidth + 10;
    var width = elemWidth - margin.left - margin.right - tooltipWidth;
    var height = elemHeight - margin.top - margin.bottom - tooltipHeight;
    var radius = Math.min(width, height) / 2;

    d3.select("#sunburst-sidebar-" + ctrl.panel.id)
      .attr('style', 'float: right; width: ' + sidebarWidth + 'px');

    d3.select("#sunburst-g-" + ctrl.panel.id).remove();

    var svg = d3.select("#sunburst-svg-" + ctrl.panel.id)
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .on("click", function() {
        d3.select("#sunburst-tooltip-" + ctrl.panel.id)
          .classed('hidden', true);
      })
    .append('g')
      .attr('id', "sunburst-g-" + ctrl.panel.id)
      .attr("transform", "translate(" +
        (margin.left + width  / 2) + ", " +
        (margin.top  + height / 2) + ")"
      );

    var x = d3.scale.linear().range([0, 2 * Math.PI]);
    var y = d3.scale.sqrt().range([0, radius]);

    var partition = d3.layout.partition()
      .children(function(d) {
        return Array.isArray(d.values) ?
          d.values : null;
      })
      .value(function(d) {
        return d.values;
      });

    d3.csv("", function(error, dataset) {
      // Set colors
      var color = function(d) {
        var colors;

        if (! d.parent) {
          var scale;

          if (rawHierarchy.values.length < 10) {
            scale = d3.scale.category10();
          } else {
            scale = d3.scale.category20();
          }
          colors = scale.domain(d3.range(0, 10));
          d.color = 'transparent';

        } else if (d.children) {
          var startColor = d3.hcl(d.color).darker();
          var endColor   = d3.hcl(d.color).brighter();

          colors = d3.scale.linear()
            .interpolate(d3.interpolateHcl)
            .range([
              startColor.toString(),
              endColor.toString()
            ])
            .domain([0, d.children.length + 1]);
        }

        if (d.children) {
          d.children.map(function(child, i) {
            return { value: child.value, idx: i};
          })
          .sort(function(a,b) {
            return b.value - a.value
          })
          .forEach(function(child, i) {
            d.children[child.idx].color = colors(i);
          });
        }

        return d.color;
      };

      // Draw
      var path = svg.selectAll("path")
        .data(partition.nodes(rawHierarchy))
        .enter()
      .append("path")
        .attr("d", arc)
        .attr("stroke", "#fff")
        .attr("fill-rule", "evenodd")
        .attr("fill", color)
        .on("click", click)
        .on("mouseover", mouseover)
        .on("mouseout", mouseout);

      // Set actions
      function click(d) {
        path.transition()
         .duration(750)
         .attrTween("d", arcTween(d));

        mouseout();
      };

      function mouseover(d) {
        var position = d3.mouse(d3.select('#sunburst-div-' + ctrl.panel.id).node());
        _updateTooltip(d, position);
      };

      function mouseout(d) {
      };
    });

    var arc = d3.svg.arc()
      .startAngle(function(d) {
        return Math.max(0, Math.min(2 * Math.PI, x(d.x)));
      })
      .endAngle(function(d) {
        return Math.max(0, Math.min(2 * Math.PI, x(d.x + d.dx)));
      })
      .innerRadius(function(d) {
        return Math.max(0, y(d.y));
      })
      .outerRadius(function(d) {
        return Math.max(0, y(d.y + d.dy));
      });

    function arcTween(d) {
      var xd = d3.interpolate(x.domain(), [d.x, d.x + d.dx]);
      var yd = d3.interpolate(y.domain(), [d.y, 1]);
      var yr = d3.interpolate(y.range(), [d.y ? 20 : 0, radius]);

      return function(d, i) {
        return i ?
          function(t) {
            return arc(d);
          } :
          function(t) {
            x.domain(xd(t));
            y.domain(yd(t)).range(yr(t));
            return arc(d);
          };
      };
    }

    function _updateTooltip(d, position) {
      var lines = [];
      var linkParams = [];

      if (d.depth > 0) {
        var ancectors = getAncestors(d);
        _.each(ancectors, function(ancector, i) {
          lines.push(
              '<li style="border-left: 3px solid ' + ancector.color + '">' +
              panel.nodeKeys[i] + ': ' + format(ancector.key, ancector.depth - 1) +
              '</li>'
          );
          linkParams.push(ancector.key);
        });
      } else {
        lines.push('root: ' + panel.rootKey);
      }

      lines.push(
        '<li style="border-left: 3px solid ' + d.color + '">' +
        _.last(panel.nodeKeys) + ': ' + format(d.value, panel.nodeKeys.length - 1) +
        '</li>'
      );

      if (panel.linkPrefix) {
        var delimiter = (panel.linkPrefix.indexOf('\?') != -1) ? '&' : '?';
        var tooltipHref = panel.linkPrefix + delimiter + linkParams.join('&');
        lines.push('<li><a href="' + tooltipHref + '" target="_blank">[link]</a></li>');
      }

      var text = lines.join('<br>');

      var tooltip = d3.select("#sunburst-tooltip-" + ctrl.panel.id)
          .style("left", (position[0] + 10) + "px")
          .style("top",  (position[1] + 10) + "px")
          .classed("hidden", false);

      tooltip.select('ul').remove();

      tooltip
          .append('ul')
          .html(text);
    }

    function _hideTooltip() {
      d3.select("#sunburst-tooltip-" + ctrl.panel.id)
        .classed('hidden', true);
    }
  }

  /* ----------------------------------------------------------------------- */
  /* Functions                                                               */
  /* ----------------------------------------------------------------------- */

  function createValueFormater(style) {
    var defaultFormater = function(v) {
      return v;
    };

    if (! style) {
      return defaultFormater;
    }

    switch (style.type) {
    case 'date':
      var dateFormater = function(v) {
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
      var numberFormater = function(v) {
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

  function createHierarchy(datapoints) {
    var nest = d3.nest();
    _.each(panel.nodeKeys, function(key, depth) {
      // Prepare formaters
      formaters[depth] = createValueFormater(panel.styles[key]);

      // Prepare nest
      if (depth !== panel.nodeKeys.length - 1) {
        nest = nest.key(function(d) { return d[key]; });
      } else {
        nest = nest.rollup(function(leaves) {
          return leaves[0][key];
        });
      }
    });

    var rtn = {
      key: panel.rootKey,
      values: nest.entries(datapoints)
    };

    return rtn;
  }

  function format(value, depth) {
    var rtn = value;

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
    return rtn;
  }
}

