import Service, { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';

import { BOT } from './bot';

export default class AIWorker extends Service {
  @service game;

  @tracked isReady = false;

  constructor() {
    super(...arguments);

    this.install();
  }

  get trainingData() {
    return JSON.parse(localStorage.getItem('training'));
  }
  set trainingData(value) {
    localStorage.setItem('training', JSON.stringify(value));
  }

  @action
  async install() {
    this.worker = await createWorker();
    this.worker.onmessage = this.onMessage;
  }

  @action
  requestMove(state, algorithm) {
    if (!this.worker) {
      console.debug('Worker not loaded yet');
      return;
    }

    let options = { type: 'run', game: state, algorithm };

    if (algorithm === BOT.RNN) {
      options.trainingData = this.trainingData;
    }

    this.worker.postMessage(options);
  }

  @action
  onMessage(e) {
    let { data } = e;

    switch (data.type) {
      case 'ack':
      case 'ready':
        return this.isReady = true;
      case 'move':
        if (!data.move) {
          console.error(`No move was generated`, data);

          return;
        }

        if (data.trainingData) {
          this.trainingData = data.trainingData;
        }

        return this.game.pressKey(data.move);
      default:
        console.error(data);
        throw new Error('Unrecognized Message');
    }

  }
}


const workerUrl =
  'https://raw.githubusercontent.com/NullVoxPopuli/doctor-who-thirteen-game-ai/master/worker.js';

// fetching the URL instead of directly loading in a script
// tag allows us to get around CORS issues
async function createWorker() {
  let response = await fetch(workerUrl);
  let script = await response.text();
  let blob = new Blob([script], { type: 'text/javascript' });

  return new Worker(URL.createObjectURL(blob));
}
