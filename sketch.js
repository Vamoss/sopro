/******************
Code by Vamoss
Original code link:
https://openprocessing.org/sketch/1623262

Author links:
http://vamoss.com.br
http://twitter.com/vamoss
http://github.com/vamoss
******************/
// noprotect

var imgs = [];
var programs = [];
var graphProgram;
var music, reverb;
var debug;

function preload() {
	imgs.push(loadImage("images/01.jpg"));
	/*imgs.push(loadImage("images/02.jpg"));
	imgs.push(loadImage("images/03.jpg"));
	imgs.push(loadImage("images/04.jpg"));
	imgs.push(loadImage("images/05.jpg"));
	imgs.push(loadImage("images/06.jpg"));
	imgs.push(loadImage("images/07.jpg"));
	imgs.push(loadImage("images/08.jpg"));
	imgs.push(loadImage("images/09.jpg"));
	imgs.push(loadImage("images/10.jpg"));*/

	music = loadSound("sound/FAZEND_0109.mp3");
}

function touchStarted() {
	getAudioContext().resume();
}

function setup() {
	renderer = createCanvas(720, 720, WEBGL);
	
	music.loop();
	getAudioContext().resume();
	reverb = new p5.Reverb();
	music.disconnect(); // so we'll only hear reverb...

	// connect soundFile to reverb, process w/
	// 20 second reverbTime, decayRate of 0.001%
	reverb.process(music, 20, 0.001);
	reverb.amp(4); // turn it up!

	var graph = generatePatternColors();
	graphProgram = new ShaderProgram(graph, drawingContext, renderer);
	
	imgs.forEach((img, index) => {
		//console.log((index+1) + "/" + imgs.length);
		programs.push(new ShaderProgram(img, drawingContext, renderer));
		programs.push(graphProgram);
	});

	debug = document.getElementById("debug");
	debug.innerText = "";	
	
	const DURATION = 12000;
	var tl = anime.timeline({
		easing: 'easeInOutExpo',
		duration: DURATION,
		loop: true,
	});	
	programs.forEach((program, i) => {
		tl.add({
			targets: program,
			zScale: 1,
			size: 1,
			endDelay: 1000,
		}, '-='+DURATION)
		tl.add({
			targets: program,
			zScale: 0,
			size: 0,
			complete: _ => onComplete(i),
		})
		if(i == programs.length-1){
			tl.add({
				targets: programs[0],
				zScale: 1,
				size: 1,
			}, '-='+DURATION)
		}
	});
}

function draw() {
	background(0);
	blendMode(LIGHTEST);
	orbitControl();

	var maxZScale = 0;
	programs.forEach((program, i) => {
		program.draw();
		maxZScale = max(maxZScale, program.zScale);
		//DEBUG
		//circle(program.zScale * (width-80) + 40 - width/2, i * 40 + 40 - height/2, program.size*10+10);
	});
	
	maxZScale = (maxZScale-0.5)*2;
	reverb.drywet(1-maxZScale);// 1 = all reverb, 0 = no reverb

	if(updater){
		updater.next();
	}
}

function generatePatternColors(){
	const ZOOM = 10;
	const DIM = random([4, 8, 16])*10/ZOOM;	
	const colors = [color("#FFFFFF"), color("#FF0000"), color("#FFFF00"), color("#D75701"), color("#9E2402"), color("#423119"),color("#006B6B"), color("#22E6F6")];
		
	var pattern = createGraphics(DIM, DIM);
	pattern.background(0);
	//pattern.rect(1, 1, DIM-2, DIM-2);
	//*
	pattern.translate(DIM/2, DIM/2);
	pattern.rotate(HALF_PI/2);
	pattern.translate(-DIM/2, -DIM/2);
	pattern.noFill();
	for(var i = 0; i < 40; i++){
		var x = floor(random(DIM));
		var y = floor(random(DIM));
		var layers = floor(random(4, 10));
		for(var j = 1; j < layers; j++){
			pattern.stroke(random(colors));
			pattern.rect(x-j, y-j, j*2, j*2);
		}
	}
	/**/
	
	var simetry = createGraphics(DIM*2, DIM*2);
	simetry.image(pattern, 0, 0, DIM, DIM);
	simetry.push();
		simetry.scale(-1, 1);
		//simetry.tint(255, 0, 0);
		simetry.image(pattern, -DIM*2, 0, DIM, DIM);
	simetry.pop();
	simetry.push();
		simetry.scale(1, -1);
		//simetry.tint(0, 255, 0);
		simetry.image(pattern, 0, -DIM*2, DIM, DIM);
	simetry.pop();
	simetry.push();
		simetry.scale(-1, -1);
		//simetry.tint(0, 0, 255);
		simetry.image(pattern, -DIM*2, -DIM*2, DIM, DIM);
	simetry.pop();
	simetry.loadPixels();
	
	var graph = createGraphics(width, height);
	graph.noStroke();
	for(var yy = 0; yy < simetry.height; yy++){
		for(var xx = 0; xx < simetry.width; xx++){
			const c = simetry.get(xx, yy);
			graph.fill(c);
			for(var xxx = 0; xxx < width / simetry.width / ZOOM; xxx++){
				for(var yyy = 0; yyy < height / simetry.height / ZOOM; yyy++){
					graph.circle(
						xx*ZOOM + xxx*simetry.width*ZOOM + ZOOM/2,
						yy*ZOOM + yyy*simetry.height*ZOOM + ZOOM/2,
					ZOOM-2);
				}	
			}
		}
	}

	return graph;
}

