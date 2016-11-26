/*
 This file has been developed by Tristan Jones.
 This software may be used and distributed
 according to the terms of the GNU General Public License version 2.

 This program is distributed in the hope that it will be useful, but WITHOUT
 ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 FOR A PARTICULAR PURPOSE.  See the GNU General Public License for more
 details.

 Copyright Tristan Jones
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

{}
];

const extensionObject = new Lang.Class({
    Name: guuid+"."+guuid,
    Extends: PanelMenu.Button,

    _init: function() {

		this.forceQuitPtr = null;
		this.forceQuitPids = null;

		let icon = new St.Icon({ icon_name: 'apple-icon',
					 style_class: 'apple-icon' });
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




      if (list[x].type=="recent") {
        let bob = new PopupMenu.PopupSubMenuMenuItem(_(list[x].text));
        this.menu.addMenuItem(bob);


        let RecentManager = new Gtk.RecentManager();
        let items = RecentManager.get_items();
        let modlist = new Array();
        let countItem = items.length;


        for (let i = 0; i < countItem; i++)
        {
          modlist[i] = new Array(2);
          modlist[i][0] = items[i].get_modified();
          modlist[i][1] = i;
        }


        function joe()
        {
            Gio.app_info_launch_default_for_uri(c, global.create_app_launch_context(0, -1));
        }

        function sortfunc(x,y)
        {
          return y[0] - x[0];
        }
        modlist.sort(sortfunc);


        function MyPopupMenuItem()
        {
          this._init.apply(this, arguments);
        }


        MyPopupMenuItem.prototype =
        {
            __proto__: PopupMenu.PopupBaseMenuItem.prototype,

            _init: function(gicon, text, params)
            {
                PopupMenu.PopupBaseMenuItem.prototype._init.call(this, params);

                this.box = new St.BoxLayout({ style_class: 'popup-combobox-item' });

                if (gicon)
                  this.icon = new St.Icon({ gicon: gicon, style_class: 'popup-menu-icon' });
                else
                  this.icon = new St.Icon({ icon_name: 'edit-clear-symbolic', icon_size: 22 });

                this.box.add(this.icon);
                this.label = new St.Label({ text: text });
                this.box.add(this.label);
                this.actor.add(this.box);
            }
        }


        let id = 0;
        let idshow = 0;
        let blacklistString = BLACKLIST.replace(/\s/g, "");
        let blacklistList = blacklistString.split(",");


        while (idshow < ITEMS && id < countItem)
        {   let itemtype = items[modlist[id][1]].get_mime_type();
            if (blacklistList.indexOf((itemtype.split("/"))[0]) == -1)
            {
                let gicon = Gio.content_type_get_icon(itemtype);
                let jill = new MyPopupMenuItem(gicon, items[modlist[id][1]].get_display_name(), {});
                bob.menu.addMenuItem(jill);
                jill.connect('activate', Lang.bind(this,

                  function joe(a, b, c)
                {
                    Gio.app_info_launch_default_for_uri(c, global.create_app_launch_context(0, -1));
                }

                , items[modlist[id][1]].get_uri()));
                idshow++;
            }
            id++;
        }

      };

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

