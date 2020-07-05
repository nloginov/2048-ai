// NOTE: decorators do not exist in browsers, so we can't
//       use any sort of fancy auto-"bind" decoration :(
// poor man's Dependency Injection
const container = {
  ui: undefined,
  ai: undefined,
};

// const MOVE_MAP = { 37: 'Left', 38: 'Up', 39: 'Right', 40: 'Down' };

const VALUE_MAP = {
  2: 1,
  4: 2,
  8: 3,
  16: 4,
  32: 5,
  64: 6,
  128: 7,
  256: 8,
  512: 9,
  1024: 10,
  2048: 11,
  4096: 12,
  8192: 13,
  16384: 14,
  32768: 15,
};

const DOCTOR_NUMBER_MAP = {
  1: '01 - William Hartnell',
  2: '02 - Patrick Troughton',
  3: '03 - Jon Pertwee',
  4: '04 - Tom Baker',
  5: '05 - Peter Davison',
  6: '06 - Colin Baker',
  7: '07 - Sylvester McCoy',
  8: '08 - Paul McGann',
  9: 'War - John Hurt',
  10: '09 - Christopher Eccleston',
  11: '10 - David Tennant',
  12: '11 - Matt Smith',
  13: '12 - Peter Capaldi',
  14: '13 - Jodie Whittaker',
};

function biggestTile(game) {
  let tiles = game.grid.cells
    .map((row) => row.map((cell) => (cell ? cell.value : 1)))
    .flat();

  let value = Math.max(...tiles);

  return { value, num: VALUE_MAP[value] };
}

class AIWorker {
  static async create() {
    let ai = new AIWorker();

    container.ai = ai;
    await container.ai.setup();

    return ai;
  }

  constructor() {
    // blegh, can't wait for decorators to land
    this.setup = this.setup.bind(this);
    this.send = this.send.bind(this);
    this.onMessage = this.onMessage.bind(this);
    this.requestNextMove = this.requestNextMove.bind(this);
  }

  async setup() {
    // fetching the URL instead of directly loading in a script
    // tag allows us to get around CORS issues
    let workerUrl =
      'https://raw.githubusercontent.com/NullVoxPopuli/doctor-who-thirteen-game-ai/master/worker.js';

    let response = await fetch(workerUrl);
    let script = await response.text();
    let blob = new Blob([script], { type: 'text/javascript' });

    this.worker = new Worker(URL.createObjectURL(blob));
    this.worker.onmessage = this.onMessage;
  }

  send(data) {
    this.worker.postMessage(data);
  }

  onMessage(e) {
    let { data } = e;

    switch (data.type) {
      case 'ack':
        console.debug(`Received: ${JSON.stringify(data)}`);

        return;
      case 'move':
        return container.ui.keyDown(data.move);
      default:
        console.error(data);
        throw new Error('Unrecognized Message');
    }
  }

  requestNextMove(game) {
    let biggest = biggestTile(game).num;

    console.debug(`Biggest Tile: ${biggest} | ${DOCTOR_NUMBER_MAP[biggest]}`);

    this.send({
      type: 'run',
      game,
      maxLevel: Math.max(biggest - 3, 1),
    });
  }
}

class UI {
  static async create() {
    let ui = new UI();

    container.ui = ui;
    container.ui.addRunButton();

    return ui;
  }

  constructor() {
    // blegh, can't wait for decorators to land
    this.addRunButton = this.addRunButton.bind(this);
    this.runAI = this.runAI.bind(this);
    this.keyDown = this.keyDown.bind(this);
  }

  addRunButton() {
    let run = document.createElement('button');

    run.innerText = 'Run A.I.';
    run.style = 'position: fixed; top: 1rem; left: 1rem;';

    run.addEventListener('click', () => this.runAI());

    document.body.appendChild(run);
  }

  runAI() {
    let model = JSON.parse(localStorage.getItem('gameState'));

    if (model !== null && !model.over) {
      container.ai.requestNextMove(model);
    }
  }

  keyDown(k) {
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

    this.runAI();
  }
}

async function boot() {
  await AIWorker.create();
  await UI.create();

  container.ai.send({ type: 'ready' });
}

boot();