var updater;
function* updatePatternColors(){
	var graph = generatePatternColors();
	for (var y = 0, i = 0; y < graph.height; y++) {
		for (var x = 0; x < graph.width; x++) {
			const c = graph.get(x, y);
			graphProgram.colors[i*3+0] = c[0]/255;
			graphProgram.colors[i*3+1] = c[1]/255;
			graphProgram.colors[i*3+2] = c[2]/255;
			i++;
			if(i%3000==0){
				yield;
			}
		}
	}
	yield;
	drawingContext.bindBuffer(drawingContext.ARRAY_BUFFER, graphProgram.program.colorBuffer);
	drawingContext.bufferData(drawingContext.ARRAY_BUFFER, new Float32Array(graphProgram.colors), drawingContext.STATIC_DRAW);	
}

function onComplete(index){
	if(index % 2 == 1){
		updater = updatePatternColors();
	}
}

class ShaderProgram {
	
	constructor(img, ctx, renderer) {
		this.renderer = renderer;
		this.ctx = ctx;
		
		this.vertices = [];
		this.colors = [];
		
		this.zScale = 0;
		this.size = 0;
		
		//convert image to buffer data
		const pointScale = 1;
		const xAdd = -img.width/2;
		const yAdd = -img.height/2;
		const zAdd = 0;
		for (var y = 0, i = 0; y < img.height; y++) {
			for (var x = 0; x < img.width; x++) {
				const c = img.get(x, y);
				const z = random(-1000, 1000);
				this.vertices.push(x * pointScale + xAdd);
				this.vertices.push(y * pointScale + yAdd);
				this.vertices.push(z * pointScale + zAdd);

				this.colors.push(c[0]/255);
				this.colors.push(c[1]/255);
				this.colors.push(c[2]/255);
			}
		}
		//console.log("data loaded: " + (this.vertices.length/3) + " points");
		
		const vert = `
		attribute vec3 aPosition;
		attribute vec3 aColor;
		uniform float uTime;
		uniform float uZScale;
		uniform float uSize;

		// matrices
		uniform mat4 uModelViewMatrix;
		uniform mat4 uProjectionMatrix;

		varying vec4 color;
		
		//Perlin noise function from: 
		//https://www.shadertoy.com/view/wslGWs
		
		//2D signed hash function:
		vec2 Hash2(vec2 P)
		{
			return 1.-2.*fract(cos(P.x*vec2(91.52,-74.27)+P.y*vec2(-39.07,09.78))*939.24);
		}
		//2D Perlin gradient noise.
		float Perlin(vec2 P)
		{
			vec2 F = floor(P);
			vec2 S = P-F;
			//Bi-quintic interpolation for mixing the cells.
			vec4 M = (S*S*S*(6.*S*S-15.*S+10.)).xyxy;
			M = M*vec4(-1,-1,1,1)+vec4(1,1,0,0);

			//Add up the gradients.
			return (dot(Hash2(F+vec2(0,0)),S-vec2(0,0))*M.x+dot(Hash2(F+vec2(1,0)),S-vec2(1,0))*M.z)*M.y+
					 (dot(Hash2(F+vec2(0,1)),S-vec2(0,1))*M.x+dot(Hash2(F+vec2(1,1)),S-vec2(1,1))*M.z)*M.w+.5;
		}

		void main() {
			vec3 pos = aPosition;
			
			//Coordinates for the noise.
			vec2 P = pos.xy * 0.2 + uTime * 100.0;

			//Fractal Perlin noise.
		 	float N = .4*Perlin(P/64.)+.3*Perlin(P/32.)+.2*Perlin(P/16.)+.1*Perlin(P/8.);
			pos.x += (1.0-uSize)*(N*10000.0-5000.0);
			pos.z *= N*100.0;// * 1000. * sign(pos.z);
			
			pos.z *= (1.0005-uZScale);
			
			gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(pos, 1.0);
			gl_PointSize = uSize;
			color = vec4(aColor, 1.0);
			color.rgb *= uSize;
		}
		`

		const frag = `
		#ifdef GL_ES
		precision highp float;
		#endif

		varying vec4 color;

		void main() {
			gl_FragColor = color;
		}
		`

		//load shader
		var vs = this.ctx.createShader(this.ctx.VERTEX_SHADER);
		this.ctx.shaderSource(vs, vert);
		this.ctx.compileShader(vs);

		var fs = this.ctx.createShader(this.ctx.FRAGMENT_SHADER);
		this.ctx.shaderSource(fs, frag);
		this.ctx.compileShader(fs);

		//create shader
		this.program = this.ctx.createProgram();
		this.ctx.attachShader(this.program, vs);
		this.ctx.attachShader(this.program, fs);
		this.ctx.linkProgram(this.program);

		//validate shader
		if (!this.ctx.getShaderParameter(vs, this.ctx.COMPILE_STATUS))
			console.log(this.ctx.getShaderInfoLog(vs));

		if (!this.ctx.getShaderParameter(fs, this.ctx.COMPILE_STATUS))
			console.log(this.ctx.getShaderInfoLog(fs));

		if (!this.ctx.getProgramParameter(this.program, this.ctx.LINK_STATUS))
			console.log(this.ctx.getProgramInfoLog(this.program));

		//use shader
		this.ctx.useProgram(this.program);

		//create uniform pointers
		this.program.uModelViewMatrix = this.ctx.getUniformLocation(this.program, "uModelViewMatrix");
		this.program.uProjectionMatrix = this.ctx.getUniformLocation(this.program, "uProjectionMatrix");
		this.program.uTime = this.ctx.getUniformLocation(this.program, "uTime");
		this.program.uZScale = this.ctx.getUniformLocation(this.program, "uZScale");
		this.program.uSize = this.ctx.getUniformLocation(this.program, "uSize");

		//enable attributes
		this.program.aPosition = this.ctx.getAttribLocation(this.program, "aPosition");
		this.ctx.enableVertexAttribArray(this.program.aPosition);

		this.program.aColor = this.ctx.getAttribLocation(this.program, "aColor");
		this.ctx.enableVertexAttribArray(this.program.aColor);
		
		//create buffers
		this.program.positionBuffer = this.ctx.createBuffer();
		this.ctx.bindBuffer(this.ctx.ARRAY_BUFFER, this.program.positionBuffer);
		this.ctx.bufferData(this.ctx.ARRAY_BUFFER, new Float32Array(this.vertices), this.ctx.STATIC_DRAW);

		this.program.colorBuffer = this.ctx.createBuffer();
		this.ctx.bindBuffer(this.ctx.ARRAY_BUFFER, this.program.colorBuffer);
		this.ctx.bufferData(this.ctx.ARRAY_BUFFER, new Float32Array(this.colors), this.ctx.STATIC_DRAW);	
	}
	
	draw(){
		if(this.vertices.length == 0 || this.zScale < 0.001) return;
	
		this.ctx.useProgram(this.program);

		this.ctx.bindBuffer(this.ctx.ARRAY_BUFFER, this.program.positionBuffer);
		this.ctx.vertexAttribPointer(this.program.aPosition, 3, this.ctx.FLOAT, false, 0, 0);

		this.ctx.bindBuffer(this.ctx.ARRAY_BUFFER, this.program.colorBuffer);
		this.ctx.vertexAttribPointer(this.program.aColor, 3, this.ctx.FLOAT, false, 0, 0);

		this.ctx.uniformMatrix4fv(this.program.uModelViewMatrix, false, this.renderer.uMVMatrix.mat4);
		this.ctx.uniformMatrix4fv(this.program.uProjectionMatrix, false, this.renderer.uPMatrix.mat4);

		this.ctx.uniform1f(this.program.uTime, frameCount/100);
		this.ctx.uniform1f(this.program.uZScale, this.zScale);
		this.ctx.uniform1f(this.program.uSize, this.size);

		this.ctx.drawArrays(this.ctx.POINTS, 0, this.vertices.length/3);
	}
}