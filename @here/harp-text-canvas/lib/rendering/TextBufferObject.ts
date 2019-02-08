/*
 * Copyright (C) 2017-2019 HERE Europe B.V.
 * Licensed under Apache 2.0, see full license in LICENSE
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from "three";
import { GlyphData } from "./GlyphData";
import { TextLayoutStyle, TextRenderStyle } from "./TextStyle";

/**
 * Object containing vertex buffer data generated by [[TextCanvas]].
 */
export class TextBufferObject {
    /**
     * [[TextRenderStyle]] used to generate this `TextBufferObject`.
     */
    readonly textRenderStyle: TextRenderStyle;

    /**
     * [[TextLayoutStyle]] used to generate this `TextBufferObject`.
     */
    readonly textLayoutStyle: TextLayoutStyle;

    /**
     * Constructs a new `TextBufferObject`.
     *
     * @param text Input text.
     * @param glyphs Input glyphs.
     * @param buffer Buffer containing the data generated by [[TextCanvas]].
     * @param textRenderStyle [[TextRenderStyle]] applied by [[TextCanvas]].
     * @param textLayoutStyle [[TextLayoutStyle]] applied by [[TextCanvas]].
     * @param bounds Optional text bounds.
     * @param characterBounds Optional character bounds.
     *
     * @returns New `TextBufferObject`.
     */
    constructor(
        readonly text: string,
        readonly glyphs: GlyphData[],
        readonly buffer: Float32Array,
        textRenderStyle: TextRenderStyle,
        textLayoutStyle: TextLayoutStyle,
        readonly bounds?: THREE.Box2,
        readonly characterBounds?: THREE.Box2[]
    ) {
        this.textRenderStyle = textRenderStyle.clone();
        this.textLayoutStyle = textLayoutStyle.clone();
    }
}
