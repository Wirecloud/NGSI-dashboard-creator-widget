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
    var data;
    var Widget = function Widget() {
        this.model = null;
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
        this.model = data.data[0].type;
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

    var getVariableSelectorEntries = function getVariableSelectorEntries(type) {
        var options = [];
        // TODO use this.model to recommend options

        data.structure.forEach(function (entry) {
            // skip _id
            if (entry.id === "id" || entry.id === "_id") {
                return;
            }

            if ((!type && entry.type === "number") || (type && entry.type === "string")) {
                options.push(entry.id);
            }
        });

        return options;
    };

    // Create "chart" creation options
    // TODO: dynamic selectors / options
    var nextId = 0;
    var createComponent = function createComponent() {
        var component = {id: nextId++};

        var parent = document.getElementById('components');

        var div = document.createElement('div');
        div.classList.add("component");
        component.div = div;

        var typeDiv = document.createElement('div');
        var typeTitle = new StyledElements.Fragment("<h4> Component type </h4>");
        // TODO: add more types
        // TODO: enable heatmap option only when available
        component.typeSelector = new StyledElements.Select({initialEntries: ["Variable tendency", "Scatter chart", "Heatmap"], initialValue: "Variable tendency"});
        component.typeSelector.addEventListener("change", componentTypeHandler.bind(component));
        div.appendChild(typeDiv);
        typeTitle.insertInto(typeDiv);
        component.typeSelector.insertInto(typeDiv);

        var variable1Div = document.createElement('div');
        var variable1Title = new StyledElements.Fragment("<h4> Target variable </h4>");
        var options = getVariableSelectorEntries();
        component.variableSelector1 = new StyledElements.Select({initialEntries: options, initialValue: options[0]});
        // TODO: add background to recommended values
        div.appendChild(variable1Div);
        variable1Title.insertInto(variable1Div);
        component.variableSelector1.insertInto(variable1Div);

        var variable2Div = document.createElement('div');
        var variable2Title = new StyledElements.Fragment("<h4> Extra target variable </h4>");
        component.variableSelector2 = new StyledElements.Select({});

        div.appendChild(variable2Div);
        variable2Title.insertInto(variable2Div);
        component.variableSelector2.insertInto(variable2Div);
        // This selector is disabled by default
        variable2Div.classList.add("hidden");

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

        // Get new entries
        var entries = getVariableSelectorEntries();
        this.variableSelector1.addEntries(entries);

        // Restore previous values
        this.variableSelector1.setValue(this.variableSelector1.oldValue);

        // Enable needed selectors
        this.variableSelector1.wrapperElement.parentElement.classList.remove("hidden");
        this.sourceSelector.wrapperElement.parentElement.classList.remove("hidden");
        // Disable unneeded selectors
        this.variableSelector2.wrapperElement.parentElement.classList.add("hidden");
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
        var entries = getVariableSelectorEntries();
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
        createWorkspace(name, 'CoNWeT/baseNGSImashup/0.1.0', {}).then(configureDashboard, function () {
            MashupPlatform.widget.log("Could not create the workspace", MashupPlatform.log.ERROR);
        });
    };

    // Add the selected extra components to the dashboard
    var configureDashboard = function configureDashboard(workspace) {
        // Get workspace initial components IDs
        var tabID = workspace.tabs[0].id;
        var mapWidgetID = workspace.tabs[0].iwidgets[0].id;

        // TODO: add missing types
        this.components.forEach(function (component) {
            var type = component.typeSelector.value;
            // var variables = [component.variableSelector1.value, component.variableSelector2.value];
            if (type === "Heatmap") {
                configureHeatmap(workspaceID, mapWidgetID);
            }
        });
    };

    // Add a heatmap to the dashboard
    var configureHeatmap = function configureHeatmap(dashboardID, mapWidgetID){
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
            createConnection(dashboardID, sourceEndpoint, operatorEndpoint);

            // Connect heatmap output to the map widget
            operatorEndpoint.endpoint = "leafletheatmapLayer";
            var targetEndpoint = {
                id: mapWidgetID,
                type: "widget",
                endpoint: "heatmap"
            };
            createConnection(dashboardID, operatorEndpoint, targetEndpoint);
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
            widget: widget
            // height:
            // width:
            // commit: true ?
            // left: ?
            // top: ?
            // layout: 0 ?
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
        var data = preferences;

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
            'preferences': preferences,
            'properties': properties
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

    var connectionCount = 2; // Initial connection count for the base NGSI dashboard
    var createConnection = function createConnection(workspaceID, source, target) {
        var connection = {
            source: source,
            target: target
        };

        var connectionID = connectionCount++;
        var data = [{
            'op': "add",
            'path': "/connections/" + connectionID,
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