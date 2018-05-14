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

    var Widget = function Widget() {



        MashupPlatform.prefs.registerCallback(function (new_preferences) {

        }.bind(this));
    };


    Widget.prototype.init = function init() {
        // var layout = new StyledElements.VerticalLayout();
        // layout.insertInto(document.body);

        var buttons = document.getElementById('buttons');

        var playbtn = new StyledElements.Button({
            'class': 'btn-danger fa fa-circle',
            'title': 'Add component to dashboard'
        });
        playbtn.addEventListener("click", toggleOption).insertInto(buttons);

        var createbtn = new StyledElements.Button({
            'class': 'btn-info fa fa-plus',
            'title': 'Create dashboard'
        });
        createbtn.addEventListener("click", createDashboard).insertInto(buttons);
    };

    var option = false;
    var toggleOption = function toggleOption() {
        option = !option;
    };

    // Create the new dashboard
    var createDashboard = function createDashboard() {
        var name = "Test NGSI " + Math.floor(Math.random() * 10000);         
        createWorkspace(name, 'CoNWeT/baseNGSImashup/0.1.0', {}).then(configureDashboard, function() {
            MashupPlatform.widget.log("Could not create the workspace", MashupPlatform.log.ERROR);
        });
    };

    // Add the selected extra components to the dashboard
    var configureDashboard = function configureDashboard(dashboardID) {
        
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

    var createWidget = function createWidget(workspaceID, tabID, widget) {
        data = {
            widget: 'Wirecloud/Test/1.0',
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
        data = preferences;

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

    var operatorCount = 2; // Initial operator count for the base NGSI dashboard
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
    var createConnection = function createConnection(source, target) {
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