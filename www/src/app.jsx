(function () {
    var m2n = function (m) {
        return ['c','c#','d','d#','e','f','f#','g','g#','a','a#','b'][m%12];
    }


    var khl = {
        // private
        __rec: false,
        __startTime: null,
        /**
         * Settings for the app:
         * url: the url of the khl4server
         * ticks: How many ticks between requests. 1 tick is ~ 500ms
         */
        settings: {
            url: "https://khl4.localtunnel.me",
            ticks: 10
        },
        /**
         * State for the various components
         */
        clock: {
            number: "0000",
            time: "00:00:00"
        },
        grid: {
            classname: ["control"]
        },
        status: {
            classname: ["control"]
        },
        /**
         * Stop and start recording
         * @returns {boolean}
         */
        toggleRec: function () {
            if (this.__rec === false) {
                this.status.classname.push("recording");
                this.__startTime = new Date();
                this.__rec = true;
            } else {
                this.status.classname = this.status.classname.filter(function(v){ return (v !== "recording")});
                this.__rec = false;
            }
            return this.__rec;
        },
        /**
         * Send current position to the server, receive back the calculated chord
         *
         * @returns {khl}
         */
        updatePos: function () {
            var number = "0000" + ( parseInt(this.clock.number) + 1);
            number = number.substr(number.length - 4);

            navigator.geolocation.getCurrentPosition(
                function (pos) {
                    var lon = pos.coords.longitude;
                    var lat = pos.coords.latitude;
                    jQuery.getJSON(khl.settings.url + "/recording/node?nr=" + this.clock.number + "&lat=" + lat + "&lon=" + lon + "&callback=?")
                        .done(function (data) {
                            this.updateGrid(data);
                            console.log(data);
                        }.bind(this))
                }.bind(this), function (err) {
                    console.warn('ERROR(' + err.code + '): ' + err.message);
                },{
                    enableHighAccuracy: true,
                    timeout: 5000,
                    maximumAge: 0
                });

            this.clock.number = number;
            return this;
        },
        /**
         * Update the elapsed time since beginning the recordimg
         *
         * @returns {khl}
         */
        updateTime: function () {
            var time = new Date((new Date() - this.__startTime) - 3600000)
                .toTimeString()
                .replace(/.*(\d{2}:\d{2}:\d{2}).*/, "$1");
            this.clock.time = time;
            return this;
        },
        /**
         * Getter for the state data
         *
         * @returns {{status: *, clock: *, grid: *}}
         */
        getData: function () {
            return {
                status: this.status,
                clock: this.clock,
                grid: this.grid
            }
        },
        /**
         * Translate the received data (the chord) into class names for the grid control
         *
         * @param data
         * @returns {khl}
         */
        updateGrid: function (data) {
            this.grid.classname = ["control"].concat(data.map(function (v) { return ( "midi" + v.note)}));
            return this;
        }
    };

    var KhlApp = React.createClass({
        clockId: 0,
        tick: 0,
        getInitialState: function () {
            return {data: khl.getData()};
        },
        /**
         * TODO: move this to the khl object
         */
        toggleClock: function () {
            if (khl.toggleRec()) {
                khl.updatePos();
                // start the clock
                this.clockId = setInterval(function () {
                    if (++this.tick > khl.settings.ticks) {
                        khl.updatePos();
                        this.tick = 0;
                    }
                    this.setState(khl.updateTime().getData());
                }.bind(this), 500)
            } else {
                // stop the clock
                clearInterval(this.clockId)
            }
            this.setState(khl.getData());
        },
        render: function () {
            return (
                <div className="khlApp">
                    <StatusControl data={ this.state.data } toggleHandler= { this.toggleClock } />
                    <GridControl data={ this.state.data } />
                    <ClockControl data={ this.state.data } />
                </div>
            );
        }
    });

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
                    <StatusIndicator params={{label: "send", id: "send_indicator"}} />
                </div>
            );
        }
    });


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

    var ClockControl = React.createClass({
        render: function () {
            return (
                <div id="clock" className="control">
                    <div id="number">{this.props.data.clock.number}</div>
                    <div id="time">{this.props.data.clock.time}</div>
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