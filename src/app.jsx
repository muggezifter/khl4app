import InfoControl from './_info.jsx';
import GridControl from './_grid.jsx';
import LevelControl from './_level.jsx';
import SettingsControl from './_settings.jsx';
import StatusControl from './_status.jsx';
import ReactDOM from 'react-dom';
import React from 'react';

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


ReactDOM.render(
    <KhlApp />,
    document.getElementById('container')
);


