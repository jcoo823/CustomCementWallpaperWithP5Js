// ==================== CONFIGURATION SECTION ====================
// Centralized settings for easy customization

// GRID SETTINGS
const CONFIG = {
  // Block and grid settings
  BLOCK_SIZE: 22,                  // Size of each block in pixels (try: 20-100)
  BORDER_WIDTH: 1,                   // Width of the dark border in blocks (try: 1-3)
  MATTE_BORDER_WIDTH: 6,             // Width of the white matte border (try: 1-5)
  GRID_MARGIN_RATIO: 22,             // Margin as fraction of screen (try: 8-15, smaller = larger margin)
  
  // Footer text settings
  TEXT_SIZE_RATIO: 0.3,              // Text size as ratio of block size (try: 0.2-0.4)
  FOOTER_TEXT_SIZE: 12,              // Fixed text size in pixels (try: 10-20)
  FOOTER_MARGIN_X: 140,               // Horizontal margin from edge in pixels (try: 10-50)
  FOOTER_MARGIN_Y: 130,               // Vertical margin from bottom in pixels (try: 10-50)
  USE_FIXED_FOOTER_SIZE: true,       // Use fixed pixel sizes instead of block-relative (true/false)

  // X = 150 Y = 135 FOR 32 BLOCK SIZE
  // X = 140 Y = 130 FOR 22 BLOCK SIZE


  // Shape settings
  TOTAL_SHAPES: 24,                  // Number of different shapes available (max 30)
  SHAPE_LAYERS: 4,                   // Number of layers per shape pattern (try: 2-6)
  
  // Animation settings
  ANIMATION_SPEED: 4000,              // Animation speed divisor (try: 200-800, larger = slower)
  ROTATION_STEPS: 4,                  // Number of rotation steps (try: 2-8)

  // Shadow settings
  SHADOW_BLUR: 30,                   // Shadow blur amount in pixels (try: 10-50)
  SHADOW_OFFSET: 30,                 // Shadow offset in pixels (try: 10-60)
  SHADOW_ANGLE: Math.PI / 8,         // Long shadow angle (try: PI/6 to PI/4)
  SHADOW_OPACITY: 10,                // Shadow opacity (try: 5-20)
  
  // Background settings
  BACKGROUND_BRIGHTNESS: 80,          // Background brightness in HSB (try: 60-100)
  SHADOW_BRIGHTNESS_MIN: 70,          // Minimum shadow brightness (try: 10-40)
  SHADOW_BRIGHTNESS_MAX: 130,         // Maximum shadow brightness (try: 100-150)
  
  // Color settings
  USE_RANDOM_PALETTE: false,          // Use random color palette each frame (true/false)
  FORCE_PALETTE_INDEX: 34,            // Force specific palette (0-17, only if USE_RANDOM_PALETTE is false)
  // 27 - Blacked Out & 23 - Dark Blue 
  // 17 - Forest & 32 - Calm Green Mint
  // 19 - Gold & 34 - Sandstone
  // 22 - Blue Rust Steel & 35 - Nocturnal Blue
  // 28 - Purple and Green Bit Terminal & 31 - Arcade R/G/B/Y
  // 29 - Starburst Lemon Lime & 33 - Orange Lavaburst
};

// ==================== END CONFIGURATION ====================

// Available shape indices (0-29 for all possible shapes)
const ALL_SHAPES = [...Array(30)].map((_, i) => i); //=> [ 0, 1, 2, 3, 4... 29 ]

// Initialize with 8 random shapes - will be populated in setup()
let shapes_arr = [];
let block_size;
let matte_block_num = CONFIG.MATTE_BORDER_WIDTH;
let block_num_w, block_num_h;
let offset_w, offset_h;
let palette;
let shadowGraphics;
let rs;

/**
 * p5.js setup function - runs once at the start of the program
 * Initializes the canvas, sets color mode, creates shadow graphics, and sets random seed
 */
function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  rs = width * height;
  
  // Randomly select 8 shapes from all available shapes (0-29)
  selectRandomShapes();
  
  // noLoop();
}

/**
 * Randomly selects 8 unique shapes from all available shapes
 * This ensures variety while maintaining consistency during execution
 */
function selectRandomShapes() {
  // Create a copy of all available shapes
  let availableShapes = [...ALL_SHAPES];
  shapes_arr = [];
  
  // Randomly select 8 unique shapes
  for (let i = 0; i < CONFIG.TOTAL_SHAPES; i++) {
    if (availableShapes.length === 0) break; // Safety check
    
    let randomIndex = floor(random(availableShapes.length));
    let selectedShape = availableShapes.splice(randomIndex, 1)[0];
    shapes_arr.push(selectedShape);
  }
  
  // Sort the array for consistent indexing
  shapes_arr.sort((a, b) => a - b);
  
  console.log("Selected shapes for this session:", shapes_arr);
}

