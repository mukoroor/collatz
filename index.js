import collatzSequence, { collatzSequencePath, pathMesh } from "./util/collatzAlgo.js";
import combinedShader from "./util/CollatzShader.js";

let COLLATZ_BUFFER, INDEX_BUFFER, INSTANCE_BUFFER, COUNT, DEVICE, indexBuffer, vertexBuffer, combinedShaderModule, instanceBuffer, colorBuffer, segmentBindGroup, segmentBindGroupLayout, commandEncoder, renderPipeline, context, ratio;

let pathLen = 10;
let stoppingIndex = 2;
let strokeWidth = 40;
let borderWidth = 5;
let xLen, yLen;

const boidColorTheme = [[ 54, 39, 41, 255], [0, 31, 84, 255], [3, 64, 120, 255], [18, 130, 162, 255], [238, 108, 77, 255]];
const purpleTheme = [[ 226, 194, 198, 255 ], [ 224, 170, 241, 255 ], [ 204, 100, 180, 255 ], [ 97, 15, 127, 255 ], [ 174, 139, 255, 255 ], Array(4).fill(255)];
const orangeBrown = [
  [85, 44, 19, 255], [95, 62, 40, 255], [152, 116, 93, 255], [62, 28, 0, 255], [59, 30, 8, 255], [54, 37, 17, 255], [55, 29, 16, 255],
  [60, 40, 13, 255], [72, 31, 1, 255], [73, 34, 1, 255], [53, 35, 21, 255], [74, 4, 4, 255], [86, 43, 0, 255], [67, 38, 22, 255],
  [74, 37, 17, 255], [63, 48, 29, 255], [94, 44, 4, 255], [99, 50, 0, 255], [75, 55, 28, 255], [83, 41, 21, 255], [74, 55, 40, 255],
  [101, 42, 14, 255], [101, 53, 15, 255], [72, 60, 50, 255], [123, 63, 0, 255], [120, 61, 26, 255], [153, 80, 36, 255], [178, 95, 45, 255],
  [111, 44, 3, 255], [112, 76, 55, 255], [156, 106, 76, 255], [140, 89, 28, 255], [98, 58, 11, 255], [117, 90, 58, 255], [109, 85, 36, 255],
  [165, 99, 60, 255], [95, 99, 68, 255], [105, 75, 55, 255], [122, 105, 53, 255], [204, 170, 102, 255], [153, 102, 51, 255], [51, 34, 17, 255],
  [102, 68, 51, 255], [85, 51, 17, 255], [112, 72, 38, 255], [157, 92, 18, 255], [124, 86, 51, 255], [66, 30, 5, 255], [37, 25, 16, 255],
  [34, 59, 5, 255], [30, 53, 4, 255], [56, 78, 29, 255], [78, 52, 29, 255], [53, 27, 4, 255], [62, 28, 0, 255], [59, 30, 8, 255],
  [54, 37, 17, 255], [55, 29, 16, 255], [60, 40, 13, 255], [72, 31, 1, 255], [73, 34, 1, 255], [53, 35, 21, 255], [74, 4, 4, 255],
  [86, 43, 0, 255], [67, 38, 22, 255], [74, 37, 17, 255], [63, 48, 29, 255], [94, 44, 4, 255], [99, 50, 0, 255], [75, 55, 28, 255],
  [83, 41, 21, 255], [74, 55, 40, 255], [101, 42, 14, 255], [101, 53, 15, 255], [72, 60, 50, 255], [123, 63, 0, 255]
]

const sandyTheme = [
  [232, 180, 184, 255], [238, 214, 211, 255], [164, 147, 147, 255], [103, 89, 94, 255], [197, 173, 169, 255], [43, 37, 40, 255], 
  [105, 68, 64, 255], [129, 89, 73, 255], [40, 31, 21, 255], [210, 201, 191, 255], [166, 152, 135, 255], [129, 119, 134, 255]
];

const pathColors = new Float32Array(sandyTheme.flat().map(e => e / 255));


const paths = [];
const clearColor = { r: 1.0, g: 1.0, b: 1.0, a: 1.0 };
const renderPassDescriptor = {
  colorAttachments: [
    {
      clearValue: clearColor,
      loadOp: "clear",
      storeOp: "store",
      view: null,
    },
  ],
};

async function init() {
  context = document.querySelector('canvas').getContext("webgpu", {preserveDrawingBuffer: true});
  if (!context) throw new Error('invalid context');

  const animate = async () => {
    meshes(stoppingIndex++);
    await initGPU();
    updatePipeline();
    writePathBuffers();
    await drawPaths();
  }

  window.requestAnimationFrame(animate);
}

