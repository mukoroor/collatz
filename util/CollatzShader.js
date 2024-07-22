
const combinedShader = /*wgsl*/`
    override ratio: f32 = 1;
    override strokeWidth: f32 = 1.;
    override borderWidth: f32 = 1.;
    override strokeSteps: f32 = 5.;
    override strokeWidthPercentage = strokeWidth / (borderWidth + strokeWidth);
    override maxLen = strokeWidth * 0.5;

    struct VertexOutput {
        @builtin(position) position : vec4<f32>,
        @location(0) @interpolate(flat) seed : vec2<u32>,
        @location(1) @interpolate(flat) normal : vec2<f32>,
        @location(2) @interpolate(flat) origin : vec2<f32>,
        @location(3) @interpolate(linear) uv: vec2<f32>
    }

    @group(0) @binding(0)
    var<storage, read> segments: array<vec4<f32>>;
    @group(0) @binding(1)
    var<storage, read> colors: array<vec4<f32>>;

    @vertex
    fn vert_main(@location(0) strip_pos : vec2<f32>, @location(1) segmentIndex: u32, @location(2) pathIndex: u32) -> VertexOutput {
        var output : VertexOutput;

        output.position = vec4(strip_pos.x / ratio, strip_pos.y - 0.7, 0., 1.);
        output.normal = normalize(vec2(segments[segmentIndex].x, segments[segmentIndex].y));
        // output.color = colors[segmentIndex % arrayLength(&colors)];
        // output.color = colors[pathIndex % arrayLength(&colors)];
        output.seed = vec2(pathIndex, segmentIndex);
        output.origin = vec2(segments[segmentIndex].z, segments[segmentIndex].w);
        output.uv = strip_pos;
        
        return output;
    }
    
    @fragment
    fn frag_main(frag: VertexOutput) -> @location(0) vec4f {
        var u = frag.uv - frag.origin;
        var len = abs(dot(u, frag.normal));
        if len > maxLen * strokeWidthPercentage {
            // || len < 0.5 * maxLen / strokeSteps
            return vec4(0., 0., 0., 1.);
        } else {
            var colorIndex = (bitcast<u32>(floor(len * strokeSteps / (maxLen * strokeWidthPercentage)) / strokeSteps) + frag.seed.x) % arrayLength(&colors);
            // var colorIndex = (bitcast<u32>(floor((len - sin(frag.uv.x - frag.uv.y)) * strokeSteps / (maxLen * strokeWidthPercentage)) / strokeSteps) + frag.seed.x) * frag.seed.x % arrayLength(&colors);
            return colors[colorIndex];
        }
    }
`;

export default combinedShader;