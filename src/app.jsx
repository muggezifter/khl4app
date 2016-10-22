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
    }

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
        levels: [
            {label: "--", level: "0"},
            {label: "--", level: "0"},
            {label: "--", level: "0"}
        ],
        url: localStorage.getItem("url") || "https://khl4.ngrok.io",
        clockIntervalID: 0,
        tick: 0
    }

    /**
     * Midi note number to human readable note name
     *
     * @param m
     * @returns {string}
     */
    var m2n = m => ['c', 'c \u266F', 'd', 'd \u266F', 'e', 'f', 'f \u266F', 'g', 'g \u266F', 'a', 'a \u266F', 'b'][m % 12];

    /**
     * Initialize recording: on the server a new record is made in the db. Set the recording id.
     *
     * @returns {khl}
     */
    var initRec = callback => {
        jQuery.getJSON(state.url + "/recording/start?grid=" + state.grid.id + "&callback=?")
            .done(data => {
                state.info.rec_id = data.recording_id;
                callback();
            });
    }

    /**
     * Stop and start recording
     * @returns {boolean}
     */
    var toggleRec = () => {
        if (recStartTime === null) {
            // start recording
            state.status.classname.push("recording");
            recStartTime = new Date();
        } else {
            // stop recording
            state.status.classname = state.status.classname.filter(function (v) {
                return (v !== "recording")
            });
            state.levels = getZeroLevels();
            recStartTime = null;
        }
        return (recStartTime !== null);
    }


    /**
     * End recording
     */
    var endRec = callback => {
        jQuery.getJSON(state.url + "/recording/stop?rec_id=" + state.info.rec_id + "&callback=?")
            .done(data => {
                console.log(data);
                state.grid.classname = ["control"];
                state.info.rec_id = "[not recording]";
                callback();
            });
    }

    /**
     * Translate the received data (the chord) into class names for the grid control
     * @param data
     */
    var getGridClassName = data => ["control"]
        .concat(
        data
            .filter(v => v.hasOwnProperty("note"))
            .map(v => "midi" + v.note)
    );


    /**
     * Update the levels data in state object
     * @param data
     */
    var getLevels = data => data.filter(v => v.hasOwnProperty("note"))
        .map(v =>({"label": m2n(v.note), "level": 100 / 127 * v.velocity})
    );


    /**
     * Reset the levels data in state object
     */
    var getZeroLevels = () => ([
        {label: "--", level: "0"},
        {label: "--", level: "0"},
        {label: "--", level: "0"}
    ]);

    /**
     * Get the elapsed time since beginning the recordimg
     */
    var getUpdatedTime = () => new Date((new Date() - recStartTime) - 3600000)
        .toTimeString()
        .replace(/.*(\d{2}:\d{2}:\d{2}).*/, "$1");

    /**
     * Send current position to the server, receive back the calculated chord
     */
    var updatePos = function () {
        var number = "0000" + ( parseInt(state.info.number) + 1);
        number = number.substr(number.length - 4);

        navigator.geolocation.getCurrentPosition(
            function (pos) {
                var lon = pos.coords.longitude;
                var lat = pos.coords.latitude;
                jQuery.getJSON([
                    state.url,
                    "/recording/node?nr=", state.info.number,
                    "&rec_id=", state.info.rec_id,
                    "&grid_id=", state.grid.id,
                    "&lat=", lat,
                    "&lon=", lon,
                    "&callback=?"
                ].join(""))
                    .done(function (data) {
                        state.grid.classname = getGridClassName(data);
                        state.levels = getLevels(data);
                        console.log(state.levels)
                        console.log(data);
                    })
            }, function (err) {
                console.warn('ERROR(' + err.code + '): ' + err.message);
            }, {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            });

        state.info.number = number;
    }


    /**
     * Root object for the app
     */
    var KhlApp = React.createClass({
        getInitialState: () => ({data: state}),
        // toggle handler to be passed to the status control
        toggleClock: function () {
            if (toggleRec()) {
                // initialize recording
                initRec(()=> {
                    // start the clock
                    this.state.clockIntervalID = setInterval(() => {
                        if (++this.state.data.tick > settings.ticksPerUpdate) {
                            updatePos();
                            this.state.data.tick = 0;
                        }
                        this.state.data.info.time = getUpdatedTime();
                        this.setState(this.state);
                    }, settings.tickLength)
                });
            } else {
                // stop the clock
                clearInterval(this.state.clockIntervalID);
                endRec(() => {
                    this.setState(this.state);
                });
            }
            this.setState(this.state);
        },
        toggleSettings: function () {
            if (state.settings.classname.indexOf("open") < 0) {
                state.settings.classname.push("open");
            } else {
                state.settings.classname = ["control"]
            }
            console.log(state.settings.classname);
            this.setState(this.state);
        },
        changeUrlHandler: function (event) {
            var url = event.target.value;
            localStorage.setItem("url", url);
            state.url = url;
            this.setState(this.state);
        },
        changeGridHandler: function (event) {
            var grid_id = event.target.value;
            localStorage.setItem("grid_id", grid_id);
            state.grid.id = grid_id;
            this.setState(this.state);
        },
        render: function () {
            return (
                <div className="khlApp">
                    <StatusControl data={ this.state.data } toggleHandler = { this.toggleClock } toggleSettings = { this.toggleSettings } />
                    <SettingsControl data={ this.state.data } changeUrlHandler = { this.changeUrlHandler } changeGridHandler = { this.changeGridHandler } />
                    <GridControl data={ this.state.data } />
                    <LevelControl data = { this.state.data} />
                    <InfoControl data={ this.state.data } />
                </div>
            );
        }
    });

    /**
     * Status component: has start toggle and status indicators
     */
    var StatusControl = React.createClass({
        render: function () {
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
    });

    /**
     * Status indicator: takes 2 params: label and id
     */
    var StatusIndicator = React.createClass({
        render: function () {
            return (
                <div id= { this.props.params.id } className="indicator">
                    <svg viewBox="0 0 10 10">
                        <circle cx="5" cy="5" r="4"/>
                    </svg>
                    <span className="label">{ this.props.params.label }</span>
                </div>
            );
        }
    });

    /**
     * Button for toggling the visibility of the settings area
     */
    var SettingsToggleButton = React.createClass({
        render: function () {
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
    });



    /**
     * Grid component, visual feedback
     */
    var SettingsControl = React.createClass({
        render: function () {
            return (
                <div id="settings" className={ this.props.data.settings.classname.join(" ") }>
                   <UrlInputControl data={ this.props.data } changeUrlHandler={ this.props.changeUrlHandler } />
                   <GridInputControl data={ this.props.data } changeGridHandler={ this.props.changeGridHandler } />
                </div>
            );
        }
    });

    var UrlInputControl = React.createClass({
        render: function () {
            return (
                <input type="text" id="server_url" value={ this.props.data.url }  onChange={ this.props.changeUrlHandler } />
            );
        }
    });

    var GridInputControl = React.createClass({
        render: function () {
            return (
                <input type="text" id="grid_id" value={ this.props.data.grid.id }  onChange={ this.props.changeGridHandler } />
            );
        }
    });

    /**
     * Grid component, visual feedback
     */
    var GridControl = React.createClass({
        render: function () {
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
    });

    var LevelControl = React.createClass({
        render: function () {
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
    });

    var LevelBar = React.createClass({
        render: function () {
            return (
                <div className="bar">
                    <span className="label">{ this.props.params.label }</span>
                    <div className="outer">
                        <div className="inner" style={{width: this.props.params.level + "%"}}></div>
                    </div>
                </div>
            )
        }
    });

    /**
     * Info component, textual feedback
     */
    var InfoControl = React.createClass({
        render: function () {
            //console.log("InfoControl render", this.props.data)
            return (
                <div id="info" className="control dark">
                    <div id="rec_id">id: {this.props.data.info.rec_id}</div>
                    <div id="number">{this.props.data.info.number}</div>
                    <div id="time">{this.props.data.info.time}</div>
                </div>
            );
        }
    });

    ReactDOM.render(
        <KhlApp />,
        document.getElementById('container')
    );


}());