/**
 * p5.js draw function - runs continuously in a loop
 * Main rendering function that draws the grid of blocks with patterns and applies shadow effects
 */
function draw() {
  blendMode(BLEND);

  background(0, 0, CONFIG.BACKGROUND_BRIGHTNESS);
  randomSeed(width * height);
  
  // Use either random palette or forced palette
  if (CONFIG.USE_RANDOM_PALETTE) {
    palette = shuffle(random(colorScheme).colors);
  } else {
    palette = shuffle(colorScheme[CONFIG.FORCE_PALETTE_INDEX].colors);
  }

  block_size = CONFIG.BLOCK_SIZE;
  offset_w = width / CONFIG.GRID_MARGIN_RATIO;
  block_num_w = int((width - offset_w * 2) / block_size);
  offset_w = (width - block_size * block_num_w) / 2;

  offset_h = offset_w;
  block_num_h = int((height - offset_h * 2) / block_size);
  offset_h = (height - block_size * block_num_h) / 2;

  if (matte_block_num < min(block_num_h, block_num_w)) {
    drawLongShadow(offset_w, offset_h, color(220, 10, 0, CONFIG.SHADOW_OPACITY), CONFIG.SHADOW_ANGLE);
  }

  // First pass: Draw only NORMAL blocks (skip CORNER, BORDER, MATTE)
  for (let j = 0; j < block_num_h; j++) {
    for (let i = 0; i < block_num_w; i++) {
      let x = offset_w + i * block_size;
      let y = offset_h + j * block_size;
      let block_pos = getBlockPosition(i, j, block_num_w - 1, block_num_h - 1);
      if (block_pos === "NORMAL") {
        drawBlock(block_pos, x, y, block_size);
      }
    }
  }
  
  // Second pass: Draw CORNER, BORDER, and MATTE blocks on top
  for (let j = 0; j < block_num_h; j++) {
    for (let i = 0; i < block_num_w; i++) {
      let x = offset_w + i * block_size;
      let y = offset_h + j * block_size;
      let block_pos = getBlockPosition(i, j, block_num_w - 1, block_num_h - 1);
      if (block_pos !== "NORMAL") {
        drawBlock(block_pos, x, y, block_size);
      }
    }
  }
  drawFooterText();
}

/**
 * p5.js event function - called when the browser window is resized
 * Recreates the canvas and shadow graphics to match the new window dimensions
 */
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

/**
 * Calculates the angle for shadow direction based on mouse position
 * Currently uses mouse position instead of time-based calculation
 * @returns {number} Angle in radians from center of screen to mouse position
 */
function getAngle() {
  // let h = hour();
  // let t = 0;
  // if(h < 8){
  //   t =  - PI;
  // }
  // if(h >= 8 && h <= 18){
  //   t = map(h,8,18,PI/8,PI-PI/8);
  // }
  let t = atan2(mouseY - height / 2, mouseX - width / 2);
  return t;
}

/**
 * Draws a long shadow effect extending from the grid boundaries
 * Creates a geometric shadow that extends beyond the visible canvas
 * @param {number} offset_w - Horizontal offset of the grid
 * @param {number} offset_h - Vertical offset of the grid
 * @param {p5.Color} col - Color of the shadow
 * @param {number} theta - Angle of the shadow direction (default: PI/4)
 */
function drawLongShadow(offset_w, offset_h, col, theta = PI / 4) {
  let p1 = createVector(width - offset_w, offset_h);
  let p2 = createVector(width - offset_w, height - offset_h);
  let p3 = createVector(offset_w, height - offset_h);
  let p4 = createVector(offset_w, offset_h);
  let p = [];
  if (theta < PI / 2) {
    p = [p1, p2, p3];
  } else {
    p = [p2, p3, p4];
  }
  if (theta < 0) {
    if (theta < -PI / 2) {
      p = [p3, p4, p1];
    } else {
      p = [p4, p1, p2];
    }
  }
  fill(col);
  noStroke();
  beginShape();
  vertex(p[0].x, p[0].y);
  vertex(p[1].x, p[1].y);
  vertex(p[2].x, p[2].y);
  p[0].add(p5.Vector.fromAngle(theta).mult(max(width, height)));
  p[1].add(
    p5.Vector.fromAngle(theta).mult(
      max(width, height) + sqrt(sq(width / 2) + sq(height / 2))
    )
  );
  p[2].add(p5.Vector.fromAngle(theta).mult(max(width, height)));
  vertex(p[2].x, p[2].y);
  vertex(p[1].x, p[1].y);
  vertex(p[0].x, p[0].y);
  endShape();
}

