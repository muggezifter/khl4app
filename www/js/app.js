"use strict";

(function () {
    /**
     * Holds recording start time
     */
    var recStartTime = null;

    /**
     * Settings for the app:
     * url: the url of the khl4server
     * ticks: How many ticks between requests. 1 tick is ~ 500ms
     */
    var settings = {
        //url: "http://localhost:8080",
        ticksPerUpdate: 20,
        tickLength: 500
    };

    /**
     * Object that holds state for the various components
     */
    var state = {
        info: {
            rec_id: "[not recording]",
            number: "0000",
            time: "00:00:00"
        },
        grid: {
            classname: ["control"],
            id: localStorage.getItem("grid_id") || "G0001"
        },
        status: {
            classname: ["control"]
        },
        settings: {
            classname: ["control"]
        },
        levels: [{ label: "--", level: "0" }, { label: "--", level: "0" }, { label: "--", level: "0" }],
        url: localStorage.getItem("url") || "https://khl4.ngrok.io",
        clockIntervalID: 0,
        tick: 0
    };

    /**
     * Midi note number to human readable note name
     *
     * @param m
     * @returns {string}
     */
    var m2n = function m2n(m) {
        return ['c', "c ♯", 'd', "d ♯", 'e', 'f', "f ♯", 'g', "g ♯", 'a', "a ♯", 'b'][m % 12];
    };

    /**
     * Initialize recording: on the server a new record is made in the db. Set the recording id.
     *
     * @returns {khl}
     */
    var initRec = function initRec(callback) {
        jQuery.getJSON(state.url + "/recording/start?grid=" + state.grid.id + "&callback=?").done(function (data) {
            state.info.rec_id = data.recording_id;
            callback();
        });
    };

    /**
     * Stop and start recording
     * @returns {boolean}
     */
    var toggleRec = function toggleRec() {
        if (recStartTime === null) {
            // start recording
            state.status.classname.push("recording");
            recStartTime = new Date();
        } else {
            // stop recording
            state.status.classname = state.status.classname.filter(function (v) {
                return v !== "recording";
            });
            state.levels = getZeroLevels();
            recStartTime = null;
        }
        return recStartTime !== null;
    };

    /**
     * End recording
     */
    var endRec = function endRec(callback) {
        jQuery.getJSON(state.url + "/recording/stop?rec_id=" + state.info.rec_id + "&callback=?").done(function (data) {
            console.log(data);
            state.grid.classname = ["control"];
            state.info.rec_id = "[not recording]";
            callback();
        });
    };

    /**
     * Translate the received data (the chord) into class names for the grid control
     * @param data
     */
    var getGridClassName = function getGridClassName(data) {
        return ["control"].concat(data.filter(function (v) {
            return v.hasOwnProperty("note");
        }).map(function (v) {
            return "midi" + v.note;
        }));
    };

    /**
     * Update the levels data in state object
     * @param data
     */
    var getLevels = function getLevels(data) {
        return data.filter(function (v) {
            return v.hasOwnProperty("note");
        }).map(function (v) {
            return { "label": m2n(v.note), "level": 100 / 127 * v.velocity };
        });
    };

    /**
     * Reset the levels data in state object
     */
    var getZeroLevels = function getZeroLevels() {
        return [{ label: "--", level: "0" }, { label: "--", level: "0" }, { label: "--", level: "0" }];
    };

    /**
     * Get the elapsed time since beginning the recordimg
     */
    var getUpdatedTime = function getUpdatedTime() {
        return new Date(new Date() - recStartTime - 3600000).toTimeString().replace(/.*(\d{2}:\d{2}:\d{2}).*/, "$1");
    };

    /**
     * Send current position to the server, receive back the calculated chord
     */
    var updatePos = function updatePos() {
        var number = "0000" + (parseInt(state.info.number) + 1);
        number = number.substr(number.length - 4);

        navigator.geolocation.getCurrentPosition(function (pos) {
            var lon = pos.coords.longitude;
            var lat = pos.coords.latitude;
            jQuery.getJSON([state.url, "/recording/node?nr=", state.info.number, "&rec_id=", state.info.rec_id, "&grid_id=", state.grid.id, "&lat=", lat, "&lon=", lon, "&callback=?"].join("")).done(function (data) {
                state.grid.classname = getGridClassName(data);
                state.levels = getLevels(data);
                console.log(state.levels);
                console.log(data);
            });
        }, function (err) {
            console.warn('ERROR(' + err.code + '): ' + err.message);
        }, {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
        });

        state.info.number = number;
    };

    /**
     * Root object for the app
     */
    var KhlApp = React.createClass({
        displayName: "KhlApp",

        getInitialState: function getInitialState() {
            return { data: state };
        },
        // toggle handler to be passed to the status control
        toggleClock: function toggleClock() {
            var _this = this;

            if (toggleRec()) {
                // initialize recording
                initRec(function () {
                    // start the clock
                    _this.state.clockIntervalID = setInterval(function () {
                        if (++_this.state.data.tick > settings.ticksPerUpdate) {
                            updatePos();
                            _this.state.data.tick = 0;
                        }
                        _this.state.data.info.time = getUpdatedTime();
                        _this.setState(_this.state);
                    }, settings.tickLength);
                });
            } else {
                // stop the clock
                clearInterval(this.state.clockIntervalID);
                endRec(function () {
                    _this.setState(_this.state);
                });
            }
            this.setState(this.state);
        },
        toggleSettings: function toggleSettings() {
            if (state.settings.classname.indexOf("open") < 0) {
                state.settings.classname.push("open");
            } else {
                state.settings.classname = ["control"];
            }
            console.log(state.settings.classname);
            this.setState(this.state);
        },
        changeUrlHandler: function changeUrlHandler(event) {
            var url = event.target.value;
            localStorage.setItem("url", url);
            state.url = url;
            this.setState(this.state);
        },
        changeGridHandler: function changeGridHandler(event) {
            var grid_id = event.target.value;
            localStorage.setItem("grid_id", grid_id);
            state.grid.id = grid_id;
            this.setState(this.state);
        },
        render: function render() {
            return React.createElement(
                "div",
                { className: "khlApp" },
                React.createElement(StatusControl, { data: this.state.data, toggleHandler: this.toggleClock, toggleSettings: this.toggleSettings }),
                React.createElement(SettingsControl, { data: this.state.data, changeUrlHandler: this.changeUrlHandler, changeGridHandler: this.changeGridHandler }),
                React.createElement(GridControl, { data: this.state.data }),
                React.createElement(LevelControl, { data: this.state.data }),
                React.createElement(InfoControl, { data: this.state.data })
            );
        }
    });

    /**
     * Status component: has start toggle and status indicators
     */
    var StatusControl = React.createClass({
        displayName: "StatusControl",

        render: function render() {
            return React.createElement(
                "div",
                { id: "status", className: this.props.data.status.classname.join(" ") },
                React.createElement(
                    "div",
                    null,
                    React.createElement("button", { id: "toggle_rec", onClick: this.props.toggleHandler })
                ),
                React.createElement(StatusIndicator, { params: { label: "rec", id: "rec_indicator" } }),
                React.createElement(
                    "div",
                    null,
                    React.createElement(SettingsToggleButton, { toggleHandler: this.props.toggleSettings })
                )
            );
        }
    });

    /**
     * Status indicator: takes 2 params: label and id
     */
    var StatusIndicator = React.createClass({
        displayName: "StatusIndicator",

        render: function render() {
            return React.createElement(
                "div",
                { id: this.props.params.id, className: "indicator" },
                React.createElement(
                    "svg",
                    { viewBox: "0 0 10 10" },
                    React.createElement("circle", { cx: "5", cy: "5", r: "4" })
                ),
                React.createElement(
                    "span",
                    { className: "label" },
                    this.props.params.label
                )
            );
        }
    });

    /**
     * Button for toggling the visibility of the settings area
     */
    var SettingsToggleButton = React.createClass({
        displayName: "SettingsToggleButton",

        render: function render() {
            return React.createElement(
                "button",
                { id: "toggle_settings", onClick: this.props.toggleHandler },
                React.createElement(
                    "svg",
                    { viewBox: "0 0 25 25" },
                    React.createElement("path", { d: "M20,14.5v-2.9l-1.8-0.3c-0.1-0.4-0.3-0.8-0.6-1.4l1.1-1.5l-2.1-2.1l-1.5,1.1c-0.5-0.3-1-0.5-1.4-0.6L13.5,5h-2.9l-0.3,1.8\r C9.8,6.9,9.4,7.1,8.9,7.4L7.4,6.3L5.3,8.4l1,1.5c-0.3,0.5-0.4,0.9-0.6,1.4L4,11.5v2.9l1.8,0.3c0.1,0.5,0.3,0.9,0.6,1.4l-1,1.5\r l2.1,2.1l1.5-1c0.4,0.2,0.9,0.4,1.4,0.6l0.3,1.8h3l0.3-1.8c0.5-0.1,0.9-0.3,1.4-0.6l1.5,1.1l2.1-2.1l-1.1-1.5c0.3-0.5,0.5-1,0.6-1.4\r L20,14.5z M12,16c-1.7,0-3-1.3-3-3s1.3-3,3-3s3,1.3,3,3S13.7,16,12,16z" })
                )
            );
        }
    });

    /**
     * Grid component, visual feedback
     */
    var SettingsControl = React.createClass({
        displayName: "SettingsControl",

        render: function render() {
            return React.createElement(
                "div",
                { id: "settings", className: this.props.data.settings.classname.join(" ") },
                React.createElement(UrlInputControl, { data: this.props.data, changeUrlHandler: this.props.changeUrlHandler }),
                React.createElement(GridInputControl, { data: this.props.data, changeGridHandler: this.props.changeGridHandler })
            );
        }
    });

    var UrlInputControl = React.createClass({
        displayName: "UrlInputControl",

        render: function render() {
            return React.createElement("input", { type: "text", id: "server_url", value: this.props.data.url, onChange: this.props.changeUrlHandler });
        }
    });

    var GridInputControl = React.createClass({
        displayName: "GridInputControl",

        render: function render() {
            return React.createElement("input", { type: "text", id: "grid_id", value: this.props.data.grid.id, onChange: this.props.changeGridHandler });
        }
    });

    /**
     * Grid component, visual feedback
     */
    var GridControl = React.createClass({
        displayName: "GridControl",

        render: function render() {
            return React.createElement(
                "div",
                { id: "grid", className: this.props.data.grid.classname.join(" ") },
                React.createElement(
                    "svg",
                    { viewBox: "0 0 264 128" },
                    React.createElement("polyLine", { points: "192,12 12,12 42,64 72,12 102,64 132,12 162,64 192,12\r 222,64 42,64 72,116 102,64 132,116 162,64 192,116 222,64 252,116 72,116" }),
                    React.createElement("circle", { id: "c1", cx: "12", cy: "12", r: "10" }),
                    React.createElement("circle", { id: "c2", cx: "72", cy: "12", r: "10" }),
                    React.createElement("circle", { id: "c3", cx: "132", cy: "12", r: "10" }),
                    React.createElement("circle", { id: "c4", cx: "192", cy: "12", r: "10" }),
                    React.createElement("circle", { id: "c5", cx: "42", cy: "64", r: "10" }),
                    React.createElement("circle", { id: "c6", cx: "102", cy: "64", r: "10" }),
                    React.createElement("circle", { id: "c7", cx: "162", cy: "64", r: "10" }),
                    React.createElement("circle", { id: "c8", cx: "222", cy: "64", r: "10" }),
                    React.createElement("circle", { id: "c9", cx: "72", cy: "116", r: "10" }),
                    React.createElement("circle", { id: "c10", cx: "132", cy: "116", r: "10" }),
                    React.createElement("circle", { id: "c11", cx: "192", cy: "116", r: "10" }),
                    React.createElement("circle", { id: "c12", cx: "252", cy: "116", r: "10" })
                )
            );
        }
    });

    var LevelControl = React.createClass({
        displayName: "LevelControl",

        render: function render() {
            return React.createElement(
                "div",
                { id: "level", className: "control level" },
                React.createElement(LevelBar, { params: {
                        label: this.props.data.levels[0].label,
                        level: this.props.data.levels[0].level
                    } }),
                React.createElement(LevelBar, { params: {
                        label: this.props.data.levels[1].label,
                        level: this.props.data.levels[1].level
                    } }),
                React.createElement(LevelBar, { params: {
                        label: this.props.data.levels[2].label,
                        level: this.props.data.levels[2].level
                    } })
            );
        }
    });

    var LevelBar = React.createClass({
        displayName: "LevelBar",

        render: function render() {
            return React.createElement(
                "div",
                { className: "bar" },
                React.createElement(
                    "span",
                    { className: "label" },
                    this.props.params.label
                ),
                React.createElement(
                    "div",
                    { className: "outer" },
                    React.createElement("div", { className: "inner", style: { width: this.props.params.level + "%" } })
                )
            );
        }
    });

    /**
     * Info component, textual feedback
     */
    var InfoControl = React.createClass({
        displayName: "InfoControl",

        render: function render() {
            //console.log("InfoControl render", this.props.data)
            return React.createElement(
                "div",
                { id: "info", className: "control dark" },
                React.createElement(
                    "div",
                    { id: "rec_id" },
                    "id: ",
                    this.props.data.info.rec_id
                ),
                React.createElement(
                    "div",
                    { id: "number" },
                    this.props.data.info.number
                ),
                React.createElement(
                    "div",
                    { id: "time" },
                    this.props.data.info.time
                )
            );
        }
    });

    ReactDOM.render(React.createElement(KhlApp, null), document.getElementById('container'));
})();
//# sourceMappingURL=app.js.map
