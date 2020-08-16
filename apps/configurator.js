#!/usr/bin/gjs

imports.gi.versions.Gtk = '3.0';
const Gtk = imports.gi.Gtk;
const GLib = imports.gi.GLib;
const ByteArray = imports.byteArray;
const GObject = imports.gi.GObject;
const Pango = imports.gi.Pango;

const MAX_RECURSION_DEPTH = 100;

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
	
	_buildUI_node(data, model, parent, depth) {
		if (depth > MAX_RECURSION_DEPTH) {
			log("reached max recursion depth");
			this.application.quit();
			return false;
		}
		let iter = null;
		switch (data.type) {
			case "group":
				iter = model.append(parent);
				model.set(iter,[0,1],[data.enable,"(Group) "+data.label]);
				for (let i=0; i < data.members.length; i++) {
					if (!this._buildUI_node(data.members[i],model,iter,depth+1))
						return false;
				}
			break;
			case "event":
				iter = model.append(parent);
				model.set(iter,[0,1],[data.enable,data.label]);
			break;
		}
		return true;
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
		
		this._grid = new Gtk.Grid ({row_spacing: 20});
		this._image = new Gtk.Image ({
			file: GLib.get_current_dir() + '/img/clockworth-photo-alpha-300px.png',
			hexpand: true });
		this._grid.attach (this._image, 0, 0, 1, 1);
		
		//model
		this._tree = new Gtk.TreeStore();
		this._tree.set_column_types ([
            GObject.TYPE_BOOLEAN,
            GObject.TYPE_STRING]);
		for (let i=0; i < this.conf.events.length; i++) {
			this._buildUI_node(this.conf.events[i],this._tree,null,0);
		}
		
		//view
		this._view = new Gtk.TreeView ({
			expand: true,
			model: this._tree });
		let col1 = new Gtk.TreeViewColumn({ title: "Enable" });
		let col2 = new Gtk.TreeViewColumn({ title: "Event" });
		let tgl  = new Gtk.CellRendererToggle();
		let txt  = new Gtk.CellRendererText();
		col1.pack_start(tgl,true);
		col2.pack_start(txt,true);
		col1.add_attribute(tgl,"active",0);
		col2.add_attribute(txt,"text",1);
		this._view.insert_column(col1,0);
		this._view.insert_column(col2,1);
		this._grid.attach (this._view, 0, 1, 1, 1);
		
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

