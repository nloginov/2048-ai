// NOTE: original code from:
// https://github.com/nloginov/2048-ai
//
/* global GameManager */
// TODO: copy in GameManager...

const AI = {};
const MOVE = { LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40 };
const ALL_MOVES = [MOVE.UP, MOVE.RIGHT, MOVE.DOWN, MOVE.LEFT];
const MOVE_KEY_MAP = {
  [MOVE.UP]: 0,
  [MOVE.RIGHT]: 1,
  [MOVE.DOWN]: 2,
  [MOVE.LEFT]: 3,
};

const voidFn = () => undefined;
const clone = (obj) => JSON.parse(JSON.stringify(obj));
const isEqual = (a, b) => {
  // a and b have the same dimensions
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < b.length; j++) {
      if (a[i][j] !== b[i][j]) {
        return false;
      }
    }
  }

  return true;
};

function fakeGameFrom(model) {
  function fakeInputManager() {
    this.on = voidFn;
  }

  function fakeActuator() {
    this.actuate = voidFn;
  }

  let gameManager = new GameManager(
    model.grid.size,
    fakeInputManager,
    fakeActuator,
    function fakeStorageManager() {
      this.getGameState = function () {
        return model;
      };

      this.clearGameState = voidFn;
      this.getBestScore = voidFn;
      this.setGameState = voidFn;
    }
  );

  return gameManager;
}

AI.Service = {
  imitateMove: (function () {
    return function makeMove(model, move) {
      let gameManager = fakeGameFrom(model);
      let internalMove = MOVE_KEY_MAP[move];

      gameManager.actuate = voidFn;
      gameManager.keepPlaying = true;
      gameManager.move(internalMove);

      let serialized = gameManager.serialize();

      return {
        move,
        score: gameManager.score,
        model: clone(serialized),
        wasMoved: !isEqual(serialized.grid.cells, model.grid.cells),
      };
    };
  })(),
};

function treeAI(model, maxLevel) {
  let leaves = [];

  function expandTree(node, level, root) {
    if (level === maxLevel) {
      return leaves.push(node);
    }

    for (let move of ALL_MOVES) {
      let copyOfModel = clone(node.value);
      let moveData = AI.Service.imitateMove(copyOfModel.model, move);

      let newNode = {
        // penalize scores with higher depth
        // also, add one to both level and maxLevel to avoid division by 0
        weightedScore: moveData.score / ((level + 1) / (maxLevel + 1)),
        value: moveData,
        children: [],
        move: move,
        parent: node,
        root,
      };

      if (newNode.value.wasMoved) {
        node.children.push(newNode);
      }
    }

    for (let childNode of node.children) {
      expandTree(childNode, level + 1, root && root.move ? root : node);
    }

    if (node.children.length === 0) {
      leaves.push(node);
    }
  }

  let rootNode = {
    value: { model },
    children: [],
  };

  expandTree(rootNode, 0);

  let sortedLeaves = leaves.sort((a, b) => b.weightedScore - a.weightedScore);
  let bestNode = sortedLeaves[0];

  return bestNode.root && bestNode.root.move;
}

function run(game, maxLevel) {
  let move = treeAI(game, maxLevel);

  self.postMessage({ type: 'move', move });
}

self.onmessage = function (e) {
  let { data } = e;

  switch (data.type) {
    case 'ready':
      return self.postMessage({ type: 'ack' });

    case 'run':
      return run(data.game, data.maxLevel);
    default:
      console.error(data);
      throw new Error('Unrecognized Message');
  }
};
