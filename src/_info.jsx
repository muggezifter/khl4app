import React from 'react';

/**
 * Info component, textual feedback
 */
export default class InfoControl extends React.Component {
    render() {
        return (
            <div id="info" className="control dark">
                <table>
                    <tbody>
                        <tr>
                            <td>grid:</td>
                            <td>{this.props.data.grid.label}</td>
                        </tr>
                        <tr>
                               <td>id:</td>
                            <td>{this.props.data.info.rec_id}</td>
                        </tr>
                        <tr>
                            <td>#{this.props.data.info.number}</td>
                            <td>{this.props.data.info.time}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        );
    }
}
