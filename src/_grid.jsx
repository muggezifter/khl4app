import React from 'react';

/**
 * Grid component, visual feedback
 */
export default class GridControl extends React.Component {
    render() {
        return (
            <div id="grid" className={ this.props.data.grid.classname.join(" ") }>
                <svg viewBox="0 0 264 128">
                    <polyline points="192,12 12,12 42,64 72,12 102,64 132,12 162,64 192,12
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
