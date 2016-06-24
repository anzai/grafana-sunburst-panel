import './css/sunburst.css!';
import _ from 'lodash';
import $ from 'jquery';
import moment from 'moment';
import kbn from 'app/core/utils/kbn';
import d3 from './d3.v3.min';

export default function link(scope, elem, attrs, ctrl) {
  var data, panel;
  var formater = [];

  elem = elem.find('.sunburst');

  ctrl.events.on('render', function() {
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
    } catch(e) { // IE throws errors sometimes
      return false;
    }
  }

  function render() {
    if (!ctrl.data) { return; }

    data = ctrl.data;
    panel = ctrl.panel;

    if (setElementHeight()) {
      addSunburst();
    }
  }

  function createValueFormater(style) {
    var defaultFormater = function(v) {
      return v;
    };

    if (! style) {
      return defaultFormater;
    }

    switch (style.type) {
    case 'date':
      return v => {
        v = parseFloat(v);
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
        v = parseFloat(v);
        return valueFormater(v, style.decimals, null);
      };
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
    var width = elemWidth - margin.left - margin.right;
    var height = elemHeight - margin.top - margin.bottom - tooltipHeight;
    var radius = Math.min(width, height) / 2;

    d3.select("#sunburst-g-" + ctrl.panel.id).remove();

    var svg = d3.select("#sunburst-svg-" + ctrl.panel.id)
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
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

    // Set colors
    var color = function(d) {
      var colors;

      if (!d.parent) {
        colors = d3.scale.category10()
          .domain(d3.range(0, 10));
        d.color = 'transparent';

      } else if (d.children) {
        var startColor = d3.hcl(d.color).darker(),
            endColor   = d3.hcl(d.color).brighter();

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

    d3.csv("dummy", function(error, dataset) {
      // Load data
      var hierarchy = _createHierarchy(data[0].datapoints);
      var path = svg.selectAll("path")
        .data(partition.nodes(hierarchy))
        .enter()
        .append("path")
        .attr("d", arc)
        .attr("stroke", "#fff")
        .attr("fill-rule", "evenodd")
        .attr("fill", color)
        .on("click", click)
        .on("mouseover", mouseover)
        .on("mouseout", mouseout);

      // Set tooltip
      var valueFormater = formater[_.last(panel.nodeKeys)];
      var tooltip = d3.select("#sunburst-tooltip-" + ctrl.panel.id + ' > a')
        .attr('href', panel.linkPrefix)
        .text(panel.rootKey + ': ' + valueFormater(hierarchy.value));

      // Set actions
      function click(d) {
        path.transition()
         .duration(750)
         .attrTween("d", arcTween(d));
        mouseout();
      };

      function mouseover(d) {
        var nodeArray = _getNodeArray(d);

        //console.log(nodeArray);
        var nodePath = '';
        var linkParams = [];
        if (nodeArray.length > 0) {
          var formatedKeys = [];
          _.each (nodeArray, function(node, i) {
            var key = panel.nodeKeys[i];
            var valueFormater = formater[key];
            formatedKeys[i] = valueFormater(node.key)
            linkParams[i] = key + '=' + node.key;
          });

          nodePath = formatedKeys.join(' > ');

        } else {
          nodePath = panel.rootKey;
        }

        var key = _.last(panel.nodeKeys);
        var valueFormater = formater[key];
        var value = valueFormater(d.value);

        var tooltipHref = null;
        if (panel.linkPrefix) {
          var delimiter = (panel.linkPrefix.indexOf('\?') != -1) ? '&' : '?';
          tooltipHref = panel.linkPrefix + delimiter + linkParams.join('&');
        }

        tooltip
        .attr('href', tooltipHref)
        .text(nodePath + ": " + value)
          .transition()
          .attr("fill-opacity", 1);
      };

      function mouseout() {
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

    function _createHierarchy(datapoints) {
      panel.nodeKeys = _.keys(datapoints[0]);

      var nest = d3.nest();
      _.each(panel.nodeKeys, function(key, i) {
        formater[key] = createValueFormater(panel.styles[key]);

        if (i !== panel.nodeKeys.length - 1) {
          nest = nest.key(function(d) { return d[key]; });
        } else {
          nest = nest.rollup(function(leaves) {
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
  }
}

