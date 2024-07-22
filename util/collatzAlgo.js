const  TWO_PI = 2 * Math.PI;

export default function collatzSequence(value, mode = 0) {
    const sequence = [];
    let next;

    if (value < 1) {
        return sequence;
    }

    while (!sequence.length || value !== 1) {
        if (value % 2 === 0) {
            next = value / 2;
        } else {
            next = value * 3 + 1;
        }
        sequence.unshift( mode === 0 ? value % 2 : value);
        value = next;
    }

    sequence.unshift(1);
    return sequence;
}

export function collatzSequencePath(finalSequence, oddAngle, evenAngle, pathLen = 0.05) {
    const pathVertices = Array(finalSequence.length);
    const location = [0, 0];
    let totalAngle = 0;
    
    for (let i = 0; i < finalSequence.length; i++) {
        pathVertices[i] = [...location];
        if (finalSequence[i]) {
            totalAngle = (totalAngle + oddAngle) % 360;
        } else {
            totalAngle = (totalAngle + evenAngle) % 360;
        }
        
        location[0] += pathLen * Math.cos(Math.PI * totalAngle / 180);
        location[1] += pathLen * Math.sin(Math.PI * totalAngle / 180);
    }
    
    pathVertices.push(location);
    
    return pathVertices;
}

function buildPathQuads(path, width) {
    const quads = [];

    const scale = 0.5 * width;

    for (let i = 0; i < path.length - 1; i++) {
        const data = {normal: null, centroid: [path[i], path[i + 1]], vertices: Array(4)};

        data.normal = [path[i + 1][1] - path[i][1], path[i][0] - path[i + 1][0]];

        let mag = Math.sqrt(data.normal[0] * data.normal[0] + data.normal[1] * data.normal[1]);
        data.normal = [data.normal[0] / mag, data.normal[1] / mag];


        const xDelt = scale * data.normal[0], yDelt = scale * data.normal[1];

        if (!i) {
            const vert0 = Array(2), vert1 = Array(2);

            vert0[0] = path[i][0] + xDelt;
            vert0[1] = path[i][1] + yDelt;

            vert1[0] = path[i][0] - xDelt;
            vert1[1] = path[i][1] - yDelt;

            data.vertices[0] = vert0;
            data.vertices[1] = vert1;
        }

        if (i === path.length - 2) {
            const vert2 = Array(2), vert3 = Array(2);

            vert2[0] = path[i + 1][0] + xDelt;
            vert2[1] = path[i + 1][1] + yDelt;
            
            vert3[0] = path[i + 1][0] - xDelt;
            vert3[1] = path[i + 1][1] - yDelt;
            
            data.vertices[2] = vert2;
            data.vertices[3] = vert3;
        }
        quads.push(data);
    }

    return quads
}

function mergePathQuads(quads, width) {
    const scale = 0.5 * width;

    for (let i = 0; i < quads.length - 1; i++) {
        const currQuad = quads[i];
        const nextQuad = quads[i + 1];
        
        const avgNormal = [(currQuad.normal[0] + nextQuad.normal[0]) / 2, (currQuad.normal[1] + nextQuad.normal[1]) / 2];
        const avgMag = Math.sqrt(avgNormal[0] * avgNormal[0] + avgNormal[1] * avgNormal[1]);
        const currNormalMag = Math.sqrt(currQuad.normal[0] * currQuad.normal[0] + currQuad.normal[1] * currQuad.normal[1]);

        const angle = Math.acos((currQuad.normal[0] * avgNormal[0] + currQuad.normal[1] * avgNormal[1]) / (currNormalMag * avgMag));
        const dot = currQuad.normal[0] * nextQuad.normal[0] + currQuad.normal[1] * nextQuad.normal[1];
        const det = currQuad.normal[0] * nextQuad.normal[1] - currQuad.normal[1] * nextQuad.normal[0];

        const multiplier = Math.atan2(det, dot) >= 0 ? 1: -1;
        
        const newPointMag = multiplier * Math.tan(angle) * scale;

        const newPoint1 = [-newPointMag * currQuad.normal[1] + currQuad.normal[0] * scale + currQuad.centroid[1][0], newPointMag * currQuad.normal[0] + currQuad.normal[1] * scale + currQuad.centroid[1][1]];
        const newPoint2 = [newPointMag * currQuad.normal[1] - currQuad.normal[0] * scale + currQuad.centroid[1][0], -newPointMag * currQuad.normal[0] - currQuad.normal[1] * scale + currQuad.centroid[1][1]];

        currQuad.vertices[2] = [...newPoint1];
        currQuad.vertices[3] = [...newPoint2];

        nextQuad.vertices[0] = [...newPoint1];
        nextQuad.vertices[1] = [...newPoint2];
    }
    return quads;
}

