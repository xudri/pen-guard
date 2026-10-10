/*
 * Pen Guard
 * Stops S Pen strokes from triggering Obsidian's swipe gestures
 * (sidebar drawers, pull-down command palette) on Android tablets.
 *
 * How it works: pointer events carry the input type ("pen"), touch events
 * don't. Pointer events fire first, so we remember when a pen is active and
 * then swallow the touch events Obsidian's gesture code listens to.
 */
const { Plugin, PluginSettingTab, Setting } = require('obsidian');

const DEFAULT_SETTINGS = {
  enabled: true,
  edgeGuard: false,   // palm rejection near the screen edges while the pen is active
  edgeWidth: 40,      // px from the left/right edge
  penWindowMs: 2000,  // how long after the last pen activity edge guard stays armed
};

module.exports = class PenGuard extends Plugin {
  async onload() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    this.addSettingTab(new PenGuardSettingTab(this.app, this));

    let penDown = false;
    let lastPen = 0;
    const blockedIds = new Set(); // touch identifiers we are swallowing

    const markPen = (e) => {
      if (e.pointerType === 'pen') lastPen = Date.now();
    };

    // Pen hovering or moving keeps "pen active" fresh (used by edge guard)
    this.registerDomEvent(window, 'pointerover', markPen, true);
    this.registerDomEvent(window, 'pointermove', markPen, true);

    this.registerDomEvent(window, 'pointerdown', (e) => {
      if (e.pointerType === 'pen') {
        penDown = true;
        lastPen = Date.now();
      }
    }, true);

    const release = (e) => {
      if (e.pointerType === 'pen') {
        penDown = false;
        lastPen = Date.now();
      }
    };
    this.registerDomEvent(window, 'pointerup', release, true);
    this.registerDomEvent(window, 'pointercancel', release, true);

    const guard = (e, phase) => {
      if (!this.settings.enabled) return;
      let block = penDown;

      for (const t of e.changedTouches) {
        if (phase === 'start') {
          // Some Android WebViews label the stylus on the touch itself
          if (t.touchType === 'stylus') {
            blockedIds.add(t.identifier);
          } else if (
            this.settings.edgeGuard &&
            Date.now() - lastPen < this.settings.penWindowMs
          ) {
            // Palm rejection: touch begins at a screen edge while pen is active
            const w = this.settings.edgeWidth;
            if (t.clientX < w || t.clientX > window.innerWidth - w) {
              blockedIds.add(t.identifier);
            }
          }
        }
        if (blockedIds.has(t.identifier)) {
          block = true;
          if (phase === 'end') blockedIds.delete(t.identifier);
        }
      }

      if (block) e.stopImmediatePropagation();
    };

    this.registerDomEvent(window, 'touchstart', (e) => guard(e, 'start'), true);
    this.registerDomEvent(window, 'touchmove', (e) => guard(e, 'move'), true);
    this.registerDomEvent(window, 'touchend', (e) => guard(e, 'end'), true);
    this.registerDomEvent(window, 'touchcancel', (e) => guard(e, 'end'), true);
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
};

class PenGuardSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName('Enable Pen Guard')
      .setDesc('Block swipe gestures while the pen is touching the screen.')
      .addToggle((t) =>
        t.setValue(this.plugin.settings.enabled).onChange(async (v) => {
          this.plugin.settings.enabled = v;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName('Edge guard (palm rejection)')
      .setDesc(
        'While the pen is active or hovering, also ignore touches that start near the left or right screen edge. Helps if your resting palm opens the sidebars.'
      )
      .addToggle((t) =>
        t.setValue(this.plugin.settings.edgeGuard).onChange(async (v) => {
          this.plugin.settings.edgeGuard = v;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName('Edge width (px)')
      .setDesc('How far from each screen edge counts as the edge zone.')
      .addSlider((s) =>
        s
          .setLimits(10, 120, 5)
          .setValue(this.plugin.settings.edgeWidth)
          .setDynamicTooltip()
          .onChange(async (v) => {
            this.plugin.settings.edgeWidth = v;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Pen activity window (ms)')
      .setDesc('How long after the pen was last seen the edge guard stays active.')
      .addSlider((s) =>
        s
          .setLimits(500, 5000, 250)
          .setValue(this.plugin.settings.penWindowMs)
          .setDynamicTooltip()
          .onChange(async (v) => {
            this.plugin.settings.penWindowMs = v;
            await this.plugin.saveSettings();
          })
      );
  }
}
