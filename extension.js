/*
 This file has been developed by Albert Palacios.
 This software may be used and distributed
 according to the terms of the GNU General Public License version 2.

 This program is distributed in the hope that it will be useful, but WITHOUT
 ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 FOR A PARTICULAR PURPOSE.  See the GNU General Public License for more
 details.

 Copyright Albert Palacios
*/
const Clutter = imports.gi.Clutter;
const Gtk = imports.gi.Gtk;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Lang = imports.lang;
const Shell = imports.gi.Shell;
const St = imports.gi.St;
const Util = imports.misc.util;

const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Panel = imports.ui.panel;
const Tweener = imports.ui.tweener;
const GnomeSession = imports.misc.gnomeSession;

const guuid = 'SystemMenu'
const Gettext = imports.gettext.domain(guuid);
const _ = Gettext.gettext;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;

const ITEMS = 10;       // number of items to list
const MORE = 50;        // number of items to list under "more..."
const BLACKLIST = "";   // to blacklist (hide) spezific MIME media types



let settingsJSON,settings,settingsID;

let extension;
let list = [
{ type: "command",	text: _("About This Computer"),	action: ['gnome-control-center','info']		},
{ type: "desktop",	text: _("Software Center"),	action: 'gnome.Software.desktop'	},
{ type: "desktop",	text: _("System Preferences"),	action: 'gnome-control-center.desktop'		},


{ type: "desktop",	text: _("System Monitor"),		action: 'gnome-system-monitor.desktop'		},
{ type: "separator" },
{ type: "recent",	text: _("Recent Items"),		action: ''					},

{ type: "forceQuit",	text: _("Force Quit"),		action: ''					},
{ type: "separator" },
{ type: "powerOff",	text: _("Power Off"),		action: ''					},
{ type: "powerOff",	text: _("Restart"),		action: ''					},
{ type: "command",	text: _("Log Out"),		action: ['gnome-session-quit']			},
{ type: "command",	text: _("Lock"),			action: ['gnome-screensaver-command','-l']	},
{}
];

