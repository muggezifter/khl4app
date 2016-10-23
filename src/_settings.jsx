import React from 'react';

/**
 * Settings component
 */
export default class SettingsControl extends React.Component {
    render() {
        return (
            <div id="settings" className={ this.props.data.settings.classname.join(" ") }>
               <UrlInputControl data={ this.props.data } changeUrlHandler={ this.props.changeUrlHandler } />
               <GridSelectControl data={ this.props.data } changeGridHandler={ this.props.changeGridHandler } />
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

class GridSelectControl extends React.Component {
    render() {
        return (
            <select id="grid_id" value={ this.props.data.grid.id } onChange={ this.props.changeGridHandler }>
                <option value="">choose a grid...</option>
                {this.props.data.grids.map(
                    (grid,i) => 
                        <GridOptionControl
                            key= { i }
                            value = { grid. id }
                            label = { grid.label } />
                )}
            </select>
        ); 
    }
}

class GridOptionControl extends React.Component {
    render() {
        return (
            <option value={ this.props.value }>{ this.props.label }</option>
        );
    }

}