/*
 * NGSI-dashboard-creator
 * https://github.com/mognom/NGSI-dashboard-creato-widget
 *
 * Copyright (c) 2018 CoNWeT
 * Licensed under the MIT license.
 */

/* globals StyledElements */

window.Widget = (function () {

    "use strict";
    var data, model;
    var Widget = function Widget() {
        model = null;
        this.components = [];
    };

    Widget.prototype.init = function init() {

        // TODO: Display a waiting for data or smth
        MashupPlatform.wiring.registerCallback('dataset', function (d) {
            data = JSON.parse(d);
            if (data) {
                this.startWidget();
            }
        }.bind(this));
    };

    Widget.prototype.startWidget = function startWidget() {
        // TODO: Remove waiting for data

        // Get datamodel
        model = data.data[0].type;
        // TODO: Check model is a FIWARE datamodel

        // Add create component & dashboard buttons
        var buttons = document.getElementById('buttons');

        var playbtn = new StyledElements.Button({
            'class': 'btn-danger fa fa-circle',
            'title': 'Add component to dashboard'
        });
        playbtn.addEventListener("click", createComponent.bind(this)).insertInto(buttons);

        var createbtn = new StyledElements.Button({
            'class': 'btn-info fa fa-plus',
            'title': 'Create dashboard'
        });
        createbtn.addEventListener("click", createDashboard.bind(this)).insertInto(buttons);

        this.nameField = new StyledElements.TextField({
            placeholder: "My new dashboard name"
        });
        this.nameField.insertInto(buttons);
    };

    // TODO: Recommend options based on datamodel
    var datamodelOptionsInfo = {
        AirQualityObserved: [
            "CO",
            "NO2"
        ]
    };
    var TENDENCY_TYPES = [["maximum", "Max"], ["minimum", "Min"], ["arithmetic-mean", "Mean"], ["count", "Count"], ["sum", "Sum"]];

    var getVariableSelectorEntries = function getVariableSelectorEntries(type) {
        var options = [];

        data.structure.forEach(function (entry) {
            // skip _id
            if (entry.id === "id" || entry.id === "_id") {
                return;
            }

            if ((!type && entry.type === "number") || (type && entry.type === "string")) {
                options.push(entry.id);
            }
        });
        var recommend = datamodelOptionsInfo[model];
        if (recommend) {
            recommend.forEach(function (r) {
                var i = options.indexOf(r);
                if (i !== -1) {
                    options.splice(i, 1);
                }
            });
            options = recommend.concat(options);
        }

        return options;
    };

    var setRecommendedOptions = function setRecommendedOptions(selector, options) {
        var o = selector.inputElement.childNodes;

        for (var i = 0; i < options.length; i++) {
            o[i].classList.add("recommended");
        }
    };

    // Create "chart" creation options
    var nextId = 0;
    var createComponent = function createComponent() {
        var component = {id: nextId++};

        var parent = document.getElementById('components');

        var div = document.createElement('div');
        div.classList.add("component");
        component.div = div;

        // Type selector
        var typeDiv = document.createElement('div');
        var typeTitle = new StyledElements.Fragment("<h4> Component type </h4>");
        // TODO: add more types
        // TODO: enable heatmap option only when available
        component.typeSelector = new StyledElements.Select({initialEntries: ["Variable tendency", "Scatter chart", "Heatmap"], initialValue: "Variable tendency"});
        component.typeSelector.addEventListener("change", componentTypeHandler.bind(component));
        div.appendChild(typeDiv);
        typeTitle.insertInto(typeDiv);
        component.typeSelector.insertInto(typeDiv);

        // Target variable selector
        var variable1Div = document.createElement('div');
        var variable1Title = new StyledElements.Fragment("<h4> Target variable </h4>");
        var options = getVariableSelectorEntries.call(this);
        component.variableSelector1 = new StyledElements.Select({initialEntries: options, initialValue: options[0]});
        setRecommendedOptions(component.variableSelector1, datamodelOptionsInfo[model]);
        // TODO: add background to recommended values
        div.appendChild(variable1Div);
        variable1Title.insertInto(variable1Div);
        component.variableSelector1.insertInto(variable1Div);

        // Extra variable selector
        var variable2Div = document.createElement('div');
        var variable2Title = new StyledElements.Fragment("<h4> Tendency selector </h4>");
        component.variableSelector2 = new StyledElements.Select({initialEntries: TENDENCY_TYPES});
        div.appendChild(variable2Div);
        variable2Title.insertInto(variable2Div);
        component.variableSelector2.insertInto(variable2Div);

        var sourceDiv = document.createElement('div');
        var sourceTitle = new StyledElements.Fragment("<h4> Data scope </h4>");
        component.sourceSelector = new StyledElements.Select({initialEntries: ["All", "Visible POIs"], initialValue: "Visible POIs"});
        div.appendChild(sourceDiv);
        sourceTitle.insertInto(sourceDiv);
        component.sourceSelector.insertInto(sourceDiv);

        var removeButton = new StyledElements.Button({
            'class': 'btn-danger fa fa-trash',
            'title': 'Remove component'
        });
        removeButton.addEventListener("click", function () {
            // Find the component and remove it
            this.components.some(function (o, i) {
                if (o.id === component.id) {
                    this.components.splice(i, 1);
                    parent.removeChild(div);
                    return true; // Stop looking
                }
            }.bind(this));
        }.bind(this));
        removeButton.insertInto(div);

        // Add component to parent div
        parent.appendChild(div);
        // Store the component
        this.components.push(component);
    };

    // Change selectors based on current type
    var componentTypeHandler = function componentTypeHandler(event) {
        var val = event.value;
        switch (val) {
        case "Heatmap": configureHeatmapType.call(this); break;
        case "Variable tendency": configureTendencyType.call(this); break;
        case "Scatter chart": configureScatterType.call(this); break;
        default: configureTendencyType.call(this); break;
        }
    };

    var configureTendencyType = function configureTendencyType() {
        // Remove previous entries
        if (this.variableSelector1.value !== undefined) {
            this.variableSelector1.oldValue = this.variableSelector1.value;
        }
        this.variableSelector1.clear();

        if (this.variableSelector2.value !== undefined) {
            this.variableSelector2.oldValue = this.variableSelector2.value;
        }
        this.variableSelector2.clear();

        // Get new entries
        var entries = getVariableSelectorEntries.call(this);
        this.variableSelector1.addEntries(entries);
        setRecommendedOptions(this.variableSelector1, datamodelOptionsInfo[model]);
        this.variableSelector2.addEntries(TENDENCY_TYPES);

        // Restore previous values
        this.variableSelector1.setValue(this.variableSelector1.oldValue);
        this.variableSelector2.setValue(this.variableSelector2.oldValue);

        // Enable needed selectors
        this.variableSelector1.wrapperElement.parentElement.classList.remove("hidden");
        this.variableSelector2.wrapperElement.parentElement.classList.remove("hidden");
        this.sourceSelector.wrapperElement.parentElement.classList.remove("hidden");
    };

    var configureHeatmapType = function configureHeatmapType() {
        // Disable unneeded selectors
        this.variableSelector1.wrapperElement.parentElement.classList.add("hidden");
        this.variableSelector2.wrapperElement.parentElement.classList.add("hidden");
        this.sourceSelector.wrapperElement.parentElement.classList.add("hidden");
    };

    var configureScatterType = function configureScatterType() {
        // Remove previous entries
        if (this.variableSelector1.value !== undefined) {
            this.variableSelector1.oldValue = this.variableSelector1.value;
        }
        this.variableSelector1.clear();

        if (this.variableSelector2.value !== undefined) {
            this.variableSelector2.oldValue = this.variableSelector2.value;
        }
        this.variableSelector2.clear();

        // Get new entries
        var entries = getVariableSelectorEntries.call(this);
        this.variableSelector1.addEntries(entries);
        this.variableSelector2.addEntries(entries);

        // Restore previous values
        this.variableSelector1.setValue(this.variableSelector1.oldValue);
        this.variableSelector2.setValue(this.variableSelector2.oldValue);

        // Enable needed selectors
        this.variableSelector1.wrapperElement.parentElement.classList.remove("hidden");
        this.variableSelector2.wrapperElement.parentElement.classList.remove("hidden");
        this.sourceSelector.wrapperElement.parentElement.classList.remove("hidden");
    };

    // Create the new dashboard
    var createDashboard = function createDashboard() {
        // TODO: handle empty name
        var name = this.nameField.value;
        createWorkspace(name, "CoNWeT/basengsimashup/0.1.0", {}).then(configureDashboard.bind(this), function () {
            MashupPlatform.widget.log("Could not create the workspace", MashupPlatform.log.ERROR);
        });
    };

    // Add the selected extra components to the dashboard
    var configureDashboard = function configureDashboard(workspace) {
        // Get workspace initial components IDs
        var tabID = workspace.tabs[0].id;
        var mapWidgetID = workspace.tabs[0].iwidgets[0].id;
        var i = 0;
        var componentList = this.components;

        // TODO: add missing types
        // Cant run parallel component creation in case the wirecloud instance is using the sqlite3 engine
        var configureNextComponent = function configureNextComponent() {
            if (componentList.length <= i) {
                return;
            }

            var component = componentList[i++];
            var type = component.typeSelector.value;
            if (type === "Heatmap") {
                createHeatmapComponent(workspace.id, mapWidgetID).then(configureNextComponent);
            } else if (type === "Variable tendency") {
                createTendencyComponent(workspace.id, mapWidgetID, tabID, component.variableSelector1.value, component.variableSelector2.value, component.sourceSelector.value).then(configureNextComponent);
            }
        };

        configureNextComponent(this.components, 0, workspace, tabID, mapWidgetID);
    };

    // Add a heatmap to the dashboard
    var createHeatmapComponent = function createHeatmapComponent(dashboardID, mapWidgetID) {
        return new Promise(function (fulfill, reject) {
            // Create the heatmap operator
            createOperator(dashboardID, "CoNWeT/ngsi-datamodel2heatmap/0.1.0").then(function (operatorID) {
                // Connect heatmap operator to its source
                var sourceEndpoint = {
                    id: 1,
                    type: "operator",
                    endpoint: "plain"
                };
                var operatorEndpoint = {
                    id: operatorID,
                    type: "operator",
                    endpoint: "input"
                };
                createConnection(dashboardID, sourceEndpoint, operatorEndpoint).then(function () {
                    // Connect heatmap output to the map widget
                    operatorEndpoint.endpoint = "leafletheatmapLayer";
                    var targetEndpoint = {
                        id: mapWidgetID,
                        type: "widget",
                        endpoint: "heatmap"
                    };
                    createConnection(dashboardID, operatorEndpoint, targetEndpoint).then(function () {
                        fulfill(true);
                    });
                });
            });
        });
    };

    var createTendencyComponent = function createTendencyComponent(dashboardID, mapWidgetID, tabID, variable, tendencyType, source) {
        return new Promise(function (fulfill, reject) {
            // Create wirecloud components
            var filterBy;
            if (source === "All") {
                filterBy = variable;
            } else {
                filterBy = "data." + variable;
            }
            var prop_name = {
                hidden: false,
                readonly: false,
                value: filterBy
            };
            var values = [];
            var createFilter = function createFilter() {
                return createOperator(dashboardID, "CoNWeT/value-list-filter/0.1.0", {prop_name: prop_name});
            };
            var createTendency = function createTendency(id) {
                values.push(id);
                return createOperator(dashboardID, "CoNWeT/calculate-tendency/0.3.1");
            };
            var createPanel = function createPanel(id) {
                values.push(id);
                return createWidget(dashboardID, tabID, "CoNWeT/panel/1.0.3");
            };

            createFilter().then(createTendency).then(createPanel).then(function (id) {
                values.push(id);
                createComponentConnections(values);
            });

            var createComponentConnections = function createComponentConnections(values) {
                // Connect the wirecloud component
                var sourceEndpoint, targetEndpoint;
                // Connect source to filter operator
                if (source === "All") {
                    sourceEndpoint = {
                        id: 1,
                        type: "operator",
                        endpoint: "plain"
                    };
                } else {
                    sourceEndpoint = {
                        id: mapWidgetID,
                        type: "widget",
                        endpoint: "poiListOutput"
                    };
                }
                targetEndpoint = {
                    id: values[0],
                    type: "operator",
                    endpoint: "indata"
                };
                createConnection(dashboardID, sourceEndpoint, targetEndpoint).then(function () {
                    // connect filter operator to tendency operator
                    sourceEndpoint = {
                        id: values[0],
                        type: "operator",
                        endpoint: "outdata"
                    };

                    targetEndpoint = {
                        id: values[1],
                        type: "operator",
                        endpoint: "value-list"
                    };
                    createConnection(dashboardID, sourceEndpoint, targetEndpoint).then(function () {
                        // Connect tendency operator to panel widget
                        sourceEndpoint = {
                            id: values[1],
                            type: "operator",
                            endpoint: tendencyType
                        };

                        targetEndpoint = {
                            id: values[2],
                            type: "widget",
                            endpoint: "textinput"
                        };
                        createConnection(dashboardID, sourceEndpoint, targetEndpoint).then(function () {
                            fulfill(true);
                        });
                    });
                });
            };
        });
    };

    /*
        HELPER FUNCTIONS
    */
    var createWorkspace = function createWorkspace(name, mashup, preferences) {
        var data = {
            dry_run: false,
            allow_renaming: true,
            name: name,
            mashup: mashup,
            preferences: preferences
        };

        return new Promise(function (fulfill, reject) {
            MashupPlatform.http.makeRequest("http://127.0.0.1:8000/api/workspaces", {
                method: "POST",
                supportsAccessControl: false,
                postBody: JSON.stringify(data),
                contentType: "application/json",
                onSuccess: function (response) {
                    var r = JSON.parse(response.responseText);
                    fulfill(r); // Return workspace data
                },
                onFailure: function (response) {
                    reject(false);
                }
            });
        });
    };

    var createWidget = function createWidget(workspaceID, tabID, widget, config) {
        var data = {
            widget: widget,
            // height:
            // width:
            commit: true,
            // left: ?
            // top: ?
            layout: 0
        };

        return new Promise(function (fulfill, reject) {
            MashupPlatform.http.makeRequest("http://127.0.0.1:8000/api/workspace/" + workspaceID + "/tab/" + tabID + "/iwidgets", {
                method: "POST",
                supportsAccessControl: false,
                postBody: JSON.stringify(data),
                contentType: "application/json",
                onSuccess: function (response) {
                    var r = JSON.parse(response.responseText);
                    fulfill(r.id); // Return widget id
                },
                onFailure: function (response) {
                    reject(false);
                }
            });
        });
    };

    var addWidgetPreferences = function addWidgetPreferences(workspaceID, tabID, widgetID, preferences) {
        var data = preferences ? preferences : {};

        return new Promise(function (fulfill, reject) {
            MashupPlatform.http.makeRequest("http://127.0.0.1:8000/api/workspace/" + workspaceID + "/tab/" + tabID + "/iwidgets/" + widgetID + "/preferences", {
                method: "POST",
                supportsAccessControl: false,
                postBody: JSON.stringify(data),
                contentType: "application/json",
                onSuccess: function (response) {
                    fulfill(true);
                },
                onFailure: function (response) {
                    reject(false);
                }
            });
        });
    };

    var operatorCount = 3; // Initial operator count for the base NGSI dashboard (2 operators and IDs start on 1)
    var createOperator = function createOperator(workspaceID, operator, preferences, properties) {
        var op = {
            'name': operator,
            'preferences': preferences ? preferences : {},
            'properties': properties ? properties : {}
        };

        var operatorID = operatorCount++;
        var data = [{
            'op': "add",
            'path': "/operators/" + operatorID,
            'value': op
        }];

        return new Promise(function (fulfill, reject) {
            MashupPlatform.http.makeRequest("http://127.0.0.1:8000/api/workspace/" + workspaceID + "/wiring", {
                method: "PATCH",
                supportsAccessControl: false,
                postBody: JSON.stringify(data),
                contentType: "application/json-patch+json",
                onSuccess: function (response) {
                    fulfill(operatorID);
                },
                onFailure: function (response) {
                    reject(false);
                }
            });
        });
    };

    var createConnection = function createConnection(workspaceID, source, target) {
        var connection = {
            source: source,
            target: target
        };

        var data = [{
            'op': "add",
            'path': "/connections/1",
            'value': connection
        }];

        return new Promise(function (fulfill, reject) {
            MashupPlatform.http.makeRequest("http://127.0.0.1:8000/api/workspace/" + workspaceID + "/wiring", {
                method: "PATCH",
                supportsAccessControl: false,
                postBody: JSON.stringify(data),
                contentType: "application/json-patch+json",
                onSuccess: function (response) {
                    fulfill(true);
                },
                onFailure: function (response) {
                    reject(false);
                }
            });
        });
    };

    return Widget;

})();