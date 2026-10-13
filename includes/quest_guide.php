<section class="quest-guide-screen hidden" id="questGuideScreen" role="dialog" aria-modal="true" aria-labelledby="questGuideTitle">
  <div class="quest-guide-panel">
    <header class="quest-guide-header">
      <h2 id="questGuideTitle" data-i18n="guide.title">Your next adventure</h2>
      <button type="button" id="questGuideClose" data-i18n="guide.close">Back to map</button>
    </header>
    <section class="quest-guide-next">
      <span data-i18n="guide.next">NEXT TARGET</span>
      <h3 id="questGuideTarget"></h3>
      <p id="questGuideRoute"></p>
      <p id="questGuideMain" class="hidden"></p>
    </section>
    <ol class="quest-guide-chapters" id="questGuideChapters" aria-label="Story route" data-i18n-aria-label="guide.storyRoute"></ol>
    <div class="quest-guide-caves">
      <section>
        <span class="quest-guide-badge" data-i18n="guide.optional">OPTIONAL EXPLORATION</span>
        <h3 data-i18n="cave.title">Cave of Echoes</h3>
        <p data-i18n="guide.echo.purpose">Explore three rooms and fight with English answers. Re-enter to replay.</p>
        <ol>
          <li data-i18n="guide.echo.room1">1. Echo Hall · mixed quiz battle</li>
          <li data-i18n="guide.echo.room2">2. Rune Passage · true or false</li>
          <li data-i18n="guide.echo.room3">3. Crystal Nest · sentence builder</li>
        </ol>
        <p data-i18n="guide.echo.location">Ancient Ruins · left cave entrance</p>
        <p id="questGuideEchoProgress"></p>
      </section>
      <section>
        <span class="quest-guide-badge" data-i18n="guide.finale">STORY FINALE · 3 ROUNDS</span>
        <h3 data-i18n="guide.typing.name">Word Cavern</h3>
        <p data-i18n="guide.typing.purpose">Type English words from their meanings and push back the monsters. Finish Kai's chapter first to unlock the ending.</p>
        <p data-i18n="guide.typing.rules">Wrong answers or delays bring the monster closer. Correct answers push it back. The last two letters stay hidden.</p>
        <p data-i18n="guide.typing.location">Ancient Ruins · right cave entrance</p>
      </section>
    </div>
  </div>
</section>
