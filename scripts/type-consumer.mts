import {normalizeDocument,worldTransform} from '@interactive-project/whiteboard';
import type {BoardDocument} from '@interactive-project/whiteboard';
import {validateDocument} from '@interactive-project/whiteboard/validation';
declare const document:BoardDocument;const result=normalizeDocument(document,validateDocument);const matrix:readonly number[]=worldTransform(result,'object');void matrix;

import {createEditingPorts,createGestureBuffer} from '@interactive-project/whiteboard/editing';
const ports=createEditingPorts({activity:document,validateDocument});void ports;const gestures=createGestureBuffer();gestures.begin('stroke');gestures.cancel();gestures.dispose();