function buildPathEnds(pathQuads, width, type = 'CIRCLE') {
    if (type === 'BUTT') return [];
    else if (type === 'SQUARE') {
        
    } else {
        let angle, count, trianglesData = [];
        if (type === 'CIRCLE') angle = Math.PI / 20, count = 20;
        else if (type === 'HEXAGON') angle = Math.PI / 3, count = 3;
        else angle = Math.PI / 2, count = 2;

        endHelper(pathQuads[0].normal.map(e => -e), pathQuads[0].centroid[0], angle, count, width, trianglesData);
        endHelper(pathQuads[pathQuads.length - 1].normal, pathQuads[pathQuads.length - 1].centroid[1], angle, count, width, trianglesData);
        
        return trianglesData;
    }
}

function endHelper(normal, centroid, angle, count, width, trianglesData) {
    let startingAngle = Math.atan2(normal[1], normal[0]);
    startingAngle += startingAngle < 0 ? TWO_PI : 0;

    for (let i = 0; i < count; i++) {
        let currAngle = startingAngle + i * angle;
        const data = {vertices: [...centroid], centroid: [...centroid], normal: null};

        let vertex1 = [Math.cos(currAngle) * 0.5 * width + centroid[0], Math.sin(currAngle) * 0.5 * width + centroid[1]];
        let vertex2 = [Math.cos(currAngle + angle) * 0.5 * width + centroid[0], Math.sin(currAngle + angle) * 0.5 * width + centroid[1]];

        data.vertices.push(...vertex1, ...vertex2);

        data.normal = [Math.cos(currAngle + 0.5 * angle), Math.sin(currAngle + 0.5 * angle)];

        trianglesData.push(data);
    }
}

function buildTrianglesFromQuad(quadVertices) {
    return [...quadVertices[0], ...quadVertices[1], ...quadVertices[2], ...quadVertices[1], ...quadVertices[2], ...quadVertices[3]];
}

export function pathMesh(path, width, offset = 0, pathNum = 0, merge = true) {
    const pathQuads = buildPathQuads(path, width);
    let pathEnds = [];
    if (merge) {
        mergePathQuads(pathQuads, width);
        pathEnds = buildPathEnds(pathQuads, width);
    }
    const instanceData = [];
    const triangles = [];
    const indices = [];

    for (let i = 0; i < pathQuads.length; i++) {
        const {vertices, normal, centroid} = pathQuads[i];
        
        triangles.push(...buildTrianglesFromQuad(vertices));
        instanceData.push(...normal, ...centroid[0]);
        indices.push(...Array.from({length: 12}, (_, index) => index % 2 ? pathNum: i + offset));
    }

    for (let i = 0; i < pathEnds.length; i++) {
        const {vertices, normal, centroid} = pathEnds[i];

        triangles.push(...vertices);
        instanceData.push(...normal, ...centroid);
        indices.push(...Array.from({length: 6}, (_, index) => index % 2 ? pathNum: i + pathQuads.length + offset));
    }



    return [triangles, instanceData, indices];
}