#!/usr/bin/gjs

imports.gi.versions.Gtk = '3.0';
const Gtk = imports.gi.Gtk;
const GLib = imports.gi.GLib;
const ByteArray = imports.byteArray;

class cwconf {
	// Create the application itself
	constructor() {
		this.application = new Gtk.Application();
		
		// Connect 'activate' and 'startup' signals to the callback functions
		this.application.connect('activate', this._onActivate.bind(this));
		this.application.connect('startup', this._onStartup.bind(this));
	}

	// Callback function for 'activate' signal presents windows when active
	_onActivate() {
		this._window.present();
	}

	// Callback function for 'startup' signal builds the UI
	_onStartup() {
		this.loadDefault();
		this._buildUI();
	}
	
	_buildUI_node(d, depth) {
		switch (d.type) {
			case "group":
				let expander = new Gtk.Expander ({ label: d.label });
				let contents = new Gtk.Grid ({row_spacing: 20, margin_left: 30, margin_top: 20});
				let i;
				for (i=0; i < d.members.length; i++) {
					contents.attach(this._buildUI_node(d.members[i],depth+1),0,i,1,1);
				}
				expander.add(contents);
				return expander;
			break;
			case "event":
				let label = new Gtk.Label ({ label: d.label });
				return label;
			break;
		}
	}
	
	// Build the application's UI
	_buildUI() {
		// Create the application window
		this._window = new Gtk.ApplicationWindow  ({
			application: this.application,
			title: "Clockworth Configurator",
			default_height: 200,
			default_width: 400,
			border_width: 20,
			window_position: Gtk.WindowPosition.CENTER });
		
		this._image = new Gtk.Image ({
			file: GLib.get_current_dir() + '/img/clockworth-photo-alpha-300px.png',
			hexpand: true });
		//this._label = new Gtk.Label ({ label: this.conf.location });
		//this._expander = new Gtk.Expander ({ label: "Location" });
		this._grid = new Gtk.Grid ({row_spacing: 20});
		
		//this._expander.add(this._label);
		
		//this._grid.attach (this._image, 0, 0, 1, 1);
		//this._grid.attach (this._expander, 0, 1, 1, 1);
		let i;
		for (i=0; i < this.conf.events.length; i++) {
			this._grid.attach (this._buildUI_node(this.conf.events[i],0), 0,i+1,1,1);
		}
		
		this._window.add (this._grid);
		this._window.show_all();
	}
	
	loadDefault() {
		// get the contents of the json
		let [ok, contents] = GLib.file_get_contents('/home/peter/projects/audio/clockworth/system/config.json');
		if (ok) {
			this.conf = JSON.parse(ByteArray.toString(contents));
		}
	}
};

// Run the application
let app = new cwconf ();
app.application.run (ARGV);

