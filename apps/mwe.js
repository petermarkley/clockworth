#!/usr/bin/gjs

imports.gi.versions.Gtk = '3.0';
const Gtk = imports.gi.Gtk;
const GObject = imports.gi.GObject;

class mwe {
	constructor() {
		this.application = new Gtk.Application();
		this.application.connect('activate', this._onActivate.bind(this));
		this.application.connect('startup', this._onStartup.bind(this));
	}
	_onActivate() {
		this._window.present();
	}
	_onStartup() {
		this._buildUI();
	}
	
	_buildUI() {
		this._window = new Gtk.ApplicationWindow  ({
			application: this.application,
			title: "Minimum Working Example",
			default_width: 600,
			default_height: 400,
			border_width: 20,
			window_position: Gtk.WindowPosition.CENTER });
		
		//initialize model
		this._model = new Gtk.TreeStore();
		this._model.set_column_types ([
			GObject.TYPE_BOOLEAN,
			GObject.TYPE_INT,
			GObject.TYPE_STRING ]);
		let iter = this._model.append(null);
		this._model.set(iter,[0,1,2],[true,42,"lions"]);
		iter = this._model.append(null);
		this._model.set(iter,[0,1,2],[true,84,"tigers"]);
		iter = this._model.append(null);
		this._model.set(iter,[0,1,2],[false,39,"penguins"]);
		iter = this._model.append(null);
		this._model.set(iter,[0,1,2],[true,168,"bears"]);
		
		//set up filtered display
		let filter = this._model.filter_new(null);
		filter.set_visible_func(function (model,iter) {
			let v = model.get_value(iter,0);
			let i = model.get_value(iter,1);
			let r = false;
			if (i == 39){//(!v && (i == 39)) {
				r = true;
			}
			log("v: "+v+",  i: "+i+", r: "+r);
			return r;
		});
		this._view = new Gtk.TreeView({
			expand: true,
			model: filter,
			enable_grid_lines: false,
			enable_tree_lines: false,
			headers_visible: false,
			level_indentation: 0 });
		let col = new Gtk.TreeViewColumn({
			title: "Animal",
			expand: true });
		let cell = new Gtk.CellRendererText();
		col.pack_start(cell,true);
		col.add_attribute(cell,"text",2);
		this._view.insert_column(col,0);
		this._view.expand_all();
		this._view.set_show_expanders(false);
		
		this._window.add (this._view);
		this._window.show_all();
	}
	
};

let app = new mwe ();
app.application.run (ARGV);