/**
 * Determines the position type of a block within the grid layout
 * Categorizes blocks as corners, borders, matte areas, or normal blocks
 * @param {number} i - Column index of the block
 * @param {number} j - Row index of the block
 * @param {number} iMax - Maximum column index
 * @param {number} jMax - Maximum row index
 * @returns {string} Block position type: "CORNER", "BORDER", "MATTE", or "NORMAL"
 */
function getBlockPosition(i, j, iMax, jMax) {
  const bw = CONFIG.BORDER_WIDTH;
  if (
    (i < bw && j < bw) ||
    (i < bw && j > jMax - bw) ||
    (i > iMax - bw && j > jMax - bw) ||
    (i > iMax - bw && j < bw)
  ) {
    return "CORNER";
  } else if (i < bw || j > jMax - bw || i > iMax - bw || j < bw) {
    return "BORDER";
  } else if (
    i < matte_block_num + bw ||
    j > jMax - matte_block_num - bw ||
    i > iMax - matte_block_num - bw ||
    j < matte_block_num + bw
  ) {
    return "MATTE";
  } else {
    return "NORMAL";
  }
}

/**
 * Draws individual blocks with different styles based on their position
 * Renders corners/borders as dark blocks, matte as white, and normal blocks with patterns
 * @param {string} block_pos - Position type from getBlockPosition()
 * @param {number} x - X coordinate for the block
 * @param {number} y - Y coordinate for the block
 * @param {number} block_size - Size of the block in pixels
 */
function drawBlock(block_pos, x, y, block_size) {
  push();
  switch (block_pos) {
    case "CORNER":
      fill(0, 0, 20);
      noStroke();
      rect(x, y, block_size+1);
      break;
    case "BORDER":
      noStroke();
      fill(0, 0, 20);
      rect(x, y, block_size+1);
      break;
    case "MATTE":
      noStroke();
      fill(0, 0, 100);
      rect(x, y, block_size+1);
      break;
    case "NORMAL":
      noStroke();
      let n = int(
        noise(
          width / 2 + (x / width),
          height / 2 + (y / height),
          frameCount / CONFIG.ANIMATION_SPEED
        ) *
          shapes_arr.length *
          2
      );
      push();
      translate(x + block_size / 2, y + block_size / 2);
      rotate((TWO_PI / CONFIG.ROTATION_STEPS) * int(random(CONFIG.ROTATION_STEPS)));
      
      let baseColor = palette[n % palette.length];
      fill(baseColor);
      
      // Use morphing shape function for advanced effects
      drawShape(block_size+1, CONFIG.SHAPE_LAYERS, n%shapes_arr.length);
      pop();
      break;
  }
  pop();
}