async function initGPU() {
  if (!navigator.gpu) throw Error("WebGPU not supported.");

  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) throw Error("Couldn't request WebGPU ADAPTER.");

  DEVICE = await adapter.requestDevice(); 

  context.configure({
    device: DEVICE,
    format: navigator.gpu.getPreferredCanvasFormat(),
    alphaMode: "premultiplied",
    usage: GPUTextureUsage.COPY_SRC | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT
  });
  
  combinedShaderModule = DEVICE.createShaderModule({ code: combinedShader });
  
  vertexBuffer = DEVICE.createBuffer({
      size: COLLATZ_BUFFER.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });

  indexBuffer = DEVICE.createBuffer({
    size: INDEX_BUFFER.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  }); 

  instanceBuffer = DEVICE.createBuffer({
      size: INSTANCE_BUFFER.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });

  colorBuffer = DEVICE.createBuffer({
    size: pathColors.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });

  DEVICE.queue.writeBuffer(colorBuffer, 0, pathColors, 0, pathColors.length);

  segmentBindGroupLayout = DEVICE.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: "read-only-storage" } },
      { binding: 1, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: "read-only-storage" } }
    ]
  });
  
  segmentBindGroup = DEVICE.createBindGroup({
    layout: segmentBindGroupLayout,
    entries: [
      { binding: 0, resource: { buffer: instanceBuffer } },
      { binding: 1, resource: { buffer: colorBuffer } }
    ]
  });
}

function writePathBuffers() {
  DEVICE.queue.writeBuffer(vertexBuffer, 0, COLLATZ_BUFFER, 0, COLLATZ_BUFFER.length);
  DEVICE.queue.writeBuffer(indexBuffer, 0, INDEX_BUFFER, 0, INDEX_BUFFER.length);
  DEVICE.queue.writeBuffer(instanceBuffer, 0, INSTANCE_BUFFER, 0, INSTANCE_BUFFER.length);
}

function updatePipeline() {
  renderPipeline = DEVICE.createRenderPipeline({
    layout: DEVICE.createPipelineLayout({
      bindGroupLayouts: [segmentBindGroupLayout],
    }),
    vertex: {
      constants: { ratio },
      module: combinedShaderModule,
      buffers: [
        {
          arrayStride: 8,
          stepMode: 'vertex',
          attributes: [
            {
              shaderLocation: 0,
              offset: 0,
              format: 'float32x2',
            },
          ],
        },
        {
          arrayStride: 8,
          stepMode: 'vertex',
          attributes: [
            {
              shaderLocation: 1,
              offset: 0,
              format: 'uint32',
            },
            {
              shaderLocation: 2,
              offset: 4,
              format: 'uint32',
            }
          ],
        },
      ],
    },
    fragment: {
      constants: {
        strokeWidth: 2 * strokeWidth / yLen,
        borderWidth: 2 * borderWidth / yLen
      },
      module: combinedShaderModule,
      targets: [
        { format: navigator.gpu.getPreferredCanvasFormat() }
      ],
    },
  });
}

async function drawPaths() {
  commandEncoder = DEVICE.createCommandEncoder();

  renderPassDescriptor.colorAttachments[0].view = context.getCurrentTexture().createView();

  let passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
  passEncoder.setPipeline(renderPipeline);
  passEncoder.setBindGroup(0, segmentBindGroup);
  passEncoder.setVertexBuffer(0, vertexBuffer);
  passEncoder.setVertexBuffer(1, indexBuffer);
  passEncoder.draw(COLLATZ_BUFFER.length / 2);
  passEncoder.end();
  DEVICE.queue.submit([commandEncoder.finish()]);
}


function meshes(stoppingIndex) {
  let offset = 0;
  const meshVals = [], instanceData = [], indices = [];

  for (let i = 0; i < paths.length; i++) {
    const mesh = pathMesh(paths[i], 2 * (strokeWidth + borderWidth) / yLen, offset, i);
    meshVals.push(...mesh[0]);
    instanceData.push(...mesh[1]);
    indices.push(...mesh[2]);
    offset += mesh[1].length / 4;
  }

  COLLATZ_BUFFER = new Float32Array(meshVals);
  INSTANCE_BUFFER = new Float32Array(instanceData);
  INDEX_BUFFER = new Uint32Array(indices)
}

function resizeCanvas() {
    const DEVICE_PIXEL_RATIO = window.devicePixelRatio;
    const canvas = document.querySelector('canvas');
    canvas.height = canvas.offsetHeight * DEVICE_PIXEL_RATIO;
    canvas.width = canvas.offsetWidth * DEVICE_PIXEL_RATIO;
    return [canvas.width, canvas.height];
}


document.addEventListener('DOMContentLoaded', () => {
  COUNT = 10000;
  [xLen, yLen] = resizeCanvas();
  ratio = xLen / yLen; 

  if (paths.length == 0) {
    for (let i = 2; i < COUNT + 1; i++) {
      const path = collatzSequencePath(collatzSequence(i), -27.1167, 16.023, 2 * pathLen / yLen);
      paths.push(path);
    }
  }
  init();
});

export function* numberRange(start, limit) {
  for (let i = start; i < limit; i++) {
    yield i;
  }
}