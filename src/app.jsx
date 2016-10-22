
(function () {

    /**
     * Settings for the app:
     * url: the url of the khl4server
     * ticks: How many ticks between requests. 1 tick is ~ 500ms
     */
    var settings = {
        url: "https://khl4.ngrok.io",
        ticksPerUpdate: 20,
        tickLength: 500
    }

    /**
     * Root object for the app
     */
    class KhlApp extends React.Component {
        constructor(props) {
            super(props);
            this.state = {
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
                levels: [
                    {label: "--", level: "0"},
                    {label: "--", level: "0"},
                    {label: "--", level: "0"}
                ],
                url: localStorage.getItem("url") || settings.url,
                clockIntervalID: 0,
                recStartTime: null,
                tick: 0
            };
        }
        /**
         * Stop and start the clock
         */
        toggleClock() {
            if (this.toggleRec()) {
                // initialize recording
                this.initRec(()=> {
                    this.updatePos();
                    // start the clock
                    this.state.clockIntervalID = setInterval(() => {
                        if (++this.state.tick > settings.ticksPerUpdate) {
                            this.updatePos();
                            this.state.tick = 0;
                        }
                        this.state.info.time = this.getUpdatedTime(this.state.recStartTime);
                        this.setState(this.state);
                    }, settings.tickLength)
                });
            } else {
                // stop the clock
                clearInterval(this.state.clockIntervalID);
                this.endRec(() => {
                    this.setState(this.state);
                });
            }
            this.setState(this.state);
        }
        /**
         * Show/hide the settings control
         */
        toggleSettings() {
            if (this.state.settings.classname.indexOf("open") < 0) {
                this.state.settings.classname.push("open");
            } else {
                this.state.settings.classname = ["control"]
            }
            this.setState(this.state);
        }
        /**
         * Stop and start recording
         * @returns {boolean}
         */
        toggleRec() {
            if (this.state.recStartTime === null) {
                // start recording
                this.state.status.classname.push("recording");
                this.state.recStartTime = new Date();
            } else {
                // stop recording
                this.state.status.classname = this.state.status.classname.filter(function (v) {
                    return (v !== "recording")
                });
                this.state.levels = this.getZeroLevels();
                this.state.recStartTime = null;
            }
            return (this.state.recStartTime !== null);
        }
        /**
         * Store url from settings
         */
        changeUrlHandler(event) {
            var url = event.target.value;
            localStorage.setItem("url", url);
            this.state.url = url;
            this.setState(this.state);
        }
        /**
         * Store grid name from settings
         */
        changeGridHandler(event) {
            var grid_id = event.target.value;
            localStorage.setItem("grid_id", grid_id);
            this.state.grid.id = grid_id;
            this.setState(this.state);
        }
        /**
         * Start a recording
         */
        initRec(callback) {
            jQuery.getJSON(this.state.url + "/recording/start?grid=" + this.state.grid.id + "&callback=?")
                .done(data => {
                    this.state.info.rec_id = data.recording_id;
                    callback();
            });
        }
        /**
         * End recording
         */
        endRec(callback) {
            jQuery.getJSON(this.state.url + "/recording/stop?rec_id=" + this.state.info.rec_id + "&callback=?")
                .done(data => {
                    this.state.grid.classname = ["control"];
                    this.state.info.rec_id = "[not recording]";
                    callback();
                });
        }
        /**
         * Send current position to the server, receive back the calculated chord
         */
        updatePos() {
            var number = "0000" + ( parseInt(this.state.info.number) + 1);
            number = number.substr(number.length - 4);

            navigator.geolocation.getCurrentPosition(
                pos => {
                    var lon = pos.coords.longitude;
                    var lat = pos.coords.latitude;
                    jQuery.getJSON([
                        this.state.url,
                        "/recording/node?nr=", this.state.info.number,
                        "&rec_id=", this.state.info.rec_id,
                        "&grid_id=", this.state.grid.id,
                        "&lat=", lat,
                        "&lon=", lon,
                        "&callback=?"
                    ].join(""))
                        .done(data => {
                            this.state.grid.classname = this.getGridClassName(data);
                            this.state.levels = this.getLevels(data);
                        })
                }, function (err) {
                    console.warn('ERROR(' + err.code + '): ' + err.message);
                }, {
                    enableHighAccuracy: true,
                    timeout: 5000,
                    maximumAge: 0
                });
            this.state.info.number = number;
        }
        /**
         * Translate the received data (the chord) into class names for the grid control
         * @param data
         */
        getGridClassName(data) { 
            return ["control"].concat(
                data.filter(v => v.hasOwnProperty("note"))
                    .map(v => "midi" + v.note))
        }
        /**
         * Update the levels data in state object
         * @param data
         */
        getLevels(data) { 
            return data.filter(v => v.hasOwnProperty("note"))
                .map(v =>({"label": this.m2n(v.note), "level": 100 / 127 * v.velocity}))
        }
        /**
         * Reset the levels data in state object
         */
        getZeroLevels() { 
            return [
                {label: "--", level: "0"},
                {label: "--", level: "0"},
                {label: "--", level: "0"}]
        }
        /**
         * Get the elapsed time since beginning the recordimg
         */
        getUpdatedTime(startTime) { 
            return new Date((new Date() - startTime) - 3600000)
                .toTimeString()
                .replace(/.*(\d{2}:\d{2}:\d{2}).*/, "$1")
        }
        /**
         * Midi note number to human readable note name
         *
         * @param m
         * @returns {string}
         */
        m2n(m) {
            return ['c', 'c \u266F', 'd', 'd \u266F', 'e', 'f', 'f \u266F', 
            'g', 'g \u266F', 'a', 'a \u266F', 'b'][m % 12] 
        }
        /**
         * Render the componente
         */
        render() {
            return (
                <div className="khlApp">
                    <StatusControl data={ this.state } toggleHandler = { this.toggleClock.bind(this) } toggleSettings = { this.toggleSettings.bind(this) } />
                    <SettingsControl data={ this.state } changeUrlHandler = { this.changeUrlHandler.bind(this) } changeGridHandler = { this.changeGridHandler.bind(this) } />
                    <GridControl data={ this.state } />
                    <LevelControl data = { this.state} />
                    <InfoControl data={ this.state } />
                </div>
            );
        }
    }

    /**
     * Status component: has start toggle and status indicators
     */
    class StatusControl extends React.Component {
        render() {
            return (
                <div id="status" className={ this.props.data.status.classname.join(" ") }>
                    <div>
                        <button id="toggle_rec" onClick={ this.props.toggleHandler }></button>
                    </div>
                    <StatusIndicator params={{label: "rec", id: "rec_indicator"}} />
                {/*<StatusIndicator params={{label: "send", id: "send_indicator"}} />*/}
                    <div>
                        <SettingsToggleButton toggleHandler={ this.props.toggleSettings }/>
                    </div>
                </div>
            );
        }
    }

    /**
     * Status indicator: takes 2 params: label and id
     */
    class StatusIndicator extends React.Component {
        render() {
            return (
                <div id= { this.props.params.id } className="indicator">
                    <svg viewBox="0 0 10 10">
                        <circle cx="5" cy="5" r="4"/>
                    </svg>
                    <span className="label">{ this.props.params.label }</span>
                </div>
            );
        }
    }

    /**
     * Button for toggling the visibility of the settings area
     */
    class SettingsToggleButton extends React.Component {
        render() {
            return (
                <button id="toggle_settings"  onClick={ this.props.toggleHandler }>
                    <svg viewBox="0 0 25 25" >
                        <path d="M20,14.5v-2.9l-1.8-0.3c-0.1-0.4-0.3-0.8-0.6-1.4l1.1-1.5l-2.1-2.1l-1.5,1.1c-0.5-0.3-1-0.5-1.4-0.6L13.5,5h-2.9l-0.3,1.8
	C9.8,6.9,9.4,7.1,8.9,7.4L7.4,6.3L5.3,8.4l1,1.5c-0.3,0.5-0.4,0.9-0.6,1.4L4,11.5v2.9l1.8,0.3c0.1,0.5,0.3,0.9,0.6,1.4l-1,1.5
	l2.1,2.1l1.5-1c0.4,0.2,0.9,0.4,1.4,0.6l0.3,1.8h3l0.3-1.8c0.5-0.1,0.9-0.3,1.4-0.6l1.5,1.1l2.1-2.1l-1.1-1.5c0.3-0.5,0.5-1,0.6-1.4
	L20,14.5z M12,16c-1.7,0-3-1.3-3-3s1.3-3,3-3s3,1.3,3,3S13.7,16,12,16z"/>
                    </svg>
                </button>
            );
        }
    }

    class SettingsControl extends React.Component {
        render() {
            return (
                <div id="settings" className={ this.props.data.settings.classname.join(" ") }>
                   <UrlInputControl data={ this.props.data } changeUrlHandler={ this.props.changeUrlHandler } />
                   <GridInputControl data={ this.props.data } changeGridHandler={ this.props.changeGridHandler } />
                </div>
            );
        }
    }

    class UrlInputControl extends React.Component {
        render() {
            return (
                <input type="text" id="server_url" value={ this.props.data.url }  onChange={ this.props.changeUrlHandler } />
            );
        }
    }

    class GridInputControl extends React.Component {
        render() {
            return (
                <input type="text" id="grid_id" value={ this.props.data.grid.id }  onChange={ this.props.changeGridHandler } />
            );
        }
    }

    /**
     * Grid component, visual feedback
     */
    class GridControl extends  React.Component {
        render() {
            return (
                <div id="grid" className={ this.props.data.grid.classname.join(" ") }>
                    <svg viewBox="0 0 264 128">
                        <polyLine points="192,12 12,12 42,64 72,12 102,64 132,12 162,64 192,12
                        222,64 42,64 72,116 102,64 132,116 162,64 192,116 222,64 252,116 72,116"/>

                        <circle id="c1" cx="12" cy="12" r="10"/>
                        <circle id="c2" cx="72" cy="12" r="10"/>
                        <circle id="c3" cx="132" cy="12" r="10"/>
                        <circle id="c4" cx="192" cy="12" r="10"/>

                        <circle id="c5" cx="42" cy="64" r="10"/>
                        <circle id="c6" cx="102" cy="64" r="10"/>
                        <circle id="c7" cx="162" cy="64" r="10"/>
                        <circle id="c8" cx="222" cy="64" r="10"/>

                        <circle id="c9" cx="72" cy="116" r="10"/>
                        <circle id="c10" cx="132" cy="116" r="10"/>
                        <circle id="c11" cx="192" cy="116" r="10"/>
                        <circle id="c12" cx="252" cy="116" r="10"/>
                    </svg>
                </div>
            );
        }
    }

    class LevelControl extends  React.Component {
        render() {
            return (
                <div id="level" className="control level">
                    <LevelBar params={{
                        label: this.props.data.levels[0].label,
                        level: this.props.data.levels[0].level
                    }}  />
                    <LevelBar params={{
                        label: this.props.data.levels[1].label,
                        level: this.props.data.levels[1].level
                    }}  />
                    <LevelBar params={{
                        label: this.props.data.levels[2].label,
                        level: this.props.data.levels[2].level
                    }}  />
                </div>
            );
        }
    }

    class LevelBar extends  React.Component {
        render() {
            return (
                <div className="bar">
                    <span className="label">{ this.props.params.label }</span>
                    <div className="outer">
                        <div className="inner" style={{width: this.props.params.level + "%"}}></div>
                    </div>
                </div>
            )
        }
    }

    /**
     * Info component, textual feedback
     */
    class InfoControl extends  React.Component {
        render() {
            return (
                <div id="info" className="control dark">
                    <div id="rec_id">id: {this.props.data.info.rec_id}</div>
                    <div id="number">{this.props.data.info.number}</div>
                    <div id="time">{this.props.data.info.time}</div>
                </div>
            );
        }
    }

    ReactDOM.render(
        <KhlApp />,
        document.getElementById('container')
    );

}());

