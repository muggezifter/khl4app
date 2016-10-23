import React from 'react';

/**
 * Info component, textual feedback
 */
export default class InfoControl extends React.Component {
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