let colorScheme = [
  {
    name: "#0 Benedictus",
    colors: ["#F27EA9", "#366CD9", "#5EADF2", "#636E73", "#F2E6D8"],
  },
  {
    name: "#1 Cross",
    colors: ["#D962AF", "#58A6A6", "#8AA66F", "#F29F05", "#F26D6D"],
  },
  {
    name: "#2 Demuth",
    colors: ["#222940", "#D98E04", "#F2A950", "#BF3E21", "#F2F2F2"],
  },
  {
    name: "#3 Hiroshige",
    colors: ["#1B618C", "#55CCD9", "#F2BC57", "#F2DAAC", "#F24949"],
  },
  {
    name: "#4 Hokusai Blue",
    colors: ["#023059", "#459DBF", "#87BF60", "#D9D16A", "#F2F2F2"],
  },
  {
    name: "#5 Java",
    colors: ["#632973", "#02734A", "#F25C05", "#F29188", "#F2E0DF"],
  },
  {
    name: "#6 Kandinsky",
    colors: ["#8D95A6", "#0A7360", "#F28705", "#D98825", "#F2F2F2"],
  },
  {
    name: "#7 Monet",
    colors: ["#4146A6", "#063573", "#5EC8F2", "#8C4E03", "#D98A29"],
  },
  {
    name: "#8 Nizami",
    colors: ["#034AA6", "#72B6F2", "#73BFB1", "#F2A30F", "#F26F63"],
  },
  {
    name: "#9 Renoir",
    colors: ["#303E8C", "#F2AE2E", "#F28705", "#D91414", "#F2F2F2"],
  },
  {
    name: "#10 VanGogh",
    colors: ["#424D8C", "#84A9BF", "#C1D9CE", "#F2B705", "#F25C05"],
  },
  {
    name: "#11 Mono",
    colors: ["#D9D7D8", "#3B5159", "#5D848C", "#7CA2A6", "#262321"],
  },
  {
    name: "#12 RiverSide",
    colors: ["#906FA6", "#025951", "#252625", "#D99191", "#F2F2F2"],
  },
  {
    name: "#13 Cyberpunk",
    colors: ["#FF006E", "#8338EC", "#3A86FF", "#06FFA5", "#FFBE0B"],
  },
  {
    name: "#14 Sunset",
    colors: ["#FF9A8B", "#F78CA0", "#F9748F", "#FD868C", "#FE9A8B"],
  },
  {
    name: "#15 Ocean",
    colors: ["#003f5c", "#2f4b7c", "#665191", "#a05195", "#d45087"],
  },
  {
    name: "#16 Forest",
    colors: ["#355E3B", "#228B22", "#32CD32", "#9ACD32", "#ADFF2F"],
  },
  {
    name: "#17 Ivy",
    colors: ["#1E3F20", "#345830", "#5A8C42", "#98BF64", "#D0DDAF"],
  },
  {
    name: "#18 Jade",
    colors: ["#084C61", "#177E89", "#49A9A1", "#9DCDC0", "#E5F1EF"],
  },
  {
    name: "#19 Gold",
    colors: ["#654C0F", "#9B7506", "#E5A810", "#F7CE5B", "#FEEEB7"],
  },
  {
    name: "#20 Autumn",
    colors: ["#6F1D1B", "#BB9457", "#432818", "#99582A", "#FFE6A7"],
  },
  {
    name: "#21 Minimalist BW",
    colors: ["#FFFFFF", "#F5F5F5", "#EBEBEB", "#DCDCDC", "#000000"],
  },
  {
    name: "#22 Earth & Sky",
    colors: ["#87CEEB", "#4682B4", "#556B2F", "#8B4513", "#F5DEB3"],
  },
  {
    name: "#23 Vintage Modern",
    colors: ["#EAE0D5", "#C6BBAF", "#596E79", "#212D40", "#11151C"],
  },
  {
    name: "#24 Pastel Dream",
    colors: ["#FFC0CB", "#B19CD9", "#77DD77", "#FFD1DC", "#FDFD96"],
  },
  {
    name: "#25 Deep Space",
    colors: ["#000033", "#000066", "#4B0082", "#8A2BE2", "#E6E6FA"],
  },
  {
    name: "#26 Neon Pop",
    colors: ["#39FF14", "#FF2079", "#08F7FE", "#F5D300", "#FF073A"],
  },
  {
    name: "#27 Grayscale",
    colors: ["#222222", "#555555", "#888888", "#BBBBBB", "#EEEEEE"],
  },
  {
    name: "#28 Jewel Tones",
    colors: ["#6A0572", "#AB83A1", "#2E1A47", "#2699A6", "#44AF69"],
  },
  {
    name: "#29 Summer Breeze",
    colors: ["#FFB347", "#FF6961", "#FFD1DC", "#77DD77", "#AEC6CF"],
  },
  {
    name: "#30 Retro Arcade",
    colors: ["#FF6F61", "#6B5B95", "#88B04B", "#F7CAC9", "#92A8D1"],
  },
  {
    name: "#31 Iceberg",
    colors: ["#073B4C", "#118AB2", "#06D6A0", "#FFD166", "#EF476F"],
  },
  {
    name: "#32 Moss",
    colors: ["#556B2F", "#8FBC8F", "#B2BABB", "#D5DBDB", "#FDFEFE"],
  },
  {
    name: "#33 Citrus",
    colors: ["#FFB300", "#FF773D", "#FF5252", "#FFE066", "#C1F0B8"],
  },
  {
    name: "#34 Desert",
    colors: ["#C19A6B", "#FFE4B5", "#D2B48C", "#DEB887", "#A0522D"],
  },
  {
    name: "#35 Aurora",
    colors: ["#140152", "#3D087B", "#8D6FC1", "#35A7FF", "#70FFDA"],
  },
  {
    name: "#36 B",
    colors: ["#D5DBDB", "#222222", "#222222", "#222222", "#222222"],
  },
  {
    name: "#37 W",
    colors: ["#140152", "#3D087B", "#8D6FC1", "#35A7FF", "#70FFDA"],
  },
];

/**
 * Draws various geometric shapes with layered patterns and colors
 * Creates complex patterns by drawing multiple scaled versions of shapes
 * @param {number} d - Diameter/size of the shape
 * @param {number} repeat_num - Number of layers to create the pattern effect
 * @param {number} shape_num - Index determining which shape to draw (0-23)
 */
