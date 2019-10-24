/**
 * @license
 * Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */

import {NamedAttrMap, NamedTensorInfoMap, registerKernel, TensorInfo, util} from '@tensorflow/tfjs-core';

import {BackendWasm} from '../backend_wasm';

interface BatchNormInputs extends NamedTensorInfoMap {
  x: TensorInfo;
  mean: TensorInfo;
  variance: TensorInfo;
  offset: TensorInfo;
  scale: TensorInfo;
}

interface BatchNormAttrs extends NamedAttrMap {
  varianceEpsilon: number;
}

let wasmBatchNorm: (
    xId: number, meanId: number, varianceId: number, outId: number,
    offsetId: number, scaleId: number, varianceEpsilon: number) => void;

function setup(backend: BackendWasm): void {
  wasmBatchNorm = backend.wasm.cwrap(
      'BatchNormalization', null /* void */,
      ['number', 'number', 'number', 'number', 'number', 'number', 'number']);
}

function batchNormalization(
    args:
        {backend: BackendWasm, inputs: BatchNormInputs, attrs: BatchNormAttrs}):
    TensorInfo {
  console.log('IN BATCH NORMALIZATION');
  const {backend, inputs, attrs} = args;
  const {varianceEpsilon} = attrs;
  console.log(varianceEpsilon);
  const {x, mean, variance, offset, scale} = inputs;
  const xId = backend.dataIdMap.get(x.dataId).id;
  const meanId = backend.dataIdMap.get(mean.dataId).id;
  const varianceId = backend.dataIdMap.get(variance.dataId).id;
  const offsetId = offset ? backend.dataIdMap.get(offset.dataId).id : null;
  const scaleId = scale ? backend.dataIdMap.get(scale.dataId).id : null;

  const out = backend.makeOutput(x.shape, x.dtype);
  // Short-circuit zero-sized tensors.
  if (util.sizeFromShape(x.shape) === 0) {
    return out;
  }

  const outId = backend.dataIdMap.get(out.dataId).id;

  wasmBatchNorm(
      xId, meanId, varianceId, outId, offsetId, scaleId, varianceEpsilon);
  return out;
}

registerKernel({
  kernelName: 'BatchNormalization',
  backendName: 'wasm',
  setupFunc: setup,
  kernelFunc: batchNormalization
});