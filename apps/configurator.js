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
	
	_buildUI_tree(data, model, parent, depth) {
		if (depth > MAX_RECURSION_DEPTH) {
			log("reached max recursion depth");
			this.application.quit();
			return false;
		}
		let iter = null;
		switch (data.type) {
			case "group":
				iter = model.append(parent);
				model.set(iter,[0,1],["(Group) "+data.label,data.enable]);
				for (let i=0; i < data.members.length; i++) {
					if (!this._buildUI_tree(data.members[i],model,iter,depth+1))
						return false;
				}
			break;
			case "event":
				iter = model.append(parent);
				model.set(iter,[0,1],[data.label,data.enable]);
			break;
		}
		return true;
	}
	
	_buildUI_seq(data, model, slots, path, depth) {
		if (depth > MAX_RECURSION_DEPTH) {
			log("reached max recursion depth");
			this.application.quit();
			return false;
		}
		let label = (path.length>0?path+" \u2192 "+data.label:data.label);
		if (data.enable) {
			switch (data.type) {
				case "group":
					for (let i=0; i < data.members.length; i++) {
						if (!this._buildUI_seq(data.members[i],model,slots,label,depth+1))
							return false;
					}
				break;
				case "event":
					let iter = model.append(slots[data.sequence]);
					model.set(iter,[0],[label]);
				break;
			}
		}
		return true;
	}
	
	// Build the application's UI
	_buildUI() {
		// Create the application window
		this._window = new Gtk.ApplicationWindow  ({
			application: this.application,
			title: "Clockworth Configurator",
			default_width: 1200,
			default_height: 800,
			border_width: 20,
			window_position: Gtk.WindowPosition.CENTER });
		
		this._grid = new Gtk.Grid ({row_spacing: 20});
		this._image = new Gtk.Image ({
			file: GLib.get_current_dir() + '/img/clockworth-photo-alpha-300px.png',
			hexpand: true });
		this._grid.attach (this._image, 0, 0, 2, 1);
		
		//tree model
		this._tree = new Gtk.TreeStore();
		this._tree.set_column_types ([
            GObject.TYPE_STRING,
            GObject.TYPE_BOOLEAN]);
		for (let i=0; i < this.conf.events.length; i++) {
			this._buildUI_tree(this.conf.events[i],this._tree,null,0);
		}
		
		//tree view
		this._treeView = new Gtk.TreeView ({
			expand: false,
			model: this._tree,
			enable_grid_lines: true,
			enable_tree_lines: true });
		let col1 = new Gtk.TreeViewColumn({
			title: "Event",
			expand: true });
		let col2 = new Gtk.TreeViewColumn({
			title: "Enable" });
		let txt  = new Gtk.CellRendererText();
		let tgl  = new Gtk.CellRendererToggle();
		col1.pack_start(txt,true);
		col2.pack_start(tgl,true);
		col1.add_attribute(txt,"text",0);
		col2.add_attribute(tgl,"active",1);
		this._treeView.insert_column(col1,0);
		this._treeView.insert_column(col2,1);
		this._treeView.expand_all();
		this._tscroll = new Gtk.ScrolledWindow({
			min_content_height: 300,
			margin_right: 10 });
		this._tscroll.add(this._treeView);
		this._grid.attach (this._tscroll, 0, 1, 1, 1);
		
		//sequence model
		this._seq = new Gtk.TreeStore();
		this._seq.set_column_types ([ GObject.TYPE_STRING ]);
		let seqSlots = new Array();
		for (let i=1; i<=10; i++) {
			seqSlots[i] = this._seq.append(null);
			this._seq.set(seqSlots[i],[0],["Slot "+i+":"]);
		}
		for (let i=0; i < this.conf.events.length; i++) {
			this._buildUI_seq(this.conf.events[i],this._seq,seqSlots,"",0);
		}
		
		//sequence view
		this._seqView = new Gtk.TreeView ({
			expand: false,
			model: this._seq,
			enable_grid_lines: false,
			enable_tree_lines: false,
			headers_visible: false,
			level_indentation: 30 });
		let col3 = new Gtk.TreeViewColumn({
			title: "Event",
			expand: true });
		let slot = new Gtk.CellRendererText();
		col3.pack_start(slot,true);
		col3.add_attribute(slot,"text",0);
		this._seqView.insert_column(col3,0);
		this._seqView.expand_all();
		this._seqView.set_show_expanders(false);
		this._sscroll = new Gtk.ScrolledWindow({
			min_content_height: 300,
			margin_left: 10 });
		this._sscroll.add(this._seqView);
		this._grid.attach (this._sscroll, 1, 1, 1, 1);
		
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

