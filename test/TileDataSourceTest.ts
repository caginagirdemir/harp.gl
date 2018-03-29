/*
 * Copyright (C) 2017 HERE Global B.V. and its affiliate(s).
 * All rights reserved.
 *
 * This software and other materials contain proprietary information
 * controlled by HERE and are protected by applicable copyright legislation.
 * Any use and utilization of this software and other materials and
 * disclosure to any third parties is conditional upon having a separate
 * agreement with HERE for the access, use, utilization or disclosure of this
 * software. In the absence of such agreement, the use of the software is not
 * allowed.
 */

import {
    DecodedTile,
    ITileDecoder,
    Theme,
    TileInfo,
    ValueMap
} from "@here/datasource-protocol";
import { CancellationToken } from "@here/fetch";
import {
    Projection,
    TileKey,
    webMercatorProjection,
    webMercatorTilingScheme
} from "@here/geoutils";
import { DataSource, MapView, Statistics, Tile, TileLoaderState } from "@here/mapview";
import { assert } from "chai";
import * as sinon from "sinon";
import { DataProvider, TileDataSource, TileFactory } from "../index";


function createMockDataProvider() {
    const mock = sinon.stub(<DataProvider> {
        async connect() { },
        ready(): boolean { return true; },
        async getTile(): Promise<ArrayBuffer> {
            return Promise.resolve(new ArrayBuffer(5));
        }
    })
    mock.getTile.callsFake(() => {
        return Promise.resolve(new ArrayBuffer(5));
    });
    return mock;
}

const fakeEmptyGeometry = {
    foo: 'bar',
    geometries: [],
    techniques: [],
}

function createMockTileDecoder() {
    const mock = sinon.stub(<ITileDecoder>{
        async connect() {},
        async decodeTile(): Promise<DecodedTile> {
            return Promise.resolve(fakeEmptyGeometry);
        },
        async getTileInfo(
            data: ArrayBufferLike,
            tileKey: TileKey,
            dataSourceName: string,
            projection: Projection
        ): Promise<TileInfo|undefined> {
            return Promise.resolve(undefined);
        },
        configure() {}
    });
    mock.decodeTile.resolves(fakeEmptyGeometry);
    return mock;
}

function createMockMapView() {
    return { projection: webMercatorProjection, statistics: new Statistics() } as MapView
}

function genericTileFactory(dataSource: DataSource, tileKey: TileKey) {
    return new Tile(dataSource, tileKey);
}

describe("TileDataSource", function () {
    it('uses tileFactory to construct tiles with custom type', function () {
        class CustomTile extends Tile {
            constructor(dataSource: DataSource, tileKey: TileKey) {
                super(dataSource, tileKey)
            }
        };

        const testedDataSource = new TileDataSource(new TileFactory(CustomTile), {
            id: 'tds',
            tilingScheme: webMercatorTilingScheme,
            dataProvider: createMockDataProvider(),
            useWorker: true,
            decoder: createMockTileDecoder()
        });
        testedDataSource.attached(createMockMapView());

        const mockTile = testedDataSource.getTile(TileKey.fromRowColumnLevel(0, 0, 0));

        assert(mockTile instanceof CustomTile)
    });

    it("#updateTile: tile disposing cancels load, skips decode and tile update", async function () {

        const mockDataProvider = createMockDataProvider();

        let getTileToken = new CancellationToken();
        mockDataProvider.getTile.callsFake((tileKey: any, cancellationToken: any) => {
            assert(cancellationToken !== undefined)
            assert(cancellationToken instanceof CancellationToken)
            getTileToken = cancellationToken as CancellationToken;
            return Promise.resolve(new ArrayBuffer(5));
        })

        const mockDecoder = createMockTileDecoder();
        mockDecoder.decodeTile.resolves(fakeEmptyGeometry);

        const testedDataSource = new TileDataSource(new TileFactory(Tile), {
            id: 'tds',
            tilingScheme: webMercatorTilingScheme,
            dataProvider: mockDataProvider,
            useWorker: true,
            decoder: mockDecoder
        });

        testedDataSource.attached(createMockMapView());

        const tile = testedDataSource.getTile(TileKey.fromRowColumnLevel(0, 0, 0))!;
        assert(tile);

        const spyTileSetDecodedTile = sinon.spy(tile, 'setDecodedTile');

        // act
        testedDataSource.updateTile(tile);

        const tileLoaderSettled = tile.tileLoader!.waitSettled();

        const savedLoader = tile.tileLoader;
        assert.exists(savedLoader);
        tile.dispose();

        const settledState = await tileLoaderSettled;

        // assert
        assert.equal(settledState, TileLoaderState.Canceled);
        assert.notExists(tile.tileLoader);
        assert.equal(savedLoader!.state, TileLoaderState.Disposed);

        assert.equal(mockDataProvider.getTile.callCount, 1);
        assert.equal(getTileToken.isCancelled, true);
        assert.equal(mockDecoder.decodeTile.callCount, 0);
        assert.equal(spyTileSetDecodedTile.callCount, 0);
    });


    it("subsequent, overlapping #updateTile calls load & decode tile once", async function () {

        const mockDataProvider = createMockDataProvider();
        const mockDecoder = createMockTileDecoder();

        mockDecoder.decodeTile.resolves(fakeEmptyGeometry);

        const testedDataSource = new TileDataSource(new TileFactory(Tile), {
            id: 'tds',
            tilingScheme: webMercatorTilingScheme,
            dataProvider: mockDataProvider,
            useWorker: true,
            decoder: mockDecoder
        });
        testedDataSource.attached(createMockMapView());

        const tile = testedDataSource.getTile(TileKey.fromRowColumnLevel(0, 0, 0))!;
        assert(tile);

        const spyTileSetDecodedTile = sinon.spy(tile, 'setDecodedTile');

        // act
        testedDataSource.updateTile(tile);
        testedDataSource.updateTile(tile);
        testedDataSource.updateTile(tile);

        const settledState = await tile.tileLoader!.waitSettled();

        // assert
        assert.equal(mockDataProvider.getTile.callCount, 1);
        assert.equal(mockDecoder.decodeTile.callCount, 1);
        assert(spyTileSetDecodedTile.calledWith(fakeEmptyGeometry));
    });
});
