import Component from '@glimmer/component';
import { inject as service } from '@ember/service';

export default class Stats extends Component {
  @service history;
  @service game;

  get data() {
    return this.history.latest;
  }

  get topDoctor() {
    return 'TODO';
  }
}
