// Copyright 2016, EMC, Inc.

'use strict';

var di = require('di');

module.exports = workflowToolFactory;

di.annotate(workflowToolFactory, new di.Provide('JobUtils.WorkflowTool'));
di.annotate(workflowToolFactory, new di.Inject(
    'Protocol.TaskGraphRunner',
    'TaskGraph.TaskGraph',
    'TaskGraph.Store',
    'Services.Waterline',
    'Constants',
    'Errors',
    'Assert',
    '_',
    'Promise'
));

function workflowToolFactory(
    taskGraphProtocol,
    TaskGraph,
    taskGraphStore,
    waterline,
    Constants,
    Errors,
    assert,
    _,
    Promise
) {
    function WorkflowTool() {}

    /**
     * Run graph by injectableName
     *
     * @param {String} nodeId - The node identifier that the graph will run against
     * @param {String} graphName - The injectableName of graph
     * @param {Object} options - The graph options
     * @param {String} domain - The domain of the target graph
     * @return {Promise}
     */
    WorkflowTool.prototype.runGraph = function(nodeId, graphName, options, domain, proxy) {
        var graphOptions = options || {};
        var graphDomain = domain || Constants.Task.DefaultDomain;
        return Promise.resolve()
            .then(function() {
                assert.string(nodeId);
                assert.string(graphName);
                return taskGraphStore.findActiveGraphForTarget(nodeId);
            })
            .then(function(activeGraph) {
                if (activeGraph) {
                    throw new Error('Unable to run multiple task graphs against a single target.');
                }
                return taskGraphStore.getGraphDefinitions(graphName);
            })
            .then(function(definitions) {
                if (_.isEmpty(definitions)) {
                    throw new Errors.NotFoundError('Fail to find graph definition for ' +
                        graphName);
                }
                var context = { target: nodeId };
                if(proxy) {
                    context.proxy = proxy;
                }
                
                return TaskGraph.create(graphDomain, {
                    definition: definitions[0],
                    options: graphOptions,
                    context: context
                });
            })
            .then(function(graph) {
                return graph.persist();
            })
            .then(function(graph) {
                return taskGraphProtocol.runTaskGraph(graph.instanceId, graphDomain);
            });
   };

   return new WorkflowTool();
}
