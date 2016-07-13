# grafana-sunburst-panel

The sunburst panel is a more powerful pie chart.
It can contain nested group data.

![Graph](https://raw.githubusercontent.com/anzai/grafana-sunburst-panel/master/src/img/graph.png)

## Features

### Tooltips

Tooltip is shown on mouse over of each arch node.
Tooltip of a node shows information about same-leveled nodes and its child nodes.

![Tooltip (node)](https://raw.githubusercontent.com/anzai/grafana-sunburst-panel/master/src/img/tooltip_node.png)

<dl>
<dt>sum</dt>
<dd>The value of a node. If the node has children, the value of the node means sum of the values of its children.</dd>
<dt>average</dt>
<dd>If the node has children, the value of the node means average of the values of its children.</dd>
<dt>rate</dt>
<dd>The rate against the value of parent node.</dd>
</dl>

### Drill down

If you click an node in the graph, the graph transforms to zoom and show the child nodes.

![Drill down](https://raw.githubusercontent.com/anzai/grafana-sunburst-panel/master/src/img/drilldown.png)

## Supported datasources and formats

| Data source          | TimeSeries | Table | Docs |
|:---------------------|:----------:|:-----:|:----:|
| ElasticSearch        | OK         | --    | OK   |
| InfluxDB             | OK         | OK    | --   |
| Sqldb (not released) | OK         | OK    | OK   |

- Docs is the format returned by terms-aggregation in ElasticSearch.

# License

Apache V2.0 License
