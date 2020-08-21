#!/usr/bin/gjs

imports.gi.versions.Gtk = '3.0';
const Gtk = imports.gi.Gtk;
const GLib = imports.gi.GLib;
const ByteArray = imports.byteArray;
const GObject = imports.gi.GObject;
const Pango = imports.gi.Pango;

const MAX_RECURSION_DEPTH = 100;
/* we are hard-coding for light-mode colors, because
   apparently there's no color-agnostic way in the
   whole universe to change opacity of individual
   TreeView cells */
const TEXT_R = 0.0;
const TEXT_G = 0.0;
const TEXT_B = 0.0;

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
	
	_buildUI_tree(data, model, parent, path, depth) {
		if (depth > MAX_RECURSION_DEPTH) {
			log("reached max recursion depth");
			this.application.quit();
			return false;
		}
		let iter = null;
		let label = (path.length>0?path+" \u2192 "+data.label:data.label);
		let viable = true;
		if (parent) viable = model.get_value(parent,2) && model.get_value(parent,3);
		switch (data.type) {
			case "group":
				iter = model.append(parent);
				model.set(iter,[0,1,2,3,4,5],[true,data.label,data.enable,viable,0,label]);
				for (let i=0; i < data.members.length; i++) {
					if (!this._buildUI_tree(data.members[i],model,iter,label,depth+1))
						return false;
				}
			break;
			case "event":
				iter = model.append(parent);
				model.set(iter,[0,1,2,3,4,5],[false,data.label,data.enable,viable,data.sequence,label]);
			break;
		}
		return true;
	}
	
	/*_buildUI_seq(data, model, slots, path, depth) {
		if (depth > MAX_RECURSION_DEPTH) {
			log("reached max recursion depth");
			this.application.quit();
			return false;
		}
		let label = (path.length>0?path+" \u2192 "+data.label:data.label);
		let viable = true;
		switch (data.type) {
			case "group":
				for (let i=0; i < data.members.length; i++) {
					if (!this._buildUI_seq(data.members[i],model,slots,label,depth+1))
						return false;
				}
			break;
			case "event":
				let iter = model.append(slots[data.sequence]);
				model.set(iter,[0,1,2],[label,data.enable,viable]);
			break;
		}
		return true;
	}*/
	
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
		this._css   = new Gtk.CssProvider();
		this._css.load_from_data(
			".pane_header {font-size: 1.2em;} "+
			".cell_grey {opacity: 0.5;}");
		let style = null;
		
		this._grid = new Gtk.Grid ({
			row_spacing: 20,
			hexpand: true });
		this._image = new Gtk.Image ({ file: GLib.get_current_dir() + '/img/clockworth-photo-alpha-300px.png' });
		this._grid.attach (this._image, 0, 0, 2, 1);
		
		//tree grid
		this._treeGrid = new Gtk.Grid({
			row_spacing: 10,
			hexpand: true });
		this._treeLabel = new Gtk.Label({label: "Chime Events"});
		style = this._treeLabel.get_style_context();
		style.add_class("pane_header");
		style.add_provider(this._css,Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION);
		this._treeGrid.attach (this._treeLabel, 0, 0, 1, 1);
		this._grid.attach (this._treeGrid, 0, 1, 1, 1);
		
		//tree model
		this._tree = new Gtk.TreeStore();
		this._tree.set_column_types ([
			GObject.TYPE_BOOLEAN,   //is a group?
            GObject.TYPE_STRING,    //label
            GObject.TYPE_BOOLEAN,   //enable?
            GObject.TYPE_BOOLEAN,   //viable?
            GObject.TYPE_INT,       //sequence slot
            GObject.TYPE_STRING ]); //path
		for (let i=0; i < this.conf.events.length; i++) {
			this._buildUI_tree(this.conf.events[i],this._tree,null,"",0);
		}
		
		//tree view
		this._treeView = new Gtk.TreeView ({
			hexpand: true,
			model: this._tree,
			enable_grid_lines: true,
			enable_tree_lines: true,
			headers_visible: false });
		let col1 = new Gtk.TreeViewColumn({ expand: true });
		//let grp  = new Gtk.CellRendererText({ editable: false });
		let tgl  = new Gtk.CellRendererToggle({ activatable: true });
		let txt  = new Gtk.CellRendererText({ editable: true });
		col1.pack_start(tgl,false);
		//col1.pack_start(grp,false);
		col1.pack_start(txt,true);
		col1.set_cell_data_func(tgl, function (col,cell,model,iter) {
			cell.active = model.get_value(iter,2);
			if (model.get_value(iter,3)) {
				cell.foreground = "rgba("+TEXT_R+","+TEXT_G+","+TEXT_B+",1)";
			} else {
				cell.foreground = "rgba("+TEXT_R+","+TEXT_G+","+TEXT_B+",0.3)";
			}
		});
		/*col1.set_cell_data_func(grp, function (col,cell,model,iter) {
			if (model.get_value(iter,0)) {
				cell.text = "(Group) ";
				cell.weight = Pango.Weight.BOLD;
				cell.visible = true;
			} else {
				cell.text = "";
				cell.weight = Pango.Weight.NORMAL;
				cell.visible = false;
			}
			if (model.get_value(iter,2) && model.get_value(iter,3)) {
				cell.foreground = "rgba("+TEXT_R+","+TEXT_G+","+TEXT_B+",1)";
			} else {
				cell.foreground = "rgba("+TEXT_R+","+TEXT_G+","+TEXT_B+",0.3)";
			}
		});*/
		col1.set_cell_data_func(txt, function (col,cell,model,iter) {
			cell.text = model.get_value(iter,1);
			if (model.get_value(iter,0)) {
				cell.weight = Pango.Weight.BOLD;
			} else {
				cell.weight = Pango.Weight.NORMAL;
			}
			if (model.get_value(iter,2) && model.get_value(iter,3)) {
				cell.foreground = "rgba("+TEXT_R+","+TEXT_G+","+TEXT_B+",1)";
			} else {
				cell.foreground = "rgba("+TEXT_R+","+TEXT_G+","+TEXT_B+",0.3)";
			}
		});
		this._treeView.insert_column(col1,0);
		this._treeView.expand_all();
		this._tscroll = new Gtk.ScrolledWindow({
			min_content_height: 300,
			margin_right: 10 });
		this._tscroll.add(this._treeView);
		this._treeGrid.attach (this._tscroll, 0, 1, 1, 1);
		
		//sequence grid
		this._seqGrid = new Gtk.Grid({
			row_spacing: 10,
			hexpand: true });
		this._seqLine = new Gtk.Grid({
			column_spacing: 10,
			halign: Gtk.Align.CENTER });
		style = this._seqLine.get_style_context();
		style.add_class("pane_header");
		style.add_provider(this._css,Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION);
		this._seqInfo = new Gtk.Image ({
			stock: 'gtk-info',
			tooltip_text: "Procedure in case two or more chime events \u201ccollide,\u201d i.e. match on the same minute.\n\nEach minute that the chime script executes, all ten slots are computed in sequence. During this time, only the last match from each slot will be played.\n\nOr, put another way:\n\nIf two matching events share a slot, the latter will replace the other. Otherwise, if they occupy different slots, they will both play in order." });
		this._seqLabel = new Gtk.Label({label: "Collision Sequence"});
		this._seqLine.attach (this._seqLabel, 0, 0, 1, 1);
		this._seqLine.attach (this._seqInfo, 1, 0, 1, 1);
		this._seqGrid.attach (this._seqLine, 0, 0, 1, 1);
		this._grid.attach (this._seqGrid, 1, 1, 1, 1);
		this._sscroll = new Gtk.ScrolledWindow({ 
			min_content_height: 300,
			margin_left: 10 });
		this._slots = new Gtk.Grid({ 
			row_spacing: 10,
			hexpand: true });
		this._sscroll.add(this._slots);
		this._seqGrid.attach (this._sscroll, 0, 1, 1, 1);
		
		//sequence view
		for (let i=1; i<=10; i++) {
			let div = new Gtk.Grid({
				row_spacing: 2 });
			this._slots.attach (div, 0, i-1, 1, 1);
			let label = new Gtk.Label({
				label: "Slot "+i,
				halign: Gtk.Align.START,
				expand: false });
			div.attach (label, 0, 0, 1, 1);
			let filter = this._tree.filter_new(null);
			filter.set_modify_func([
				GObject.TYPE_BOOLEAN,  //visible?
				GObject.TYPE_STRING,   //label
				GObject.TYPE_STRING,   //path
				GObject.TYPE_INT,      //sequence slot
				GObject.TYPE_BOOLEAN,  //enable?
				GObject.TYPE_BOOLEAN], //viable?
			function (f_model,f_iter,col) {
				let iter = f_model.convert_iter_to_child_iter(f_iter);
				let model = f_model.get_model();
				let value = new GObject.Value();
				switch (col) {
					case 0:
						value.init(GObject.TYPE_BOOLEAN);
						value.set_boolean(!model.get_value(iter,0) && model.get_value(iter,4) == i);
					break;
					case 1:
						value.init(GObject.TYPE_STRING);
						value.set_string(model.get_value(iter,1));
					break;
					case 2:
						value.init(GObject.TYPE_STRING);
						value.set_string(model.get_value(iter,5));
					break;
					case 3:
						value.init(GObject.TYPE_INT);
						value.set_int(model.get_value(iter,4));
					break;
					case 4:
						value.init(GObject.TYPE_BOOLEAN);
						value.set_boolean(model.get_value(iter,2));
					break;
					case 5:
						value.init(GObject.TYPE_BOOLEAN);
						value.set_boolean(model.get_value(iter,3));
					break;
				}
				return value;
			});
			/*filter.set_visible_func(function (f_model,f_iter) {
				iter = f_model.convert_iter_to_child_iter(f_iter);
				model = f_model.get_model();
				if (!model.get_value(iter,0) && model.get_value(iter,4) == i) {
					return true;
				} else {
					return false;
				}
			});*/
			filter.set_visible_column(0);
			let view = new Gtk.TreeView({
				hexpand: true,
				model: filter,
				enable_grid_lines: false,
				enable_tree_lines: false,
				headers_visible: false,
				level_indentation: 0 });
			let col = new Gtk.TreeViewColumn({
				title: "Event",
				expand: true });
			let cell = new Gtk.CellRendererText();
			col.pack_start(cell,true);
			col.set_cell_data_func(cell, function (col,cell,model,iter) {
				/*if (!model.get_value(iter,0) && model.get_value(iter,4) == i) {
					cell.text = model.get_value(iter,5);
					cell.visible = true;
					cell.margin_left = 30;
				} else {
					cell.text = "";
					cell.visible = false;
				}*/
				cell.text = "hello, world";
			});
			//col.add_attribute(cell,"text",2);
			view.insert_column(col,0);
			view.expand_all();
			view.set_show_expanders(false);
			div.attach (view, 0, 1, 1, 1);
		}
		
		//sequence model
		/*this._seq = new Gtk.TreeStore();
		this._seq.set_column_types ([
			GObject.TYPE_STRING,
			GObject.TYPE_BOOLEAN,
			GObject.TYPE_BOOLEAN ]);
		let seqSlots = new Array();
		for (let i=1; i<=10; i++) {
			seqSlots[i] = this._seq.append(null);
			this._seq.set(seqSlots[i],[0,1,2],["Slot "+i+":",true,true]);
		}
		for (let i=0; i < this.conf.events.length; i++) {
			this._buildUI_seq(this.conf.events[i],this._seq,seqSlots,"",0);
		}*/
		
		//sequence view
		/*this._seqView = new Gtk.TreeView ({
			hexpand: true,
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
		col3.set_cell_data_func(slot, function (col,cell,model,iter) {
			cell.text = model.get_value(iter,0);
		});
		this._seqView.insert_column(col3,0);
		this._seqView.expand_all();
		this._seqView.set_show_expanders(false);
		this._sscroll = new Gtk.ScrolledWindow({
			min_content_height: 300,
			margin_left: 10 });
		this._sscroll.add(this._seqView);
		this._seqGrid.attach (this._sscroll, 0, 1, 1, 1);*/
		
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

