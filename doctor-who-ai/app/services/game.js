import Service from '@ember/service';
import { action } from '@ember/object';

export default class Game extends Service {
  @tracked startTime;

  get isGameOver() {
    return Boolean(document.querySelector('.game-over'));
  }

  get score() {
    return parseInt(
      document.querySelector('.score-container').textContent,
      10
    );
  }

  get state() {
    return JSON.parse(localStorage.getItem('gameState'));
  }

  @action
  snapshot() {
    return {
      score: this.score,
      time: new Date() - this.startTime,
    }
  }

  startNewGame() {
    // set by moving (in case there is delay)
    this.startTime = undefined;

    document.querySelector('.retry-button').click();
  }

  pressKey(key) {
    simulateKeyPress(key);
  }
}

function simulateKeyPress(k) {
    let oEvent = document.createEvent('KeyboardEvent');

    function defineConstantGetter(name, value) {
      Object.defineProperty(oEvent, name, {
        get() {
          return value;
        },
      });
    }

    defineConstantGetter('keyCode', k);
    defineConstantGetter('which', k);
    defineConstantGetter('metaKey', false);
    defineConstantGetter('shiftKey', false);
    defineConstantGetter('target', { tagName: '' });

    /* eslint-disable */
    oEvent.initKeyboardEvent('keydown',
      true, true, document.defaultView, false, false, false, false, k, k
    );
    /* eslint-enable */

    document.dispatchEvent(oEvent);


}