const extensionObject = new Lang.Class({
    Name: guuid+"."+guuid,
    Extends: PanelMenu.Button,

    _init: function() {

		this.forceQuitPtr = null;
		this.forceQuitPids = null;

		let icon = new St.Icon({ icon_name: 'emblem-default-symbolic',
					 style_class: 'system-status-icon' });
		let label = new St.Label({ text: "" });
		this.parent(0.0, label.text);
		this.actor.add_actor(icon);

		let item = null;
		for (x in list) {

			if (list[x].type=="command") {
				item = new PopupMenu.PopupMenuItem(_(list[x].text));
				item.connect('activate', Lang.bind(this,
					(function() {
						var currentAction = list[x].action;
						/* Save context variable for binding */
						return function() {
							Util.spawn(currentAction);
						}
					})()
				));
				this.menu.addMenuItem(item);
			};



    /*  if (list[x].type=="recent") {
        item = new PopupMenu.PopupSubMenuMenuItem(_(list[x].text));

        item.connect('activate', Lang.bind(this, function RecentItems()
        {
          this._init.apply(this, arguments);
        }

        RecentItems.prototype =
        {
            __proto__: PanelMenu.Button.prototype,

            _init: function()
            {
                PanelMenu.Button.prototype._init.call(this, 0.0);
                this.connect('destroy', Lang.bind(this, this._onDestroy));
                this._iconActor = new St.Icon({ icon_name: 'document-open-recent-symbolic',
                                                style_class: 'system-status-icon' });
                this.actor.add_actor(this._iconActor);
                this.actor.add_style_class_name('panel-status-button');

                this.RecentManager = new Gtk.RecentManager();
                this._display();

                this.conhandler = this.RecentManager.connect('changed', Lang.bind(this, this._redisplay));

                Main.panel.addToStatusArea('recent-items', this);
            },

            _onDestroy: function() {
                this.RecentManager.disconnect(this.conhandler);
            },

           _display: function()
           {

                let items = this.RecentManager.get_items();
                let modlist = new Array();
                let countItem = items.length;

                for (let i = 0; i < countItem; i++)
                {
                  modlist[i] = new Array(2);
                  modlist[i][0] = items[i].get_modified();
                  modlist[i][1] = i;
                }

                modlist.sort(sortfunc);

                let id = 0;
                let idshow = 0;
                let blacklistString = BLACKLIST.replace(/\s/g, "");
                let blacklistList = blacklistString.split(",");

                while (idshow < ITEMS && id < countItem)
                {   let itemtype = items[modlist[id][1]].get_mime_type();
                    if (blacklistList.indexOf((itemtype.split("/"))[0]) == -1)
                    {
                        let gicon = Gio.content_type_get_icon(itemtype);
                        let menuItem = new MyPopupMenuItem(gicon, items[modlist[id][1]].get_display_name(), {});
                        this.menu.addMenuItem(menuItem);
                        menuItem.connect('activate', Lang.bind(this, this._launchFile, items[modlist[id][1]].get_uri()));
                        idshow++;
                    }
                    id++;
                }

                if (id < countItem && MORE > 0)
                {
                    this.moreItem = new PopupMenu.PopupSubMenuMenuItem(_("More..."));
                    this.menu.addMenuItem(this.moreItem);
                    while (idshow < ITEMS+MORE && id < countItem)
                    {
                        let itemtype = items[modlist[id][1]].get_mime_type();
                        if (blacklistList.indexOf((itemtype.split("/"))[0]) == -1)
                        {
                            let gicon = Gio.content_type_get_icon(itemtype);
                            let menuItem = new MyPopupMenuItem(gicon, items[modlist[id][1]].get_display_name(), {});
                            this.moreItem.menu.addMenuItem(menuItem);
                            menuItem.connect('activate', Lang.bind(this, this._launchFile, items[modlist[id][1]].get_uri()));
                            idshow++;
                        }
                        id++;
                    }
                }

                if (countItem > 0)
                {
                    this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
                    let menuItem = new MyPopupMenuItem(false, 'Clear list', {});
                    this.menu.addMenuItem(menuItem);
                    menuItem.connect('activate', Lang.bind(this, this._clearAll));
                }
            },
            _redisplay: function()
            {
                this.menu.removeAll();
                this._display();
            },
            _launchFile: function(a, b, c)
            {
                Gio.app_info_launch_default_for_uri(c, global.create_app_launch_context(0, -1));
            },
            _clearAll: function()
            {
                let GtkRecent = new Gtk.RecentManager();
                GtkRecent.purge_items();
            },
        })()
        ));
        this.menu.addMenuItem(item);
      };
*/





//PopupMenu.PopupSubMenuMenuItem(section.name);





			if (list[x].type=="desktop") {
				var action = list[x].action;
				if (list[x].text=="Software Center") {
					if (settings.software!="") {
						action = settings.software;
					}
				}

				item = new PopupMenu.PopupMenuItem(_(list[x].text));
				item.connect('activate', Lang.bind(this,
					(function() {
						var currentAction = action;
						/* Save context variable for binding */
						return function() {
							let def = Shell.AppSystem.get_default();
							let app = def.lookup_app(currentAction);
							app.activate();
						}
					})()
				));
				this.menu.addMenuItem(item);
			};

			if (list[x].type=="separator") {
				this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
			};

			if (list[x].type=="forceQuit") {
				this.forceQuitPtr = new PopupMenu.PopupMenuItem(_(list[x].text)+" ...");
				this.forceQuitPtr.connect('activate', Lang.bind(this, function() {
				if (this.forceQuitPids!=null) {
					for (pid in this.forceQuitPids) {
						if (this.forceQuitPids[pid]!=0) {
						Util.spawn(['kill','-9',''+this.forceQuitPids[pid]]);
						};
					};
				};
				} ));
				this.menu.addMenuItem(this.forceQuitPtr);
			};

			if (list[x].type=="powerOff") {

				item = new PopupMenu.PopupMenuItem(_(list[x].text));
				item.connect('activate', Lang.bind(this, function() {
					let _Session = new GnomeSession.SessionManager();
					_Session.ShutdownRemote();
				} ));
				this.menu.addMenuItem(item);
			};
		};

		this.actor.connect('button-press-event', Lang.bind(this, this._updateForceQuit));

		// Remove or show "status/user" menu items
		let statusMenuItems = Main.panel.statusArea.aggregateMenu.menu._getMenuItems();

		for (var x=(statusMenuItems.length-1); x>=0;x--) {

			if (statusMenuItems[x].label!=undefined) {

				var excludes = ["System Settings","Lock","Log Out","Suspend","Switch User","Power Off","Install Updates"];
				var label = statusMenuItems[x].label.get_text();

				if (excludes.indexOf(label)>-1) {

					if (settings.remove) {

						if (label=="Power Off"||label=="Log Out") {

							statusMenuItems[x].destroy();
							// actor.hide() does not work! What can I do instead of 'destroy()'?

						} else {

							statusMenuItems[x].actor.hide();
						}
					} else {

						statusMenuItems[x].actor.show();
					}
				}
			}
		}
	},

	destroy: function() {
		this.parent();
	},

	_updateForceQuit: function() {

		let appSys = Shell.AppSystem.get_default();
		let allApps = appSys.get_running();
		if ( allApps.length != 0 && this.forceQuitPtr!=null) {
			this.forceQuitPids= allApps[0].get_pids();
			this.forceQuitPtr.label.text = _("Force Quit")+" "+allApps[0].get_name();
			this.forceQuitPtr.actor.visible = true;
		} else {
			this.forceQuitPids= null;
			this.forceQuitPtr.label.text = _("Force Quit")+" ...";
			this.forceQuitPtr.actor.visible = false;
		}
	}
});

function onSettingsChanged() {

	settingsJSON = Convenience.getSettings();
	settings = JSON.parse(settingsJSON.get_string("settings-json"));

	extension.destroy();
	extension = new extensionObject();
	Main.panel.addToStatusArea(guuid, extension, settings.position, settings.area);
}

function init(metadata) {
	Convenience.initTranslations(guuid);
	settingsJSON = Convenience.getSettings();
}

function enable() {

	settings = JSON.parse(settingsJSON.get_string("settings-json"));
	settingsID = settingsJSON.connect("changed::settings-json", Lang.bind(this,onSettingsChanged));

	extension = new extensionObject();
	Main.panel.addToStatusArea(guuid, extension, settings.position, settings.area);
}

function disable() {
	settingsJSON.disconnect(settingsID);
	extension.destroy();
}
