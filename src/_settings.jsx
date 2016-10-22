import React from 'react';

export default class SettingsControl extends React.Component {
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