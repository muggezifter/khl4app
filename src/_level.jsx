import React from 'react';


/**
 * Show the levels of the chord
 */
export default class LevelControl extends  React.Component {
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
