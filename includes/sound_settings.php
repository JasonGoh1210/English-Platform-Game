<div class="settings-audio">
  <label class="settings-sound-toggle" for="soundEnabled">
    <span data-i18n="settings.sound">SOUND EFFECTS</span>
    <input type="checkbox" id="soundEnabled" checked>
  </label>
  <div class="settings-volume-heading">
    <label for="soundVolume" data-i18n="settings.volume">VOLUME</label>
    <output id="soundVolumeValue" for="soundVolume">35%</output>
  </div>
  <input type="range" id="soundVolume" min="0" max="100" step="1" value="35">
  <button type="button" id="soundTest" class="settings-sound-test" data-i18n="settings.testSound">TEST SOUND</button>
</div>
