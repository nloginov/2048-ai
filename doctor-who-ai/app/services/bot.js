import Service, { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { timeout } from 'ember-concurrency';

export const BOT = {
  RNN = 'rnn',
  RANDOM = 'random',
}

export default class Bot extends Service {
  @service aiWorker;
  @service game;
  @service history;

  @tracked isAutoRetrying = false;
  @tracked currentBot = BOT.RNN;

  @action
  requestMove() {
    let state = this.game.state;

    if (state !== null && !state.over) {
      if (!this.game.startTime) {
        this.game.startTime = new Date();
      }

      this.aiWorker.requestMove(state, this.currentBot);
    }
  }

  async autoRetry() {
    if (!this.isAutoRetrying) {
      return;
    }

    if (this.game.isGameOver) {
      let stats = this.game.snapshot();

      this.history.add(stats);

      this.game.startNewGame();

      await timeout(1000);

      this.requestMove();
    }
  }
}
