import Service from '@ember/service';
import { action, computed } from '@ember/object';
import { tracked } from '@glimmer/tracking';

const HISTORY_SIZE = 60;

const INITIAL = {
  bestScore: 0,
  averageScore: 0,
  averageTime: 0,
};

export default class GameHistory extends Service {
  @tracked totalGames = 0;
  @tracked history = [];

  // TODO: replace with @cached
  @computed('history')
  get latest() {
    return {
      ...(this.history[this.history.length - 1] || INITIAL),
      bestScore: Math.max(...(this.history.map(h => h.score))),
    }
  }

  @action
  addGame({ score, time }) {
    let scores = [...this.history.map(h => h.score), score];
    let times = [...this.history.map(h => h.time), time];

    this.history.push({
      score,
      time,
      averageScore: average(scores),
      averageTime: average(times),
    });

    this.totalGames += 1;

    this.trimToWindow();
  }

  @action
  trimToWindow() {
    this.history = this.history.slice(
      Math.max(this.history.length - HISTORY_SIZE, 0)
    );
  }

}

function average(numbers) {
  return numbers.reduce((a, b) => a + b, 0) / numbers.length;
}
