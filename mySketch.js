let shapes_arr = [...Array(24)].map((_, i) => i); //=> [ 0, 1, 2, 3, 4 ]
let block_size;
let matte_block_num = 2;
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
  shadowGraphics = createShadowGraphics(width, height);
  rs = width * height;
  // noLoop();
}

let window_num_p;
let window_w_p;
let window_h_p;
let window_margin_p;

/**
 * Creates a graphics buffer with window shadows for the background effect
 * @param {number} w - Width of the graphics buffer
 * @param {number} h - Height of the graphics buffer
 * @returns {p5.Graphics} Graphics object containing the shadow pattern
 */
function createShadowGraphics(w, h) {
  let g = createGraphics(w, h);
  let window_num = int(random(3,8));
  let window_w = w / 10;
  let window_h = h / 5;
  let window_margin = min(window_w, window_h) / 3;
  window_num_p = window_num;
  window_w_p = window_w;
  window_h_p = window_h;
  window_margin_p = window_margin;
	
  g.background(150);
  g.randomSeed(rs);
  let shadowPoint = createVector(
    (g.random() * g.width) / 2,
    (g.random() * g.height) / 2
  );
  g.push();
  g.translate(shadowPoint.x, shadowPoint.y);
  g.shearY(PI / 12);
  g.erase();
  for (let j = 0; j < window_num; j++) {
    for (let i = 0; i < window_num; i++) {
      let x = i * (window_w + window_margin);
      let y = j * (window_h + window_margin);
      g.rect(x, y, window_w, window_h);
    }
  }
  g.noErase();

  return g;
}

/**
 * Updates the shadow graphics based on the current time to simulate daylight changes
 * Creates a dynamic shadow effect that changes brightness throughout the day
 * @param {p5.Graphics} g - Graphics object to update
 * @returns {p5.Graphics} Updated graphics object with time-based shadows
 */
function shadowTimer(g) {
  let totalSeconds = hour() * 3600 + minute() * 60 + second();
  let dayProgress = totalSeconds / 86400.0; // from 0.0 to 1.0
  let brightness = 20 + (130 * sin(PI * dayProgress));
	
  g.background(brightness);
  g.erase();
  for (let j = 0; j < window_num_p; j++) {
    for (let i = 0; i < window_num_p; i++) {
      let x = i * (window_w_p + window_margin_p);
      let y = j * (window_h_p + window_margin_p);
      g.rect(x, y, window_w_p, window_h_p);
    }
  }
  g.noErase();
	return g;
}

/**
 * p5.js draw function - runs continuously in a loop
 * Main rendering function that draws the grid of blocks with patterns and applies shadow effects
 */
function draw() {
  blendMode(BLEND);

  background(0, 0, 80);
  randomSeed(width * height);
  palette = shuffle(random(colorScheme).colors);

  block_size = 30;
  offset_w = width / 10;
  block_num_w = int((width - offset_w * 2) / block_size);
  offset_w = (width - block_size * block_num_w) / 2;

  offset_h = offset_w;
  block_num_h = int((height - offset_h * 2) / block_size);
  offset_h = (height - block_size * block_num_h) / 2;

  if (matte_block_num < min(block_num_h, block_num_w)) {
    drawLongShadow(offset_w, offset_h, color(220, 10, 0, 10), PI / 8);
  }

  for (let j = 0; j < block_num_h; j++) {
    for (let i = 0; i < block_num_w; i++) {
      let x = offset_w + i * block_size;
      let y = offset_h + j * block_size;
      let block_pos = getBlockPosition(i, j, block_num_w - 1, block_num_h - 1);
      drawBlock(block_pos, x, y, block_size);
    }
  }
  blendMode(MULTIPLY);
  push();
  drawingContext.filter = "blur(30px)";
  shadowGraphics = shadowTimer(shadowGraphics)
  image(
    shadowGraphics,
    -30,
    -30,
    shadowGraphics.width + 60,
    shadowGraphics.height + 60
  );
  pop();
}

/**
 * p5.js event function - called when the browser window is resized
 * Recreates the canvas and shadow graphics to match the new window dimensions
 */
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  shadowGraphics = createShadowGraphics(width, height);
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
  if (
    (i == 0 && j == 0) ||
    (i == 0 && j == jMax) ||
    (i == iMax && j == jMax) ||
    (i == iMax && j == 0)
  ) {
    return "CORNER";
  } else if (i == 0 || j == jMax || i == iMax || j == 0) {
    return "BORDER";
  } else if (
    i < matte_block_num ||
    j > jMax - matte_block_num ||
    i > iMax - matte_block_num ||
    j < matte_block_num
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
          frameCount / 400
        ) *
          shapes_arr.length *
          2
      );
      push();
      translate(x + block_size / 2, y + block_size / 2);
      rotate((TWO_PI / 4) * int(random(4)));
      fill(palette[n % palette.length]);
      drawShape(block_size+1, 3, n%shapes_arr.length)
      pop();
      break;
  }
  pop();
}

