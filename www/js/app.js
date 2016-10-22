"use strict";

(function () {

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
    var initial_state = {
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
        recStartTime: null,
        tick: 0
    };

    /**
     * Root object for the app
     */
    var KhlApp = React.createClass({
        displayName: "KhlApp",

        getInitialState: function getInitialState() {
            return { data: initial_state };
        },
        /**
         * Stop and start the clock
         */
        toggleClock: function toggleClock() {
            var _this = this;

            if (this.toggleRec()) {
                // initialize recording
                this.initRec(function () {
                    // start the clock
                    _this.state.data.clockIntervalID = setInterval(function () {
                        if (++_this.state.data.tick > settings.ticksPerUpdate) {
                            _this.updatePos();
                            _this.state.data.tick = 0;
                        }
                        _this.state.data.info.time = _this.getUpdatedTime(_this.state.data.recStartTime);
                        _this.setState(_this.state);
                    }, settings.tickLength);
                });
            } else {
                // stop the clock
                clearInterval(this.state.data.clockIntervalID);
                this.endRec(function () {
                    _this.setState(_this.state);
                });
            }
            this.setState(this.state);
        },
        /**
         * Show/hide the settings control
         */
        toggleSettings: function toggleSettings() {
            if (this.state.data.settings.classname.indexOf("open") < 0) {
                this.state.data.settings.classname.push("open");
            } else {
                this.state.data.settings.classname = ["control"];
            }
            console.log(state.settings.classname);
            this.setState(this.state);
        },
        /**
         * Stop and start recording
         * @returns {boolean}
         */
        toggleRec: function toggleRec() {
            if (this.state.data.recStartTime === null) {
                // start recording
                this.state.data.status.classname.push("recording");
                this.state.data.recStartTime = new Date();
            } else {
                // stop recording
                this.state.data.status.classname = this.state.data.status.classname.filter(function (v) {
                    return v !== "recording";
                });
                this.state.data.levels = this.getZeroLevels();
                this.state.data.recStartTime = null;
            }
            return this.state.data.recStartTime !== null;
        },
        /**
         * Store url from settings
         */
        changeUrlHandler: function changeUrlHandler(event) {
            var url = event.target.value;
            localStorage.setItem("url", url);
            this.state.data.url = url;
            this.setState(this.state);
        },
        /**
         * Store grid name from settings
         */
        changeGridHandler: function changeGridHandler(event) {
            var grid_id = event.target.value;
            localStorage.setItem("grid_id", grid_id);
            this.state.data.grid.id = grid_id;
            this.setState(this.state);
        },
        /**
         * Start a recording
         */
        initRec: function initRec(callback) {
            var _this2 = this;

            jQuery.getJSON(this.state.data.url + "/recording/start?grid=" + this.state.data.grid.id + "&callback=?").done(function (data) {
                _this2.state.data.info.rec_id = data.recording_id;
                callback();
            });
        },
        /**
         * End recording
         */
        endRec: function endRec(callback) {
            var _this3 = this;

            jQuery.getJSON(this.state.data.url + "/recording/stop?rec_id=" + this.state.data.info.rec_id + "&callback=?").done(function (data) {
                console.log(data);
                _this3.state.data.grid.classname = ["control"];
                _this3.state.data.info.rec_id = "[not recording]";
                callback();
            });
        },
        /**
         * Send current position to the server, receive back the calculated chord
         */
        updatePos: function updatePos() {
            var _this4 = this;

            var number = "0000" + (parseInt(this.state.data.info.number) + 1);
            number = number.substr(number.length - 4);

            navigator.geolocation.getCurrentPosition(function (pos) {
                var lon = pos.coords.longitude;
                var lat = pos.coords.latitude;
                jQuery.getJSON([_this4.state.data.url, "/recording/node?nr=", _this4.state.data.info.number, "&rec_id=", _this4.state.data.info.rec_id, "&grid_id=", _this4.state.data.grid.id, "&lat=", lat, "&lon=", lon, "&callback=?"].join("")).done(function (data) {
                    _this4.state.data.grid.classname = _this4.getGridClassName(data);
                    _this4.state.data.levels = _this4.getLevels(data);
                });
            }, function (err) {
                console.warn('ERROR(' + err.code + '): ' + err.message);
            }, {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            });

            this.state.data.info.number = number;
        },
        /**
         * Translate the received data (the chord) into class names for the grid control
         * @param data
         */
        getGridClassName: function getGridClassName(data) {
            return ["control"].concat(data.filter(function (v) {
                return v.hasOwnProperty("note");
            }).map(function (v) {
                return "midi" + v.note;
            }));
        },
        /**
         * Update the levels data in state object
         * @param data
         */
        getLevels: function getLevels(data) {
            var _this5 = this;

            return data.filter(function (v) {
                return v.hasOwnProperty("note");
            }).map(function (v) {
                return { "label": _this5.m2n(v.note), "level": 100 / 127 * v.velocity };
            });
        },
        /**
         * Reset the levels data in state object
         */
        getZeroLevels: function getZeroLevels() {
            return [{ label: "--", level: "0" }, { label: "--", level: "0" }, { label: "--", level: "0" }];
        },
        /**
         * Get the elapsed time since beginning the recordimg
         */
        getUpdatedTime: function getUpdatedTime(startTime) {
            return new Date(new Date() - startTime - 3600000).toTimeString().replace(/.*(\d{2}:\d{2}:\d{2}).*/, "$1");
        },
        /**
         * Midi note number to human readable note name
         *
         * @param m
         * @returns {string}
         */
        m2n: function m2n(m) {
            return ['c', "c ♯", 'd', "d ♯", 'e', 'f', "f ♯", 'g', "g ♯", 'a', "a ♯", 'b'][m % 12];
        },
        /**
         * Render the componente
         */
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
