/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @flow
 */

'use strict';

const TraceUpdatesAbstractNodeMeasurer = require('./TraceUpdatesAbstractNodeMeasurer');
const TraceUpdatesAbstractNodePresenter = require('./TraceUpdatesAbstractNodePresenter');
const TraceUpdatesWebNodeMeasurer = require('./TraceUpdatesWebNodeMeasurer');
const TraceUpdatesWebNodePresenter = require('./TraceUpdatesWebNodePresenter');

import type {
  Agent,
  Measurement,
  Measurer,
  Presenter,
} from './TraceUpdatesTypes';

import type {ControlState} from '../../frontend/types.js';

const NODE_TYPE_COMPOSITE = 'Composite';

class TraceUpdatesBackendManager {
  _onMeasureNode: () => void;
  _measurer: Measurer;
  _presenter: Presenter;
  _isActive: boolean;

  constructor(agent: Agent) {
    this._onMeasureNode = this._onMeasureNode.bind(this);

    var useDOM = agent.capabilities.dom;

    this._measurer = useDOM ?
      new TraceUpdatesWebNodeMeasurer() :
      new TraceUpdatesAbstractNodeMeasurer();

    this._presenter = useDOM ?
      new TraceUpdatesWebNodePresenter() :
      new TraceUpdatesAbstractNodePresenter();

    this._isActive = false;
    agent.on('traceupdatesstatechange', this._onTraceUpdatesStateChange.bind(this));
    agent.on('update', this._onUpdate.bind(this, agent));
    agent.on('shutdown', this._shutdown.bind(this));
  }

  _onUpdate(agent: Agent, obj: any) {
    if (
      !this._isActive ||
      !obj.publicInstance ||
      !obj.id ||
      obj.nodeType !== NODE_TYPE_COMPOSITE
    ) {
      return;
    }

    var node = agent.getNodeForID(obj.id);
    if (!node) {
      return;
    }

    this._measurer.request(node, this._onMeasureNode);
  }

  _onMeasureNode(measurement: Measurement): void {
    this._presenter.present(measurement);
  }

  _onTraceUpdatesStateChange(state: ControlState): void {
    this._isActive = state.enabled;
    this._presenter.setEnabled(state.enabled);
  }

  _shutdown(): void {
    this._isActive = false;
    this._presenter.setEnabled(false);
  }
}

function init(agent: Agent): TraceUpdatesBackendManager {
  return new TraceUpdatesBackendManager(agent);
}

module.exports = {
  init,
};
