import {normalizeDocument,worldTransform} from '@interactive-project/whiteboard';
import type {BoardDocument} from '@interactive-project/whiteboard';
import {validateDocument} from '@interactive-project/whiteboard/validation';
declare const document:BoardDocument;const result=normalizeDocument(document,validateDocument);const matrix:readonly number[]=worldTransform(result,'object');void matrix;