function drawShape(d, repeat_num, shape_num) {
	let v = 0;
  push();
  switch (shape_num) {
    case shapes_arr[0]: // Square (center mode - from center point) - GEOMETRIC
      rectMode(CENTER);
      for (let scl = 1; scl > 0; scl -= 1 / repeat_num) {
				fill(palette[(shape_num+v++)%palette.length]);
        rect(0, 0, d * scl, d * scl);
      }
      break;
    case shapes_arr[1]: // Square (corner mode - from top-left) - GEOMETRIC
      translate(-d / 2, -d / 2);
      rectMode(CORNER);
      for (let scl = 1; scl > 0; scl -= 1 / repeat_num) {
				fill(palette[(shape_num+v++)%palette.length]);
        rect(0, 0, d * scl, d * scl);
      }
      break;
    case shapes_arr[2]: // Stepped pyramid (concentric squares with gaps) - GEOMETRIC
      for (let scl = 1; scl > 0; scl -= 1 / repeat_num) {
        fill(palette[(shape_num+v++)%palette.length]);
        rectMode(CENTER);
        let size = d * scl;
        let gap = size / (repeat_num + 1);
        rect(0, 0, size, size);
        // Add stepped effect
        if (scl < 0.8) {
          fill(palette[(shape_num+v++)%palette.length]);
          rect(gap/2, gap/2, size - gap, size - gap);
        }
      }
      break;
    case shapes_arr[3]: // Hollow square (square with cutout center) - GEOMETRIC
      for (let scl = 1; scl > 0; scl -= 1 / repeat_num) {
        fill(palette[(shape_num+v++)%palette.length]);
        rectMode(CENTER);
        let size = d * scl;
        rect(0, 0, size, size);
        // Cut out center square
        fill(palette[(shape_num+v++)%palette.length]);
        rect(0, 0, size * 0.5, size * 0.5);
      }
      break;
    case shapes_arr[4]: // L-shaped tetromino (creates interlocking tile patterns) - GEOMETRIC
      for (let scl = 1; scl > 0; scl -= 1 / repeat_num) {
        fill(palette[(shape_num+v++)%palette.length]);
        let size = (d / 2) * scl;
        rectMode(CENTER);
        // Draw L-shape using two rectangles
        rect(-size/4, 0, size/2, size*2); // Vertical part
        rect(size/4, size/2, size, size/2); // Horizontal part
      }
      break;
    case shapes_arr[5]: // Hourglass/bowtie (two triangles touching at points) - GEOMETRIC
      for (let scl = 1; scl > 0; scl -= 1 / repeat_num) {
        fill(palette[(shape_num+v++)%palette.length]);
        let size = (d / 2) * scl;
        // Upper triangle
        triangle(-size, -size, size, -size, 0, 0);
        // Lower triangle
        triangle(-size, size, size, size, 0, 0);
      }
      break;
    case shapes_arr[6]: // Curved wave segment (creates flowing organic patterns) - ORGANIC
      for (let scl = 1; scl > 0; scl -= 1 / repeat_num) {
        fill(palette[(shape_num+v++)%palette.length]);
        let size = (d / 2) * scl;
        beginShape();
        // Create a curved wave/spiral segment using bezier curves
        vertex(-size, -size/2);
        bezierVertex(-size/2, -size, 0, -size/2, size/2, -size/4);
        bezierVertex(size, 0, size/2, size/2, 0, size);
        bezierVertex(-size/4, size/2, -size/2, size/4, -size, -size/2);
        endShape(CLOSE);
      }
      break;
    case shapes_arr[7]: // Checkerboard pattern (2x2 grid) - GEOMETRIC
      for (let scl = 1; scl > 0; scl -= 1 / repeat_num) {
        fill(palette[(shape_num+v++)%palette.length]);
        let size = (d / 2) * scl;
        rectMode(CENTER);
        // Draw 2x2 checkerboard
        rect(-size/2, -size/2, size, size);
        rect(size/2, size/2, size, size);
        fill(palette[(shape_num+v++)%palette.length]);
        rect(size/2, -size/2, size, size);
        rect(-size/2, size/2, size, size);
      }
      break;
    case shapes_arr[8]: // Checkerboard pattern (2x2 grid) - GEOMETRIC
      for (let scl = 1; scl > 0; scl -= 1 / repeat_num) {
        fill(palette[(shape_num+v++)%palette.length]);
        let size = (d / 2) * scl;
        rectMode(CENTER);
        // Draw 2x2 checkerboard
        rect(-size/2, -size/2, size, size);
        rect(size/3, size/3, size, size);
        fill(palette[(shape_num+v++)%palette.length]);
        rect(size/2, -size/2, size, size);
        rect(-size/2, size/2, size, size);
      }
      break;
    case shapes_arr[9]: // Hexagon (perfect tessellation shape) - GEOMETRIC
      for (let scl = 1; scl > 0; scl -= 1 / repeat_num) {
        fill(palette[(shape_num+v++)%palette.length]);
        let radius = (d / 2) * scl;
        beginShape();
        for (let i = 0; i < 6; i++) {
          let angle = TWO_PI / 6 * i;
          let x = cos(angle) * radius;
          let y = sin(angle) * radius;
          vertex(x, y);
        }
        endShape(CLOSE);
      }
      break;
    case shapes_arr[10]: // Interlocking S-curve (creates flowing connections) - ORGANIC
      for (let scl = 1; scl > 0; scl -= 1 / repeat_num) {
        fill(palette[(shape_num+v++)%palette.length]);
        let size = (d / 2) * scl;
        beginShape();
        // Create an S-curve that connects well with adjacent tiles
        vertex(-size, -size);
        bezierVertex(-size/2, -size, -size/2, -size/2, 0, -size/2);
        bezierVertex(size/2, -size/2, size/2, 0, size, 0);
        bezierVertex(size/2, 0, size/2, size/2, 0, size/2);
        bezierVertex(-size/2, size/2, -size/2, size, -size, size);
        vertex(-size, size);
        vertex(-size, -size);
        endShape(CLOSE);
      }
      break;
    case shapes_arr[11]: // Puzzle piece (organic interlocking pattern) - ORGANIC
      for (let scl = 1; scl > 0; scl -= 1 / repeat_num) {
        fill(palette[(shape_num+v++)%palette.length]);
        let size = (d / 2) * scl;
        beginShape();
        // Create a puzzle piece with knobs and indentations
        vertex(-size, -size);
        vertex(size/4, -size);
        // Top knob
        bezierVertex(size/2, -size, size/2, -size/2, size/4, -size/2);
        vertex(size, -size/2);
        vertex(size, size/4);
        // Right knob
        bezierVertex(size, size/2, size/2, size/2, size/2, size/4);
        vertex(size/2, size);
        vertex(-size/4, size);
        // Bottom indentation
        bezierVertex(-size/2, size, -size/2, size/2, -size/4, size/2);
        vertex(-size, size/2);
        vertex(-size, -size/4);
        // Left indentation
        bezierVertex(-size, -size/2, -size/2, -size/2, -size/2, -size/4);
        vertex(-size/2, -size);
        vertex(-size, -size);
        endShape(CLOSE);
      }
      break;
    case shapes_arr[12]: // Plus/cross (simple cross shape) - GEOMETRIC
      for (let scl = 1; scl > 0; scl -= 1 / repeat_num) {
        fill(palette[(shape_num+v++)%palette.length]);
        rectMode(CENTER);
        rect(0, 0, d * scl, (d / 3) * scl);
        rect(0, 0, (d / 3) * scl, d * scl);
      }
      break;
    case shapes_arr[13]: // Complex geometric cross (plus with notches) - GEOMETRIC
      for (let scl = 1; scl > 0; scl -= 1 / repeat_num) {
				fill(palette[(shape_num+v++)%palette.length]);
        let e = (d / 2) * scl;
        beginShape();
        vertex(e, -e / 2);
        vertex(e, e / 2);
        vertex(e / 2, e / 2);
        vertex(e / 2, e);
        vertex(-e / 2, e);
        vertex(-e / 2, e / 2);
        vertex(-e, e / 2);
        vertex(-e, -e / 2);
        vertex(-e / 2, -e / 2);
        vertex(-e / 2, -e);
        vertex(e / 2, -e);
        vertex(e / 2, -e / 2);
        endShape(CLOSE);
      }
      break;
    case shapes_arr[14]: // Rotated complex cross (45° rotated plus with notches) - GEOMETRIC
      rotate(PI / 4);
      scale(1 / sqrt(2));
      for (let scl = 1; scl > 0; scl -= 1 / repeat_num) {
				fill(palette[(shape_num+v++)%palette.length]);
        let e = (d / 2) * scl;
        beginShape();
        vertex(e, -e / 2);
        vertex(e, e / 2);
        vertex(e / 2, e / 2);
        vertex(e / 2, e);
        vertex(-e / 2, e);
        vertex(-e / 2, e / 2);
        vertex(-e, e / 2);
        vertex(-e, -e / 2);
        vertex(-e / 2, -e / 2);
        vertex(-e / 2, -e);
        vertex(e / 2, -e);
        vertex(e / 2, -e / 2);
        endShape(CLOSE);
      }
      break;
    case shapes_arr[15]: // Grid of dots (3x3 dot pattern) - GEOMETRIC
      for (let scl = 1; scl > 0; scl -= 1 / repeat_num) {
        fill(palette[(shape_num+v++)%palette.length]);
        let dotSize = (d / 8) * scl;
        let spacing = (d / 4) * scl;
        // Create 3x3 grid of dots
        for (let i = -1; i <= 1; i++) {
          for (let j = -1; j <= 1; j++) {
            ellipse(i * spacing, j * spacing, dotSize, dotSize);
          }
        }
      }
      break;
    case shapes_arr[16]: // Quad chevrons (four chevron patterns in corners) - COMPOSITE/GEOMETRIC
      push();
      translate(-d / 2 / 2, -d / 2 / 2);
      drawShape(d / 2, repeat_num, shapes_arr[4]); // Use chevron shape
      pop();
      push();
      translate(+d / 2 / 2, -d / 2 / 2);
      drawShape(d / 2, repeat_num, shapes_arr[4]);
      pop();
      push();
      translate(+d / 2 / 2, +d / 2 / 2);
      drawShape(d / 2, repeat_num, shapes_arr[4]);
      pop();
      push();
      translate(-d / 2 / 2, +d / 2 / 2);
      drawShape(d / 2, repeat_num, shapes_arr[4]);
      pop();
      break;
    case shapes_arr[17]: // Quad squares (four squares in corners) - COMPOSITE/GEOMETRIC
      push();
      translate(-d / 2 / 2, -d / 2 / 2);
      drawShape(d / 2, repeat_num, shapes_arr[1]); // Use corner square
      pop();
      push();
      translate(+d / 2 / 2, -d / 2 / 2);
      drawShape(d / 2, repeat_num, shapes_arr[1]);
      pop();
      push();
      translate(+d / 2 / 2, +d / 2 / 2);
      drawShape(d / 2, repeat_num, shapes_arr[1]);
      pop();
      push();
      translate(-d / 2 / 2, +d / 2 / 2);
      drawShape(d / 2, repeat_num, shapes_arr[1]);
      pop();
      break;
    case shapes_arr[18]: // Quad centered squares (four center-mode squares) - COMPOSITE/GEOMETRIC
      push();
      translate(-d / 2 / 2, -d / 2 / 2);
      drawShape(d / 2, repeat_num, shapes_arr[0]); // Use center square
      pop();
      push();
      translate(+d / 2 / 2, -d / 2 / 2);
      drawShape(d / 2, repeat_num, shapes_arr[0]);
      pop();
      push();
      translate(+d / 2 / 2, +d / 2 / 2);
      drawShape(d / 2, repeat_num, shapes_arr[0]);
      pop();
      push();
      translate(-d / 2 / 2, +d / 2 / 2);
      drawShape(d / 2, repeat_num, shapes_arr[0]);
      pop();
      break;
    case shapes_arr[19]: // Diamond/rhombus (rotated square) - GEOMETRIC
      for (let scl = 1; scl > 0; scl -= 1 / repeat_num) {
				fill(palette[(shape_num+v++)%palette.length]);
        quad(
          0,
          (-d / 2) * scl,
          (d / 2) * scl,
          0,
          0,
          (d / 2) * scl,
          (-d / 2) * scl,
          0
        );
      }
      break;
    case shapes_arr[20]: // Simple diamond (same as shape 19) - GEOMETRIC
      for (let scl = 1; scl > 0; scl -= 1 / repeat_num) {
        fill(palette[(shape_num+v++)%palette.length]);
        quad(0, (-d / 2) * scl, (d / 2) * scl, 0, 0, (d / 2) * scl, (-d / 2) * scl, 0);
      }
      break;
    case shapes_arr[21]: // Right triangle (bottom-right orientation) - TRIANGULAR
      for (let scl = 1; scl > 0; scl -= 1 / repeat_num) {
				fill(palette[(shape_num+v++)%palette.length]);
        triangle(
          (-d / 2) * scl,
          (-d / 2) * scl,
          (-d / 2) * scl,
          (d / 2) * scl,
          (d / 2) * scl,
          (d / 2) * scl
        );
      }
      break;
    case shapes_arr[22]: // Right triangle (corner at origin) - TRIANGULAR
      translate(-d / 2, -d / 2);
      for (let scl = 1; scl > 0; scl -= 1 / repeat_num) {
				fill(palette[(shape_num+v++)%palette.length]);
        triangle(0, 0, d * scl, 0, 0, d * scl);
      }
      break;
    case shapes_arr[23]: // Expanding corner triangle (grows from corner) - TRIANGULAR
      push();
      translate(-d / 2, -d / 2);
      let p23 = createVector(0, 0);
      let p23_1 = createVector(d, 0);
      let p23_2 = createVector(d, d);
      for (let scl = 1; scl > 0; scl -= 1 / repeat_num) {
        let ap = p5.Vector.lerp(p23, p23_1, scl);
        let bp = p5.Vector.lerp(p23, p23_2, scl);
				fill(palette[(shape_num+v++)%palette.length]);
        triangle(p23.x, p23.y, ap.x, ap.y, bp.x, bp.y);
      }
      pop();
      break;
    case shapes_arr[24]: // Upward-pointing triangle - TRIANGULAR
      for (let scl = 1; scl > 0; scl -= 1 / repeat_num) {
				fill(palette[(shape_num+v++)%palette.length]);
        triangle(
          (-d / 2) * scl,
          d / 2,
          0,
          -d / 2 + d * (1 - scl),
          (d / 2) * scl,
          d / 2
        );
      }
      break;
    case shapes_arr[25]: // Double triangle (up and down) - TRIANGULAR
      for (let scl = 1; scl > 0; scl -= 1 / repeat_num) {
				fill(palette[(shape_num+v++)%palette.length]);
        triangle((-d / 2) * scl, 0, (d / 2) * scl, 0, 0, (d / 2) * scl);
        triangle(
          (-d / 2) * scl,
          -d / 2,
          (d / 2) * scl,
          -d / 2,
          0,
          (d / 2) * scl - d / 2
        );
      }
      break;
    case shapes_arr[26]: // Double corner triangles (opposite corners) - TRIANGULAR
      translate(-d / 2, -d / 2);
      for (let scl = 1; scl > 0; scl -= 1 / repeat_num) {
				fill(palette[(shape_num+v++)%palette.length]);
        triangle(0, 0, d * scl, 0, 0, d * scl);
        triangle(d, d, d - scl * d, d, d, d - scl * d);
      }
      break;
    case shapes_arr[27]: // Quad triangles (four triangles in corners) - TRIANGULAR/COMPOSITE
      push();
      translate(-d / 2 / 2, -d / 2 / 2);
      drawShape(d / 2, repeat_num, shapes_arr[22]); // Use right triangle
      pop();
      push();
      translate(+d / 2 / 2, -d / 2 / 2);
      drawShape(d / 2, repeat_num, shapes_arr[22]);
      pop();
      push();
      translate(+d / 2 / 2, +d / 2 / 2);
      drawShape(d / 2, repeat_num, shapes_arr[22]);
      pop();
      push();
      translate(-d / 2 / 2, +d / 2 / 2);
      drawShape(d / 2, repeat_num, shapes_arr[22]);
      pop();
      break;
    case shapes_arr[28]: // 4-pointed star (pointed cross) - SHARP/STAR
      for (let scl = 1; scl > 0; scl -= 1 / repeat_num) {
				fill(palette[(shape_num+v++)%palette.length]);
        beginShape();
        for (let angle = 0; angle < TWO_PI; angle += TWO_PI / 4) {
          let a = radians(20);
          let angle_a = angle - a;
          let angle_b = angle + a;
          let x1 = (((cos(angle_a) * d) / 2) * scl) / cos(a);
          let y1 = (((sin(angle_a) * d) / 2) * scl) / cos(a);
          let x2 = (((cos(angle_b) * d) / 2) * scl) / cos(a);
          let y2 = (((sin(angle_b) * d) / 2) * scl) / cos(a);
          vertex(x1, y1);
          vertex(x2, y2);
        }
        endShape(CLOSE);
      }
      break;
    case shapes_arr[29]: // 5-pointed star (classic star shape) - SHARP/STAR
      for (let scl = 1; scl > 0; scl -= 1 / repeat_num) {
        fill(palette[(shape_num+v++)%palette.length]);
        beginShape();
        for (let angle = 0; angle < TWO_PI; angle += TWO_PI / 10) {
          let r = (angle % (TWO_PI / 5) < TWO_PI / 10) ? (d / 2) * scl : (d / 4) * scl;
          vertex(cos(angle) * r, sin(angle) * r);
        }
        endShape(CLOSE);
      }
      break;
  }
  pop();
}

