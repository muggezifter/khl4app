(function () {

    /**
     * Midi to note name
     *
     * @param m
     * @returns {string}
     */
    var m2n = function (m) {
        return ['c', 'c#', 'd', 'd#', 'e', 'f', 'f#', 'g', 'g#', 'a', 'a#', 'b'][m % 12];
    }


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
        //url: "https://khl4.localtunnel.me",
        url: "http://localhost:8080",
        ticks: 10
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
            classname: ["control"]
        },
        status: {
            classname: ["control"]
        }
    }

    /**
     * Initialize recording: on the server a new record is made in the db. Set the recording id.
     *
     * @returns {khl}
     */
    var initRec = function () {
        jQuery.getJSON(settings.url + "/recording/start?callback=?")
            .done(function (data) {
                console.log(state.info);
                state.info.rec_id = data.recording_id;
                state.info.number = "0000";
                state.info.time = "00:00:00";
                console.log(data);
            });
    }

    /**
     * Stop and start recording
     * @returns {boolean}
     */
    var toggleRec = function () {
        if (recStartTime === null) {
            // start recording
            state.status.classname.push("recording");
            recStartTime = new Date();
        } else {
            // stop recording
            state.status.classname = state.status.classname.filter(function (v) {
                return (v !== "recording")
            });
            recStartTime = null;
        }
        return (recStartTime !== null);
    }

    /**
     * End recording
     */
    var endRec = function () {
        state.grid.classname = ["control"];
        state.info.rec_id = "[not recording]";
    }

    /**
     * Translate the received data (the chord) into class names for the grid control
     *
     * @param data
     * @returns {khl}
     */
    var updateGrid = function (data) {
        state.grid.classname = ["control"].concat(
            data.filter(function (v) {
                return v.hasOwnProperty("note")
            }).map(function (v) {
                return ("midi" + v.note)
            })
        );
    }

    /**
     * Update the elapsed time since beginning the recordimg
     *
     * @returns {khl}
     */
    var updateTime = function () {
        var time = new Date((new Date() - recStartTime) - 3600000)
            .toTimeString()
            .replace(/.*(\d{2}:\d{2}:\d{2}).*/, "$1");
        state.info.time = time;
    }

    /**
     * Send current position to the server, receive back the calculated chord
     *
     * @returns {khl}
     */
    var updatePos = function () {
        var number = "0000" + ( parseInt(state.info.number) + 1);
        number = number.substr(number.length - 4);

        navigator.geolocation.getCurrentPosition(
            function (pos) {
                var lon = pos.coords.longitude;
                var lat = pos.coords.latitude;
                jQuery.getJSON([
                    settings.url,
                    "/recording/node?nr=", state.info.number,
                    "&rec_id=", state.info.rec_id,
                    "&lat=", lat,
                    "&lon=", lon,
                    "&callback=?"
                ].join(""))
                    .done(function (data) {
                        updateGrid(data);
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
        clockHandle: 0,
        tick: 0,
        getInitialState: function () {
            return {data: state};
        },
        // toggle handler to be passed to the status control
        toggleClock: function () {
            if (toggleRec()) {
                initRec();
                // start the clock
                this.clockHandle = setInterval(function () {
                    if (++this.tick > settings.ticks) {
                        updatePos();
                        this.tick = 0;
                    }
                    updateTime();
                    this.setState(state);
                }.bind(this), 500)
            } else {
                endRec();
                // stop the clock
                clearInterval(this.clockHandle)
            }
            this.setState(state);
        },
        render: function () {
            return (
                <div className="khlApp">
                    <StatusControl data={ this.state.data } toggleHandler= { this.toggleClock } />
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
        toggleHandler: function () {
            if (typeof this.props.toggleHandler === 'function') {
                this.props.toggleHandler(null);
            }
        },
        render: function () {
            return (
                <div id="status" className={ this.props.data.status.classname.join(" ") }>
                    <div>
                        <button id="toggle_rec" onClick={ this.toggleHandler }></button>
                    </div>
                    <StatusIndicator params={{label: "rec", id: "rec_indicator"}} />
                {/*<StatusIndicator params={{label: "send", id: "send_indicator"}} />*/}
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
                    <div className="bar">C
                        <div className="outer">
                            <div className="inner" style={{width: 100 + "%"}}></div>
                        </div>
                    </div>
                    <div className="bar">E
                        <div className="outer">
                            <div className="inner"></div>
                        </div>
                    </div>
                    <div className="bar">G
                        <div className="outer">
                            <div className="inner"></div>
                        </div>
                    </div>
                </div>
            );
        }
    });

    /**
     * Clock component, textual feedback
     */
    var InfoControl = React.createClass({
        render: function () {
            //console.log("InfoControl render", this.props.data)
            return (
                <div id="info" className="control">
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

/*
 1446585716501:/khl?nr=0001&lat=51.8861799&lon=4.4625571&callback=jQuery211049043411714956164_1446585704690&_=1446585704691
 1446585718036:/khl?nr=0002&lat=51.8861794&lon=4.462556&callback=jQuery211049043411714956164_1446585704690&_=1446585704692
 1446585724079:/khl?nr=0003&lat=51.8861794&lon=4.462556&callback=jQuery211049043411714956164_1446585704690&_=1446585704693
 1446585729267:/khl?nr=0004&lat=51.8861794&lon=4.462556&callback=jQuery211049043411714956164_1446585704690&_=1446585704694
 1446585735273:/khl?nr=0005&lat=51.8861794&lon=4.462556&callback=jQuery211049043411714956164_1446585704690&_=1446585704695
 1446585740362:/khl?nr=0006&lat=51.8861794&lon=4.462556&callback=jQuery211049043411714956164_1446585704690&_=1446585704696
 1446585746402:/khl?nr=0007&lat=51.8861794&lon=4.462556&callback=jQuery211049043411714956164_1446585704690&_=1446585704697
 1446585751317:/khl?nr=0008&lat=51.8861794&lon=4.462556&callback=jQuery211049043411714956164_1446585704690&_=1446585704698
 1446585757330:/khl?nr=0009&lat=51.8861794&lon=4.462556&callback=jQuery211049043411714956164_1446585704690&_=1446585704699
 */