let colorScheme = [
  {
    name: "Benedictus",
    colors: ["#F27EA9", "#366CD9", "#5EADF2", "#636E73", "#F2E6D8"],
  },
  {
    name: "Cross",
    colors: ["#D962AF", "#58A6A6", "#8AA66F", "#F29F05", "#F26D6D"],
  },
  {
    name: "Demuth",
    colors: ["#222940", "#D98E04", "#F2A950", "#BF3E21", "#F2F2F2"],
  },
  {
    name: "Hiroshige",
    colors: ["#1B618C", "#55CCD9", "#F2BC57", "#F2DAAC", "#F24949"],
  },
  {
    name: "Hokusai",
    colors: ["#074A59", "#F2C166", "#F28241", "#F26B5E", "#F2F2F2"],
  },
  {
    name: "Hokusai Blue",
    colors: ["#023059", "#459DBF", "#87BF60", "#D9D16A", "#F2F2F2"],
  },
  {
    name: "Java",
    colors: ["#632973", "#02734A", "#F25C05", "#F29188", "#F2E0DF"],
  },
  {
    name: "Kandinsky",
    colors: ["#8D95A6", "#0A7360", "#F28705", "#D98825", "#F2F2F2"],
  },
  {
    name: "Monet",
    colors: ["#4146A6", "#063573", "#5EC8F2", "#8C4E03", "#D98A29"],
  },
  {
    name: "Nizami",
    colors: ["#034AA6", "#72B6F2", "#73BFB1", "#F2A30F", "#F26F63"],
  },
  {
    name: "Renoir",
    colors: ["#303E8C", "#F2AE2E", "#F28705", "#D91414", "#F2F2F2"],
  },
  {
    name: "VanGogh",
    colors: ["#424D8C", "#84A9BF", "#C1D9CE", "#F2B705", "#F25C05"],
  },
  {
    name: "Mono",
    colors: ["#D9D7D8", "#3B5159", "#5D848C", "#7CA2A6", "#262321"],
  },
  {
    name: "RiverSide",
    colors: ["#906FA6", "#025951", "#252625", "#D99191", "#F2F2F2"],
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
  // let shape_num = int(random(16));
	let v = 0;
  push();
  switch (shape_num) {
    case shapes_arr[0]:
      translate(-d / 2, -d / 2);
      for (let scl = 1; scl > 0; scl -= 1 / repeat_num) {
				fill(palette[(shape_num+v++)%palette.length]);
        arc(0, 0, d * 2 * scl, d * 2 * scl, 0, PI / 2, PIE);
      }
      break;
    case shapes_arr[1]:
      translate(-d / 2, -d / 2);
      for (let scl = 1; scl > 0; scl -= 1 / repeat_num) {
				fill(palette[(shape_num+v++)%palette.length]);
        triangle(0, 0, d * scl, 0, 0, d * scl);
      }
      break;
    case shapes_arr[2]:
      translate(-d / 2, -d / 2);
      rectMode(CORNER);
      for (let scl = 1; scl > 0; scl -= 1 / repeat_num) {
				fill(palette[(shape_num+v++)%palette.length]);
        rect(0, 0, d * scl, d * scl);
      }
      break;
    case shapes_arr[3]:
      rectMode(CENTER);
      for (let scl = 1; scl > 0; scl -= 1 / repeat_num) {
				fill(palette[(shape_num+v++)%palette.length]);
        rect(0, 0, d * scl, d * scl);
      }
      break;
    case shapes_arr[4]:
      for (let scl = 1; scl > 0; scl -= 1 / repeat_num) {
				fill(palette[(shape_num+v++)%palette.length]);
        ellipse(0, 0, d * scl, d * scl);
      }
      break;
    case shapes_arr[5]:
      translate(-d / 2, -d / 2);
      rectMode(CORNER);
      for (let scl = 1; scl > 0; scl -= 1 / repeat_num) {
				fill(palette[(shape_num+v++)%palette.length]);
        rect(0, 0, d * scl, d / 2);
      }
      break;
    case shapes_arr[6]:
      translate(-d / 2, -d / 2);
      rectMode(CORNER);
      for (let scl = 1; scl > 0; scl -= 1 / repeat_num) {
				fill(palette[(shape_num+v++)%palette.length]);
        rect(0, 0, d, (d / 2) * scl);
      }
      break;
    case shapes_arr[7]:
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
    case shapes_arr[8]:
      for (let scl = 1; scl > 0; scl -= 1 / repeat_num) {
				fill(palette[(shape_num+v++)%palette.length]);
        arc(0, 0, d * scl, d * scl, 0, PI, PIE);
        arc(0, -d / 2, d * scl, d * scl, 0, PI, PIE);
      }
      break;
    case shapes_arr[9]:
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
    case shapes_arr[10]:
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
    case shapes_arr[11]:
      for (let scl = 1; scl > 0; scl -= 1 / repeat_num) {
				fill(palette[(shape_num+v++)%palette.length]);
        arc(0, d / 2, d * scl, d * scl, PI, TWO_PI, PIE);
        arc(0, -d / 2, d * scl, d * scl, 0, PI, PIE);
      }
      break;
    case shapes_arr[12]:
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
    case shapes_arr[13]:
      translate(-d / 2, -d / 2);
      for (let scl = 1; scl > 0; scl -= 1 / repeat_num) {
				fill(palette[(shape_num+v++)%palette.length]);
        triangle(0, 0, d * scl, 0, 0, d * scl);
        triangle(d, d, d - scl * d, d, d, d - scl * d);
      }
      break;
    case shapes_arr[14]:
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
    case shapes_arr[15]:
      for (let scl = 1; scl > 0; scl -= 1 / repeat_num) {
				fill(palette[(shape_num+v++)%palette.length]);
        beginShape();
        for (let angle = 0; angle < TWO_PI; angle += TWO_PI / 4) {
          let a = radians(30 * scl);
          let angle_a = angle - a;
          let angle_b = angle + a;
          let x1 = (cos(angle_a) * d) / 2 / cos(a);
          let y1 = (sin(angle_a) * d) / 2 / cos(a);
          let x2 = (cos(angle_b) * d) / 2 / cos(a);
          let y2 = (sin(angle_b) * d) / 2 / cos(a);
          let x3 = ((cos(angle + PI / 4) * d) / 2 / 1.2) * scl;
          let y3 = ((sin(angle + PI / 4) * d) / 2 / 1) * scl;
          vertex(x1, y1);
          vertex(x2, y2);
          vertex(x3, y3);
        }
        endShape(CLOSE);
      }
      break;
    case shapes_arr[16]:
      for (let scl = 1; scl > 0; scl -= 1 / repeat_num) {
				fill(palette[(shape_num+v++)%palette.length]);
        beginShape();
        vertex(0, 0);
        let i = 0;
        for (let angle = 0; angle <= (TWO_PI * 3) / 4; angle += PI / 4) {
          let r = i++ % 2 == 0 ? d / 2 : (sqrt(2) * d) / 2;
          r *= scl;
          vertex(cos(angle) * r, sin(angle) * r);
        }
        endShape(CLOSE);
      }
      break;
    case shapes_arr[17]:
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
    case shapes_arr[18]:
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
    case shapes_arr[19]:
      push();
      translate(-d / 2 / 2, -d / 2 / 2);
      drawShape(d / 2, repeat_num, shapes_arr[0]);
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
    case shapes_arr[20]:
      push();
      translate(-d / 2 / 2, -d / 2 / 2);
      drawShape(d / 2, repeat_num, shapes_arr[1]);
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
    case shapes_arr[21]:
      push();
      translate(-d / 2 / 2, -d / 2 / 2);
      drawShape(d / 2, repeat_num, shapes_arr[2]);
      pop();
      push();
      translate(+d / 2 / 2, -d / 2 / 2);
      drawShape(d / 2, repeat_num, shapes_arr[2]);
      pop();
      push();
      translate(+d / 2 / 2, +d / 2 / 2);
      drawShape(d / 2, repeat_num, shapes_arr[2]);
      pop();
      push();
      translate(-d / 2 / 2, +d / 2 / 2);
      drawShape(d / 2, repeat_num, shapes_arr[2]);
      pop();
      break;
    case shapes_arr[21]:
      push();
      translate(-d / 2 / 2, -d / 2 / 2);
      drawShape(d / 2, repeat_num, shapes_arr[3]);
      pop();
      push();
      translate(+d / 2 / 2, -d / 2 / 2);
      drawShape(d / 2, repeat_num, shapes_arr[3]);
      pop();
      push();
      translate(+d / 2 / 2, +d / 2 / 2);
      drawShape(d / 2, repeat_num, shapes_arr[3]);
      pop();
      push();
      translate(-d / 2 / 2, +d / 2 / 2);
      drawShape(d / 2, repeat_num, shapes_arr[3]);
      pop();
      break;
    case shapes_arr[22]:
      push();
      translate(-d / 2, -d / 2);
      rectMode(CORNER);
      for (let scl = 1; scl > 0; scl -= 1 / repeat_num) {
				fill(palette[(shape_num+v++)%palette.length]);
        rect(0, 0, (d / 2) * scl, d);
      }
      pop();
      break;
    case shapes_arr[23]:
      push();
      translate(-d / 2, -d / 2);
      let p = createVector(0, 0);
      let p1 = createVector(d, 0);
      let p2 = createVector(d, d);
      for (let scl = 1; scl > 0; scl -= 1 / repeat_num) {
        let ap = p5.Vector.lerp(p, p1, scl);
        let bp = p5.Vector.lerp(p, p2, scl);
				fill(palette[(shape_num+v++)%palette.length]);
        triangle(p.x, p.y, ap.x, ap.y, bp.x, bp.y);
      }
      pop();
      break;
  }
  pop();
}