function drawFooterText() {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const d = new Date();
  const dayName = days[d.getDay()];
  const dateString = `${dayName}, ${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
  const timeString = d.toLocaleTimeString('en-US', { hour12: false });
  const fullDateTimeString = `${dateString} ${timeString}`;

  // Use either fixed positioning or block-relative positioning
  let xLeft, yPos, xRight, textSizeValue;
  
  if (CONFIG.USE_FIXED_FOOTER_SIZE) {
    // Fixed pixel-based positioning and sizing
    xLeft = CONFIG.FOOTER_MARGIN_X;
    yPos = height - CONFIG.FOOTER_MARGIN_Y;
    xRight = width - CONFIG.FOOTER_MARGIN_X;
    textSizeValue = CONFIG.FOOTER_TEXT_SIZE;
  } else {
    // Block-relative positioning and sizing (original behavior)
    xLeft = offset_w + block_size / 2;
    yPos = offset_h + block_num_h * block_size - block_size / 2;
    xRight = offset_w + block_num_w * block_size - block_size / 2;
    textSizeValue = block_size * CONFIG.TEXT_SIZE_RATIO;
  }

  fill(0, 0, 100); // White text for contrast
  textSize(textSizeValue);
  
  // Draw date and time on the left
  textAlign(LEFT, BOTTOM);
  text(fullDateTimeString, xLeft, yPos);

  // Draw version text on the right
  textAlign(RIGHT, BOTTOM);
  text("pirouette v.03 ultrathin", xRight, yPos);
}
