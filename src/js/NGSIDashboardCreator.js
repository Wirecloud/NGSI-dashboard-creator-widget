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
    var metadata;
    var dataStructure = {};
    var mapData = {};
    var model;
    var Widget = function Widget() {
        model = null;
        this.components = [];
    };
    var componentVersions = {
        "ngsi-source": "CoNWeT/ngsi-source/4.0.0",
        "ngsi-datamodel2poi": "CoNWeT/ngsi-datamodel2poi/3.0.8a2",
        "calculate-tendency": "CoNWeT/calculate-tendency/0.3.1",
        "column-chart-generator": "CoNWeT/column-chart-generator/0.3.2",
        "gauge-chart-generator": "CoNWeT/gauge-chart-generator/0.1.0",
        "highcharts": "CoNWeT/highcharts/0.1.3",
        "labels-to-dataserie": "CoNWet/labels-to-dataserie/0.3.1",
        "leaflet-map": "CoNWeT/leaflet-map/0.1.0",
        "ngsi-datamodel2heatmap": "CoNWeT/ngsi-datamodel2heatmap/0.1.0",
        "ngsientity2poi": "CoNWeT/ngsientity2poi/3.1.2",
        "panel": "CoNWeT/panel/1.1.0",
        "pie-chart-generator": "CoNWeT/pie-chart-generator/0.3.3",
        "scatter-chart-generator": "CoNWeT/scatter-chart-generator/0.1.0",
        "value-list-filter": "CoNWeT/value-list-filter/0.1.1",
        "basengsimashup": "CoNWeT/basengsimashup/0.1.0",
    };


    Widget.prototype.init = function init() {
        // TODO: Display a waiting for data or smth
        MashupPlatform.wiring.registerCallback('ngsimetadata', function (d) {
            metadata = typeof(d) == "string" ? JSON.parse(d) : d;
            if (metadata) {
                // Launch a query to get few data on background
                // Auth not possible if anonymous usage, by now
                // TODO: Support authentication
                var connOptions = {
                    request_headers: {
                        "Fiware-Service": metadata.tenant,
                        "Fiware-ServicePath": metadata.servicePath
                    }
                };
                var ngsi_connection = new NGSI.Connection(metadata.serverURL, connOptions);
                var entityIdList = [
                    {
                        type: metadata.types,
                        id: '.*',                // TODO: support metadata pattern received
                        isPattern: true
                    }
                ];
                var attributeList = metadata.filteredAttributes;
                var options = {
                    flat: false,
                    limit: 50,
                    details: true,
                    onSuccess: processSampleData.bind(this)
                };
                ngsi_connection.query(entityIdList, attributeList, options);

                this.startWidget();
            }
        }.bind(this));
    };

    Widget.prototype.startWidget = function startWidget() {
        document.getElementsByClassName("loader")[0].style.display = "none";
        // Get datamodel
        // TODO: support multiple models
        model = metadata.types[0];
        // TODO: Check model is a FIWARE datamodel

        // Add create component & dashboard buttons
        var buttons = document.getElementById('buttons');
        while (buttons.lastChild) {
            buttons.removeChild(buttons.lastChild);
        }

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
            "NO2",
            "NO",
            "NOx",
            "SO",
            "temperature",
            "windSpeed"
        ],
        WaterQualityObserved: [
            "temperature",
            "pH",
            "O2",
            "NO3",
            "salinity",
            "conductivity",
            "conductance",
        ],
        NoiseLevelObserved: [
            "LAeq",
            "LAmax",
            "sonometerClass"
        ],
        Streetlight: [
            "lanternHeight",
            "illuminanceLevel",
            "status",
            "powerState"
        ],
        OffStreetParking: [
            "totalSpotNumber",
            "availableSpotNumber",
            "priceRatePerMinute",
            "status"
        ],
        OnStreetParking: [
            "totalSpotNumber",
            "availableSpotNumber",
        ],
        PointOfInterest: [
            "category"
        ],
        WasteContainer: [
            "fillingLevel",
            "cargoWeight",
            "temperature",
            "storedWasteKind",
            "status"
        ],
        Vehicle: [
            "vehicleType",
            "serviceStatus",
            "category",
            "speed",
            "cargoWeight"
        ],
        Alert: [
            "category",
            "subCategory",
            "severity"
        ],
        WeatherObserved: [
            "precipitation",
            "pressureTendency",
            "relativeHumidity",
            "temperature",
            "windSpeed",
            "weatherType",
            "visibility",
        ]
    };

    var TENDENCY_TYPES = [["maximum", "Max"], ["minimum", "Min"], ["arithmetic-mean", "Mean"], ["count", "Count"], ["sum", "Sum"]];

    var processSampleData = function processSampleData(data, details) {
        // Received non-flat structure with further details
        dataStructure = {}; // Supports multi-entities
        mapData = {};
        var attrName;
        var attrType;
        var attrValue;
        for (var entity in data) {
            for (var attribute in data[entity].attributes) {
                if (typeof(dataStructure[data[entity].entity.type]) !== "object") {
                    dataStructure[data[entity].entity.type] = {};
                }
                attrName = data[entity].attributes[attribute].name;
                attrType = data[entity].attributes[attribute].type;
                attrValue = data[entity].attributes[attribute].value;
                dataStructure[data[entity].entity.type][attrName] = attrType; // Overwrites without asking
                if (attrType.toLowerCase() == 'geo:json') {
                    processLocationData(mapData, data[entity].attributes[attribute].value);
                }
                // Review children if value is an object
                if (typeof (attrValue) === "object") {
                    for (var subAttr in attrValue) {
                        dataStructure[data[entity].entity.type][attrName + "." + subAttr] = "Text"; // Overwrites without asking
                    }
                }
            }
        }
    }

    var processLocationData = function processLocationData(mapData, location) {
        // Aux function for single point comparison
        var processSingleData = function processSingleData(mapData, point) {
            if (!mapData.longMin || mapData.longMin > point[0]) {
                mapData.longMin = point[0];
            }
            if (!mapData.longMax || mapData.longMax < point[0]) {
                mapData.longMax = point[0];
            }
            if (!mapData.latMin || mapData.latMin > point[1]) {
                mapData.latMin = point[1];
            }
            if (!mapData.latMax || mapData.latMax < point[1]) {
                mapData.latMax = point[1];
            }
        }
        var getDistanceFromLatLonInKm = function getDistanceFromLatLonInKm(lat1,lon1,lat2,lon2) {
            var R = 6371; // Radius of the earth in km
            var dLat = deg2rad(lat2 - lat1);  // deg2rad below
            var dLon = deg2rad(lon2 - lon1);
            var a =
                Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2)
            ;
            var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            var d = R * c; // Distance in km
            return d;
        }

        var deg2rad = function deg2rad(deg) {
            return deg * (Math.PI / 180)
        }

        if (location.type.toLowerCase() == "point") {
            processSingleData(mapData, location.coordinates);
        } else if (location.type.toLowerCase() == "linestring") {
            for (var i in location.coordinates) {
                processSingleData(mapData, location.coordinates[i]);
            }
        } else if (location.type.toLowerCase() == "polygon" || location.type.toLowerCase() == "multilinestring") {
            for (var i in location.coordinates) {
                for (var j in location.coordinates[i]) {
                    processSingleData(mapData, location.coordinates[i][j]);
                }
            }
        } else if (location.type.toLowerCase() == "multipolygon") {
            for (var i in location.coordinates) {
                for (var j in location.coordinates[i]) {
                    for (var k in location.coordinates[i][j]) {
                        processSingleData(mapData, location.coordinates[i][j][k]);
                    }
                }
            }
        }

        // Final calculations
        mapData.longAvg = (mapData.longMin + mapData.longMax) / 2;
        mapData.latAvg = (mapData.latMin + mapData.latMax) / 2;
        mapData.verticalDistance = getDistanceFromLatLonInKm(mapData.latMin, mapData.longAvg, mapData.latMax, mapData.longAvg);
        mapData.horizontalDistance = getDistanceFromLatLonInKm(mapData.latAvg, mapData.longMin, mapData.latAvg, mapData.longMax);
    }

    var getVariableSelectorEntries = function getVariableSelectorEntries() {
        // TODO: receive Entity on call and arrange on such model
        var options = [];
        for (var entityType in dataStructure) {
            for (var entityAttribute in dataStructure[entityType]) {
                options.push(entityAttribute) // Returns a flat list of all-entities attributes
            }
        }

        // Sort recommended options to be first
        var recommend = datamodelOptionsInfo[model];
        if (recommend) {
            recommend.forEach(function (r) {
                var i = options.indexOf(r);
                // Remove the option from the list and append it first
                if (i !== -1) {
                    options.splice(i, 1);
                    options.unshift(r);
                }
            });
        }

        return options;
    };

    var setRecommendedOptions = function setRecommendedOptions(selector, options) {
        var o = selector.inputElement.childNodes;

        for (var i = 0; i < o.length; i++) {
            if (options.includes(o[i].value)) {
                o[i].classList.add("recommended");
            }
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
        component.typeSelector = new StyledElements.Select({initialEntries: ["Variable tendency", "Scatter chart", "Pie chart","Heatmap"], initialValue: "Variable tendency"});
        component.typeSelector.addEventListener("change", componentTypeHandler.bind(component));
        div.appendChild(typeDiv);
        typeTitle.insertInto(typeDiv);
        component.typeSelector.insertInto(typeDiv);

        // TODO: Entity-type selector

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
        case "Pie chart": configurePieType.call(this); break;
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
        this.variableSelector2.addEntries(entries); // Replaces TENDENCY_TYPES

        // Restore previous values
        this.variableSelector1.setValue(this.variableSelector1.oldValue);
        this.variableSelector2.setValue(this.variableSelector2.oldValue);

        // Enable needed selectors
        this.variableSelector1.wrapperElement.parentElement.classList.remove("hidden");
        this.variableSelector2.wrapperElement.parentElement.classList.remove("hidden");
        this.sourceSelector.wrapperElement.parentElement.classList.remove("hidden");
    };

    var configurePieType = function configurePieType() {
        // Remove previous entries
        if (this.variableSelector1.value !== undefined) {
            this.variableSelector1.oldValue = this.variableSelector1.value;
        }
        this.variableSelector1.clear();

        // Get new entries
        var entries = getVariableSelectorEntries.call(this);
        this.variableSelector1.addEntries(entries);

        // Restore previous values
        this.variableSelector1.setValue(this.variableSelector1.oldValue);

        // Enable needed selectors
        this.variableSelector1.wrapperElement.parentElement.classList.remove("hidden");
        this.variableSelector2.wrapperElement.parentElement.classList.add("hidden");
        this.sourceSelector.wrapperElement.parentElement.classList.remove("hidden");
    };

    // Create the new dashboard
    var createDashboard = function createDashboard() {
        // TODO: handle empty name
        var name = this.nameField.value;
        // TODO: remove the basengsimashup and use an empty one injecting the leaflet map
        createWorkspace(name, null, {}).then(
            configureDashboard.bind(this),
            function () {
                MashupPlatform.widget.log("Could not create the workspace", MashupPlatform.log.ERROR);
            }
        );
    };

    // Add the selected extra components to the dashboard
    var configureDashboard = function configureDashboard(workspace) {
        // Notify the parent element
        window.top.postMessage(workspace.owner + "/" + workspace.name, "*");

        // Get workspace initial components IDs
        var tabID = workspace.tabs[0].id;
        var mapWidgetID, sourceOperatorID;
        var i = 0; // index of the user-defined items being recursively provessed
        var componentList = this.components;

        // Create initial dashboard dinamically
        // NGSI-source-operator + FIWARE-data-model2poi-operator + Leaflet-map-widtet[insert/update POIs]
        var createInitialComponents = function createInitialComponents() {
            return new Promise(function (fulfill, reject) {
                // Helper sub-sub-functions
                var identifiers = [];
                var createConnections = function createConnections() {
                    mapWidgetID = identifiers[2];
                    sourceOperatorID = identifiers[0];
                    // Connect ngsi-source[entityOutput] with ngsi-datamodel2poi[entityInput]
                    // Connect ngsi-datamodel2poi[poiOutput] --> leaflet-map[poiInput]
                    var sourceEndpoint = {
                        id: identifiers[0],
                        type: "operator", // NGSI-source-operator ID
                        endpoint: "entityOutput"
                    };
                    var targetEndpoint = {
                        id: identifiers[1], // ngsi-datamodel2pio-operator ID
                        type: "operator",
                        endpoint: "entityInput"
                    };
                    createConnection(workspace.id, sourceEndpoint, targetEndpoint).then(function () {
                        // Connect heatmap output to the map widget
                        var sourceEndpoint = {
                            id: identifiers[1], // ngsi-datamodel2poi operator ID
                            type: "operator",
                            endpoint: "poiOutput"
                        }
                        var targetEndpoint = {
                            id: identifiers[2], // Map widget ID
                            type: "widget",
                            endpoint: "poiInput"
                        };
                        createConnection(workspace.id, sourceEndpoint, targetEndpoint).then(function () {
                            fulfill(true);
                        });
                    });
                };
                var initialConfig = {
                    ngsi_server: {
                        hiddeen: false,
                        readonly: false,
                        value: metadata.serverURL ? metadata.serverURL : ""
                    },
                    ngsi_proxy: {
                        hiddeen: false,
                        readonly: false,
                        value: metadata.proxyURL ? metadata.proxyURL : ""
                    },
                    use_user_fiware_token: {
                        hiddeen: false,
                        readonly: false,
                        value: false
                    },
                    ngsi_tenant: {
                        hiddeen: false,
                        readonly: false,
                        value: metadata.tenant ? metadata.tenant : ""
                    },
                    ngsi_service_path: {
                        hiddeen: false,
                        readonly: false,
                        value: metadata.servicePath ? metadata.servicePath : ""
                    },
                    ngsi_entities: {
                        hiddeen: false,
                        readonly: false,
                        value: metadata.types[0] ? metadata.types[0] : "" // TODO: soport multiple entity types
                    },
                    ngsi_id_filter: {
                        hiddeen: false,
                        readonly: false,
                        value: metadata.idPattern ? metadata.idPattern : ""
                    },
                    query: {
                        hiddeen: false,
                        readonly: false,
                        value: metadata.query ? metadata.query : ""
                    },
                    ngsi_update_attributes: {
                        hiddeen: false,
                        readonly: false,
                        value: metadata.filteredAttributes ? metadata.filteredAttributes.join() : ""
                    },
                };
                var mapConfig = {
                    title: "Map",
                    width: 10,
                    height: 36,
                    top: 0,
                    left: 0
                };
                var mapPreferences = {
                    initialCenter: mapData.longAvg + "," + mapData.latAvg,
                    initialZoom: 15 - Math.round(Math.log2(Math.max(mapData.verticalDistance,mapData.horizontalDistance)),1),
                    maxzoom: "18",
                    minzoom: "4"
                };
                createOperator(identifiers, workspace.id, componentVersions["ngsi-source"],initialConfig)
                    .then(function () {
                        return createOperator(identifiers, workspace.id, componentVersions["ngsi-datamodel2poi"]);
                    }).then(function () {
                        return createWidget(identifiers, workspace.id, tabID, componentVersions["leaflet-map"], mapConfig);
                    }).then(function () {
                        return addWidgetPreferences(workspace.id, tabID, identifiers[2], mapPreferences);
                    }).then(function () {
                        createConnections();
                    });
            });
        };

        // TODO: add missing types
        // Cant run parallel component creation in case the wirecloud instance is using the sqlite3 engine
        var createNextComponent = function createNextComponent() {
            if (componentList.length <= i) {
                return;
            }

            var component = componentList[i++];
            var type = component.typeSelector.value;
            if (type === "Heatmap") {
                createHeatmapComponent(workspace.id, sourceOperatorID, mapWidgetID).then(createNextComponent);
            } else if (type === "Variable tendency") {
                createTendencyComponent(workspace.id, sourceOperatorID, mapWidgetID, tabID, component.variableSelector1.value, component.variableSelector2.value, component.sourceSelector.value).then(createNextComponent);
            } else if (type === "Scatter chart") {
                createScatterComponent(workspace.id, sourceOperatorID, mapWidgetID, tabID, component.variableSelector1.value, component.variableSelector2.value, component.sourceSelector.value).then(createNextComponent);
            } else if (type === "Pie chart") {
                createPieComponent(workspace.id, sourceOperatorID, mapWidgetID, tabID, component.variableSelector1.value, component.sourceSelector.value).then(createNextComponent);
            }
        };

        // Fire the creation of initial components and then, all the user-defined items
        createInitialComponents().then(createNextComponent);
    };

    // Add a heatmap to the dashboard
    var createHeatmapComponent = function createHeatmapComponent(dashboardID, sourceOperatorID, mapWidgetID) {
        return new Promise(function (fulfill, reject) {
            var identifiers = []; // Stack of IDs of created operators and widgets fºor connections
            var createConnections = function createConnections() {
                // Connect heatmap operator to its source
                var sourceEndpoint = {
                    id: sourceOperatorID,
                    type: "operator",
                    endpoint: "entityOutput"
                };
                var operatorEndpoint = {
                    id: identifiers[0], // ID of ngsi-datamodel2heatmap-operator
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
            };

            createOperator(identifiers, dashboardID, componentVersions["ngsi-datamodel2heatmap"])
                .then(function () {
                    createConnections();
                });
        });
    };

    var createTendencyComponent = function createTendencyComponent(dashboardID, sourceOperatorID, mapWidgetID, tabID, variable, tendencyType, source) {
        return new Promise(function (fulfill, reject) {
            // Create wirecloud components
            var filterBy;
            if (source === "All") {
                filterBy = variable;
            } else {
                filterBy = "data." + variable;
            }
            var prop_nameValue = {
                hidden: false,
                readonly: false,
                value: filterBy
            };
            var panelConfig = {
                title: tendencyType + " of " + variable,
                width: 5,
                height: 18,
                top: 0,
                left: 10
            }
            var identifiers = [];
            var createComponentConnections = function createComponentConnections(values) {
                // Connect the wirecloud component
                var sourceEndpoint, targetEndpoint;
                // Connect source to filter operator
                if (source === "All") {
                    sourceEndpoint = {
                        id: sourceOperatorID,
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
            createOperator(identifiers, dashboardID, componentVersions["value-list-filter"], {prop_name: prop_nameValue})
                .then(function () {
                    return createOperator(identifiers, dashboardID, componentVersions["calculate-tendency"]);
                }).then(function () {
                    return createWidget(identifiers, dashboardID, tabID, componentVersions.panel, panelConfig);
                }).then(function () {
                    createComponentConnections(identifiers);
                });
        });
    };

    var createScatterComponent = function createScatterComponent(dashboardID, sourceOperatorID, mapWidgetID, tabID, variableX, variableY, source) {
        return new Promise(function (fulfill, reject) {
            // Create wirecloud components
            var filterByX, filterByY;
            if (source === "All") {
                filterByX = variableX;
                filterByY = variableY;
            } else {
                filterByX = "data." + variableX;
                filterByY = "data." + variableY;
            }
            var prop_nameX = {
                hidden: false,
                readonly: false,
                value: filterByX
            };
            var prop_nameY = {
                hidden: false,
                readonly: false,
                value: filterByY
            };
            var scatterProperties = {
                "title": {hidden: false, readonly: false, value: "Scatter chart"},
                "x-axis-label": {hidden: false, readonly: false, value: variableX},
                "y-axis-label": {hidden: false, readonly: false, value: variableY}
            };
            var highchartsConfig = {
                title: "Scatter chart",
                width: 5,
                height: 18,
                // top: 0,
                // left: 10
            };
            var identifiers = [];
            var createComponentConnections = function createComponentConnections(values) {
                // Connect the wirecloud component
                var sourceEndpoint, targetEndpoint;
                // Connect source to filter operator X
                if (source === "All") {
                    sourceEndpoint = {
                        id: sourceOperatorID,
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
                    // Connect source to filter operator Y
                    targetEndpoint.id = values[1];
                    createConnection(dashboardID, sourceEndpoint, targetEndpoint).then(function () {
                        // Connect FilterX to scatter-generator-operator
                        sourceEndpoint = {
                            id: values[0],
                            type: "operator",
                            endpoint: "outdata"
                        };
                        targetEndpoint = {
                            id: values[2],
                            type: "operator",
                            endpoint: "x-data-serie"
                        };
                        createConnection(dashboardID, sourceEndpoint, targetEndpoint).then(function () {
                            // Connect FilterY to scatter-generator-operator
                            sourceEndpoint.id = values[1];
                            targetEndpoint.endpoint = "y-data-serie";
                            createConnection(dashboardID, sourceEndpoint, targetEndpoint).then(function () {
                                // Connect scatter-generator-operator to Highcharts widget
                                sourceEndpoint = {
                                    id: values[2],
                                    type: "operator",
                                    endpoint: "chart-options"
                                };
                                targetEndpoint = {
                                    id: values[3],
                                    type: "widget",
                                    endpoint: "highcharts"
                                };
                                createConnection(dashboardID, sourceEndpoint, targetEndpoint).then(function () {
                                    fulfill(true);
                                });
                            });
                        });
                    });
                });
            };
            createOperator(identifiers, dashboardID, componentVersions["value-list-filter"], {prop_name: prop_nameX})
                .then(function () {
                    return createOperator(identifiers, dashboardID, componentVersions["value-list-filter"], {prop_name: prop_nameY});
                }).then(function () {
                    return createOperator(identifiers, dashboardID, componentVersions["scatter-chart-generator"], scatterProperties);
                }).then(function () {
                    return createWidget(identifiers, dashboardID, tabID, componentVersions.highcharts, highchartsConfig);
                }).then(function () {
                    createComponentConnections(identifiers);
                });
        });
    };


    var createPieComponent = function createPieComponent(dashboardID, sourceOperatorID, mapWidgetID, tabID, variable, source) {
        return new Promise(function (fulfill, reject) {
            // Create wirecloud components
            var filterBy;
            if (source === "All") {
                filterBy = variable;
            } else {
                filterBy = "data." + variable;
            }
            var prop_nameValue = {
                hidden: false,
                readonly: false,
                value: filterBy
            };
            var highchartsConfig = {
                title: "Pie chart of " + variable,
                width: 5,
                height: 18,
                top: 0,
                left: 10
            }
            var identifiers = [];
            var createComponentConnections = function createComponentConnections(values) {
                // Connect the wirecloud component
                var sourceEndpoint, targetEndpoint;
                // Connect source to filter operator
                if (source === "All") {
                    sourceEndpoint = {
                        id: sourceOperatorID,
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
                        endpoint: "label-serie"
                    };
                    createConnection(dashboardID, sourceEndpoint, targetEndpoint).then(function () {
                        // Connect tendency operator to panel widget
                        sourceEndpoint = {
                            id: values[1],
                            type: "operator",
                            endpoint: "chart-options"
                        };

                        targetEndpoint = {
                            id: values[2],
                            type: "widget",
                            endpoint: "highcharts"
                        };
                        createConnection(dashboardID, sourceEndpoint, targetEndpoint).then(function () {
                            fulfill(true);
                        });
                    });
                });
            };
            createOperator(identifiers, dashboardID, componentVersions["value-list-filter"], {prop_name: prop_nameValue})
                .then(function () {
                    return createOperator(identifiers, dashboardID, componentVersions["pie-chart-generator"]);
                }).then(function () {
                    return createWidget(identifiers, dashboardID, tabID, componentVersions.highcharts, highchartsConfig);
                }).then(function () {
                    createComponentConnections(identifiers);
                });
        });
    };

    // Configure the NGSI source of the dashboard
    // TODO: When multi-entities, several sources should be created dinamically
    var configureSourceOperator = function configureSourceOperator(workspaceId, sourceOperatorID, metadata) {
        var data = [
            {
                op: "replace",
                path: "/operators/" + sourceOperatorID + "/preferences/ngsi_server/value",
                value: metadata.serverURL ? metadata.serverURL : ""
            },
            {
                op: "replace",
                path: "/operators/" + sourceOperatorID + "/preferences/ngsi_proxy/value",
                value: metadata.proxyURL
            },
            {
                op: "replace",
                path: "/operators/" + sourceOperatorID + "/preferences/use_user_fiware_token/value",
                value: true
            },
            {
                op: "replace",
                path: "/operators/" + sourceOperatorID + "/preferences/ngsi_tenant/value",
                value: metadata.tenant ? metadata.tenant : ""
            },
            {
                op: "replace",
                path: "/operators/" + sourceOperatorID + "/preferences/ngsi_service_path/value",
                value: metadata.servicePath ? metadata.servicePath : ""
            },
            {
                op: "replace",
                path: "/operators/" + sourceOperatorID + "/preferences/ngsi_entities/value",
                value: metadata.types[0] ? metadata.types[0] : "" // TODO: soport multiple entity types
            },
            {
                op: "replace",
                path: "/operators/" + sourceOperatorID + "/preferences/ngsi_id_filter/value",
                value: metadata.idPattern ? metadata.idPattern : ""
            },
            {
                op: "replace",
                path: "/operators/" + sourceOperatorID + "/preferences/query/value",
                value: metadata.query ? metadata.query : ""
            },
            {
                op: "replace",
                path: "/operators/" + sourceOperatorID + "/preferences/ngsi_update_attributes/value",
                value: metadata.filteredAttributes ? metadata.filteredAttributes.join() : ""
            }

        ];
        return new Promise(function (fulfill, reject) {
            MashupPlatform.http.makeRequest("/api/workspace/" + workspaceId + "/wiring", {
                method: "PATCH",
                supportsAccessControl: false,
                postBody: JSON.stringify(data),
                contentType: "application/json-patch+json",
                onSuccess: function (response) {
                    var r = JSON.parse(response.responseText);
                    fulfill(r); // Return workspace data
                },
                onFailure: function (response) {
                    reject(response);
                }
            });
        });
    };

    /*
        HELPER FUNCTIONS
    */
    var createWorkspace = function createWorkspace(name, mashup, preferences) {
        if (!name || name.length < 1) {
            name = "Wizard-created workspace";
        }
        var data = {
            dry_run: false,
            allow_renaming: true,
            name: name,
            preferences: preferences
        };
        if (mashup) {
            data.mashup = mashup;
        }

        return new Promise(function (fulfill, reject) {
            MashupPlatform.http.makeRequest("/api/workspaces", {
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

    var createWidget = function createWidget(values, workspaceID, tabID, widget, config) {
	// Config adds properties in the form of a map {title, height, width, left, top}
        var data = {
            widget: widget,
            title: config.title,
            height: config.height,
            width: config.width,
            commit: true,
            left: config.left,
            top: config.top,
            layout: 0
        };

        return new Promise(function (fulfill, reject) {
            MashupPlatform.http.makeRequest("/api/workspace/" + workspaceID + "/tab/" + tabID + "/iwidgets", {
                method: "POST",
                supportsAccessControl: false,
                postBody: JSON.stringify(data),
                contentType: "application/json",
                onSuccess: function (response) {
                    var r = JSON.parse(response.responseText);
                    values.push(r.id); // Create a stack of widgets and operators IDs for consequent connections
                    fulfill(true);
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
            MashupPlatform.http.makeRequest("/api/workspace/" + workspaceID + "/tab/" + tabID + "/iwidget/" + widgetID + "/preferences", {
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

    // var currentOperatorID = 3; // Initial operator count for the base NGSI dashboard (2 operators and IDs start on 1)
    var currentOperatorID = 1; // Initial operator count for the base NGSI dashboard (IDs start on 1)
    var createOperator = function createOperator(values, workspaceID, operator, preferences, properties) {
        var op = {
            'name': operator,
            'preferences': preferences ? preferences : {},
            'properties': properties ? properties : {}
        };

        var operatorID = currentOperatorID++;
        var data = [{
            'op': "add",
            'path': "/operators/" + operatorID,
            'value': op
        }];

        return new Promise(function (fulfill, reject) {
            MashupPlatform.http.makeRequest("/api/workspace/" + workspaceID + "/wiring", {
                method: "PATCH",
                supportsAccessControl: false,
                postBody: JSON.stringify(data),
                contentType: "application/json-patch+json",
                onSuccess: function (response) {
                    values.push(operatorID); // Create a stack of widgets and operators IDs for consequent connections
                    fulfill(true);
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
            'path': "/connections/-",
            'value': connection
        }];

        return new Promise(function (fulfill, reject) {
            MashupPlatform.http.makeRequest("/api/workspace/" + workspaceID + "/wiring", {
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
